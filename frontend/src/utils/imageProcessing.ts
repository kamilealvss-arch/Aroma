/**
 * Utilitário de Processamento de Imagens do Sistema Aroma
 * - Validação de formato (PNG, JPG, WebP) e tamanho
 * - Remoção real de fundo por IA (@imgly/background-removal) com fallback de segmentação por visão computacional (Flood-Fill + CCL + Alpha Feathering)
 * - Limpeza automática de resíduos e ilhas desconectadas (Connected Component Filtering)
 * - Auto-detecção de caixa delimitadora (Bounding Box) do produto para centralização e recorte
 * - Exportação com preservação de transparência (PNG / WebP)
 */

export type ExportImageFormat = 'image/png' | 'image/webp';
export type CropAspectRatio = '1:1' | '4:3' | '16:9';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ImageTransformOptions {
  zoom: number; // 0.5 a 2.5 (1 = 100%)
  offsetX: number; // -50 a +50 (% da largura)
  offsetY: number; // -50 a +50 (% da altura)
  cropMargin: number; // 0 a 25 (% de recorte das bordas da imagem original)
  aspectRatio: CropAspectRatio;
  exportFormat: ExportImageFormat;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Valida o arquivo de imagem enviado pelo usuário
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const validExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);

  if (!ALLOWED_MIME_TYPES.includes(mime) && !validExt) {
    return {
      valid: false,
      error: 'Formato de arquivo não suportado. Envie uma imagem em PNG, JPG ou WebP.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `A imagem selecionada possui ${sizeMB}MB e excede o limite máximo de 10MB.`,
    };
  }

  return { valid: true };
}

/**
 * Carrega uma URL ou DataURL em um elemento HTMLImageElement com suporte a CORS
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          'Não foi possível carregar a imagem. Verifique se o endereço é válido ou envie o arquivo diretamente do seu dispositivo.'
        )
      );
    img.src = src;
  });
}

/**
 * Converte qualquer imagem (URL ou DataURL) para um Blob PNG limpo para processamento
 */
async function imageSourceToBlob(src: string): Promise<Blob> {
  const img = await loadImageElement(src);
  const maxDim = 1024;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexto 2D indisponível no navegador.');

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao converter imagem para processamento.'));
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Converte Blob para DataURL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler dados da imagem processada.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Remove resíduos isolados (ilhas de pixels desconectadas do objeto principal)
 * usando rotulagem de componentes conectados (Connected Components Labeling).
 */
function filterIsolatedIslandsInPlace(data: Uint8ClampedArray, w: number, h: number, minRelativeSize = 0.12) {
  const total = w * h;
  const labels = new Int32Array(total);
  const queue = new Int32Array(total);
  const compSizes: number[] = [0]; // índice 0 = fundo
  const compCenterDist: number[] = [Infinity];

  const centerX = w / 2;
  const centerY = h / 2;
  let currentLabel = 0;

  for (let i = 0; i < total; i++) {
    if (labels[i] !== 0 || data[i * 4 + 3] <= 30) continue;

    currentLabel++;
    let qHead = 0;
    let qTail = 0;
    queue[qTail++] = i;
    labels[i] = currentLabel;

    let size = 0;
    let sumX = 0;
    let sumY = 0;

    while (qHead < qTail) {
      const idx = queue[qHead++];
      size++;
      const x = idx % w;
      const y = (idx - x) / w;
      sumX += x;
      sumY += y;

      // 8-conectividade para agrupar corretamente o produto principal
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const nIdx = ny * w + nx;
          if (labels[nIdx] === 0 && data[nIdx * 4 + 3] > 30) {
            labels[nIdx] = currentLabel;
            queue[qTail++] = nIdx;
          }
        }
      }
    }

    compSizes[currentLabel] = size;
    const avgX = sumX / size;
    const avgY = sumY / size;
    compCenterDist[currentLabel] = Math.hypot(avgX - centerX, avgY - centerY);
  }

  if (currentLabel <= 1) return;

  // Encontra o maior componente principal
  let maxCompSize = 0;
  for (let c = 1; c <= currentLabel; c++) {
    if (compSizes[c] > maxCompSize) {
      maxCompSize = compSizes[c];
    }
  }

  const thresholdSize = Math.max(40, Math.round(maxCompSize * minRelativeSize));

  // Zera o canal alfa de componentes pequenos/isolados (manchas de mármore, sombras soltas, ruídos)
  for (let i = 0; i < total; i++) {
    const lbl = labels[i];
    if (lbl > 0 && compSizes[lbl] < thresholdSize) {
      data[i * 4 + 3] = 0;
    }
  }
}

/**
 * Limpa resíduos desconectados e suaviza contornos de uma imagem transparente existente
 */
export async function cleanIsolatedFragments(
  imageSrc: string,
  minRelativeSize = 0.15
): Promise<string> {
  const img = await loadImageElement(imageSrc);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return imageSrc;

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // 1. Erosão leve de pixels quase transparentes nas bordas
  const alphaCopy = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    alphaCopy[i] = data[i * 4 + 3];
  }

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (alphaCopy[idx] === 0) continue;
      let transparentNeighbors = 0;
      if (alphaCopy[idx - 1] < 25) transparentNeighbors++;
      if (alphaCopy[idx + 1] < 25) transparentNeighbors++;
      if (alphaCopy[idx - w] < 25) transparentNeighbors++;
      if (alphaCopy[idx + w] < 25) transparentNeighbors++;

      if (transparentNeighbors >= 3) {
        data[idx * 4 + 3] = 0;
      } else if (transparentNeighbors === 2) {
        data[idx * 4 + 3] = Math.round(data[idx * 4 + 3] * 0.5);
      }
    }
  }

  // 2. Filtra ilhas desconectadas do produto principal
  filterIsolatedIslandsInPlace(data, w, h, minRelativeSize);

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Segmentação inteligente por Visão Computacional (Edge-Aware Flood-Fill + CCL + Alpha Matting)
 * Usada caso o motor WASM/ONNX encontre restrição de rede/CORS no navegador.
 */
async function removeBackgroundComputerVision(
  src: string,
  onProgress?: (status: string, percent: number) => void
): Promise<string> {
  onProgress?.('Analisando bordas e cores de fundo...', 35);
  const img = await loadImageElement(src);

  const maxDim = 900;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    const ratio = maxDim / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Não foi possível inicializar o processador gráfico.');

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // 1. Amostragem das cores de borda (cantos e faixa periférica externa)
  const borderSamples: Array<[number, number, number]> = [];
  const stepX = Math.max(1, Math.floor(w / 28));
  const stepY = Math.max(1, Math.floor(h / 28));
  const insetX = Math.max(2, Math.floor(w * 0.04));
  const insetY = Math.max(2, Math.floor(h * 0.04));

  for (let x = 0; x < w; x += stepX) {
    const topIdx = x * 4;
    const topInIdx = (insetY * w + x) * 4;
    const botIdx = ((h - 1) * w + x) * 4;
    const botInIdx = ((h - 1 - insetY) * w + x) * 4;
    borderSamples.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
    borderSamples.push([data[topInIdx], data[topInIdx + 1], data[topInIdx + 2]]);
    borderSamples.push([data[botIdx], data[botIdx + 1], data[botIdx + 2]]);
    borderSamples.push([data[botInIdx], data[botInIdx + 1], data[botInIdx + 2]]);
  }
  for (let y = 0; y < h; y += stepY) {
    const leftIdx = y * w * 4;
    const leftInIdx = (y * w + insetX) * 4;
    const rightIdx = (y * w + (w - 1)) * 4;
    const rightInIdx = (y * w + (w - 1 - insetX)) * 4;
    borderSamples.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
    borderSamples.push([data[leftInIdx], data[leftInIdx + 1], data[leftInIdx + 2]]);
    borderSamples.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
    borderSamples.push([data[rightInIdx], data[rightInIdx + 1], data[rightInIdx + 2]]);
  }

  onProgress?.('Segmentando objeto principal...', 65);

  const colorDist = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
    const rmean = (r1 + r2) / 2;
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(
      (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db
    );
  };

  const minSampleDistance = (r: number, g: number, b: number) => {
    let minD = Infinity;
    for (let i = 0; i < borderSamples.length; i++) {
      const [sr, sg, sb] = borderSamples[i];
      const d = colorDist(r, g, b, sr, sg, sb);
      if (d < minD) minD = d;
    }
    return minD;
  };

  // 2. Flood-Fill a partir das bordas respeitando barreiras de gradiente
  const visited = new Uint8Array(w * h);
  const bgMask = new Float32Array(w * h); // 1.0 = fundo, 0.0 = produto
  const queue = new Int32Array(w * h);
  let qHead = 0;
  let qTail = 0;

  const pushSeed = (x: number, y: number) => {
    const idx = y * w + x;
    if (!visited[idx]) {
      visited[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    pushSeed(x, 0);
    pushSeed(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    pushSeed(0, y);
    pushSeed(w - 1, y);
  }

  const baseTolerance = 92;
  const neighborStepTolerance = 44;

  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % w;
    const cy = (curr - cx) / w;
    const cOff = curr * 4;
    const cr = data[cOff];
    const cg = data[cOff + 1];
    const cb = data[cOff + 2];

    const distToBorderPalette = minSampleDistance(cr, cg, cb);
    if (distToBorderPalette > baseTolerance * 1.35) {
      continue;
    }

    bgMask[curr] = 1.0;

    const neighbors = [
      cx > 0 ? curr - 1 : -1,
      cx < w - 1 ? curr + 1 : -1,
      cy > 0 ? curr - w : -1,
      cy < h - 1 ? curr + w : -1,
    ];

    for (let i = 0; i < 4; i++) {
      const nIdx = neighbors[i];
      if (nIdx < 0 || visited[nIdx]) continue;

      const nOff = nIdx * 4;
      const nr = data[nOff];
      const ng = data[nOff + 1];
      const nb = data[nOff + 2];

      const stepD = colorDist(cr, cg, cb, nr, ng, nb);
      const borderD = minSampleDistance(nr, ng, nb);

      if (stepD <= neighborStepTolerance && borderD <= baseTolerance) {
        visited[nIdx] = 1;
        queue[qTail++] = nIdx;
      }
    }
  }

  onProgress?.('Limpando resíduos e suavizando contornos...', 88);

  // 3. Suavização de bordas (Alpha Feathering 3x3) para evitar serrilhado
  const alphaOut = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let sumBg = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          sumBg += bgMask[ny * w + nx];
          count++;
        }
      }
      const avgBg = sumBg / count;
      const fgProb = 1 - avgBg;
      alphaOut[idx] = Math.round(Math.max(0, Math.min(1, fgProb)) * 255);
    }
  }

  for (let i = 0; i < w * h; i++) {
    data[i * 4 + 3] = Math.min(data[i * 4 + 3], alphaOut[i]);
  }

  // 4. Remove manchas e ilhas de fundo desconectadas do produto central (ex: veios de mármore)
  filterIsolatedIslandsInPlace(data, w, h, 0.14);

  ctx.putImageData(imageData, 0, 0);
  onProgress?.('Concluído!', 100);
  return canvas.toDataURL('image/png');
}

/**
 * Remove automaticamente o fundo da imagem usando Inteligência Artificial (@imgly/background-removal)
 * com fallback automático para segmentação computacional caso o modelo remoto esteja inacessível.
 */
export async function removeProductBackgroundAI(
  imageSrc: string,
  onProgress?: (status: string, percent: number) => void
): Promise<string> {
  onProgress?.('Preparando imagem para a IA...', 10);
  const inputBlob = await imageSourceToBlob(imageSrc);

  try {
    const imgly = await import('@imgly/background-removal');
    const removeBgFn = imgly.removeBackground || imgly.default;

    if (typeof removeBgFn === 'function') {
      onProgress?.('Iniciando modelo neural de recorte...', 25);

      const resultBlob = await Promise.race([
        removeBgFn(inputBlob, {
          model: 'isnet_quint8',
          output: {
            format: 'image/png',
            quality: 1,
          },
          progress: (key: string, current: number, total: number) => {
            if (total > 0) {
              const ratio = Math.min(1, current / total);
              const pct = Math.round(25 + ratio * 65);
              const label = key.includes('fetch')
                ? 'Carregando rede neural de segmentação...'
                : 'Removendo fundo com IA...';
              onProgress?.(label, pct);
            }
          },
        }),
        new Promise<Blob>((_, reject) =>
          setTimeout(() => reject(new Error('Tempo limite do modelo WASM atingido')), 28000)
        ),
      ]);

      onProgress?.('Refinando bordas e transparência...', 94);
      const rawDataUrl = await blobToDataUrl(resultBlob);
      const cleanedDataUrl = await cleanIsolatedFragments(rawDataUrl, 0.1);
      onProgress?.('Concluído!', 100);
      return cleanedDataUrl;
    }
  } catch (err) {
    console.warn('Usando motor local de segmentação de bordas e transparência:', err);
  }

  // Fallback real por Visão Computacional caso o CDN WASM esteja bloqueado na rede
  return removeBackgroundComputerVision(imageSrc, onProgress);
}

/**
 * Detecta a caixa delimitadora (Bounding Box) dos pixels não-transparentes do produto
 */
export async function detectProductBoundingBox(imageSrc: string): Promise<BoundingBox | null> {
  try {
    const img = await loadImageElement(imageSrc);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 40) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) return null;

    const boxW = Math.max(1, maxX - minX + 1);
    const boxH = Math.max(1, maxY - minY + 1);

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: boxW,
      height: boxH,
      centerX: minX + boxW / 2,
      centerY: minY + boxH / 2,
    };
  } catch {
    return null;
  }
}

/**
 * Detecta se uma imagem já possui transparência (PNG ou WebP recortado sem fundo)
 */
export async function hasImageTransparency(imageSrc: string): Promise<boolean> {
  try {
    if (!imageSrc || (!imageSrc.startsWith('data:image/png') && !imageSrc.startsWith('data:image/webp'))) {
      return false;
    }
    const img = await loadImageElement(imageSrc);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w <= 0 || h <= 0) return false;

    const sampleW = Math.min(w, 200);
    const sampleH = Math.min(h, 200);
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

    let transparentCount = 0;
    const totalPixels = sampleW * sampleH;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 200) {
        transparentCount++;
        // Se pelo menos 2% dos pixels da amostra forem transparentes, considera recortada
        if (transparentCount > totalPixels * 0.02) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Recorta automaticamente as sobras transparentes ao redor do produto e normaliza
 * em um canvas padrão 640x640 com o produto ocupando proporção uniforme (~82%) exatamente no centro.
 */
export async function autoTrimAndCenterProduct(
  imageSrc: string,
  paddingRatio: number = 0.02
): Promise<string> {
  const img = await loadImageElement(imageSrc);
  const bbox = await detectProductBoundingBox(imageSrc);
  if (!bbox) return imageSrc;

  const STANDARD_SIZE = 640;
  const targetOccupancy = Math.max(0.6, Math.min(0.96, 1 - paddingRatio * 2)); // ~96% da área útil
  const maxProductDim = Math.max(bbox.width, bbox.height, 1);
  const scale = (STANDARD_SIZE * targetOccupancy) / maxProductDim;

  const drawW = Math.round(bbox.width * scale);
  const drawH = Math.round(bbox.height * scale);
  const destX = Math.round((STANDARD_SIZE - drawW) / 2);
  const destY = Math.round((STANDARD_SIZE - drawH) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = STANDARD_SIZE;
  canvas.height = STANDARD_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return imageSrc;

  ctx.clearRect(0, 0, STANDARD_SIZE, STANDARD_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    img,
    bbox.minX,
    bbox.minY,
    bbox.width,
    bbox.height,
    destX,
    destY,
    drawW,
    drawH
  );

  return canvas.toDataURL('image/png');
}

/**
 * Renderiza a imagem final aplicando recorte (crop), escala (zoom), centralização/deslocamento manual (offsetX/Y)
 * e exporta em PNG ou WebP preservando 100% da transparência (canal alfa).
 */
export async function renderEditedProductImage(
  imageSrc: string,
  options: ImageTransformOptions
): Promise<string> {
  const img = await loadImageElement(imageSrc);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // Dimensões do canvas de saída conforme a proporção escolhida
  const outWidth = 640;
  const outHeight =
    options.aspectRatio === '1:1'
      ? 640
      : options.aspectRatio === '4:3'
      ? 480
      : 360;

  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexto 2D indisponível para exportar a imagem.');

  // Preserva transparência total no fundo do canvas
  ctx.clearRect(0, 0, outWidth, outHeight);

  // Aplica recorte (cropMargin) nas bordas da imagem fonte
  const marginRatio = Math.max(0, Math.min(0.35, options.cropMargin / 100));
  const sx = Math.round(srcW * marginRatio);
  const sy = Math.round(srcH * marginRatio);
  const sw = Math.max(1, srcW - sx * 2);
  const sh = Math.max(1, srcH - sy * 2);

  // Calcula escala base para caber de forma centralizada ("contain") no canvas de saída
  const baseScale = Math.min(outWidth / sw, outHeight / sh);
  const finalScale = baseScale * options.zoom;

  const drawW = sw * finalScale;
  const drawH = sh * finalScale;

  // Centraliza + soma deslocamento manual proporcional
  const dx = (outWidth - drawW) / 2 + (options.offsetX / 100) * outWidth;
  const dy = (outHeight - drawH) / 2 + (options.offsetY / 100) * outHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, drawW, drawH);

  return canvas.toDataURL(options.exportFormat, 0.95);
}
