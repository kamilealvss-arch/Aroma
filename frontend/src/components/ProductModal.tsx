import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Plus,
  Check,
  Wand2,
  Crop,
  Undo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Move,
  Sparkles,
  Eraser,
  Paintbrush,
  Coffee,
  Trash2,
} from 'lucide-react';
import { Product, ProductCategory, ProductSizeOption, ProductAddon } from '../../../shared/types/index.ts';
import { formatCurrencyBRL } from '../../../shared/logic/cafeRules.ts';
import {
  validateImageFile,
  removeProductBackgroundAI,
  autoTrimAndCenterProduct,
  cleanIsolatedFragments,
  renderEditedProductImage,
  loadImageElement,
  hasImageTransparency,
  CropAspectRatio,
  ExportImageFormat,
} from '../utils/imageProcessing.ts';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Product>) => Promise<void>;
  productToEdit?: Product | null;
  categories?: string[];
  onCreateCategory?: (newCategory: string) => void;
}

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  'Cafés Especiais',
  'Bebidas Geladas',
  'Doces & Bolos',
  'Salgados Artesanais',
  'Combos & Brunch',
];

export const PRESET_ADDON_SUGGESTIONS: Array<{ name: string; price: number }> = [
  { name: 'Chantilly Artesanal', price: 3.0 },
  { name: 'Calda de Caramelo Salgado', price: 2.5 },
  { name: 'Shot Extra de Espresso', price: 4.0 },
  { name: 'Leite Sem Lactose / Vegetal', price: 3.5 },
  { name: 'Canela em Pó & Cacau', price: 0.0 },
  { name: 'Gotas de Chocolate Belga', price: 3.0 },
  { name: 'Aquecer no Forno / Tostado', price: 0.0 },
  { name: 'Geléia Artesanal', price: 3.5 },
  { name: 'Requeijão Cremoso Extra', price: 3.5 },
  { name: 'Parmesão Ralado Maçaricado', price: 4.0 },
  { name: 'Bacon Crocante', price: 4.5 },
  { name: 'Cobertura Extra de Brigadeiro', price: 4.0 },
];

const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80';

interface EditorSnapshot {
  workingImageUrl: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  cropMargin: number;
  aspectRatio: CropAspectRatio;
  hasRemovedBg: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  categories = DEFAULT_CATEGORIES,
  onCreateCategory,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('12.00');
  const [costPrice, setCostPrice] = useState('4.00');
  const [category, setCategory] = useState<ProductCategory>('Cafés Especiais');
  const [stockQuantity, setStockQuantity] = useState('50');
  const [minStockThreshold, setMinStockThreshold] = useState('5');
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE_URL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para criação de nova categoria diretamente no modal
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ================= ESTADO DE OPÇÃO DE TAMANHOS (CAFÉS & BEBIDAS) =================
  const [hasSizes, setHasSizes] = useState<boolean>(false);
  const [sizes, setSizes] = useState<ProductSizeOption[]>([
    { name: 'P (150ml)', price: 8.00 },
    { name: 'M (300ml)', price: 12.00 },
    { name: 'G (450ml)', price: 16.00 },
  ]);

  // ================= ESTADO DE ADICIONAIS & COMPLEMENTOS =================
  const [hasAddons, setHasAddons] = useState<boolean>(false);
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [newAddonName, setNewAddonName] = useState<string>('');
  const [newAddonPrice, setNewAddonPrice] = useState<string>('');

  const handleAddCustomAddon = () => {
    const trimmed = newAddonName.trim();
    if (!trimmed) return;
    const priceNum = parseFloat(newAddonPrice) || 0;
    setAddons((prev) => [
      ...prev,
      {
        id: `addon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        price: priceNum,
      },
    ]);
    setNewAddonName('');
    setNewAddonPrice('');
  };

  // ================= ESTADOS DO ESTÚDIO DE EDIÇÃO DE IMAGEM & IA =================
  const [originalImageUrl, setOriginalImageUrl] = useState<string>(DEFAULT_IMAGE_URL);
  const [workingImageUrl, setWorkingImageUrl] = useState<string>(DEFAULT_IMAGE_URL);
  const [cutoutImageUrl, setCutoutImageUrl] = useState<string>('');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [hasRemovedBg, setHasRemovedBg] = useState<boolean>(false);
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [bgProgressText, setBgProgressText] = useState<string>('');
  const [bgProgressPercent, setBgProgressPercent] = useState<number>(0);
  const [imageActionNotice, setImageActionNotice] = useState<string | null>(null);

  // Ferramenta ativa na pré-visualização: 'move' (arrastar), 'erase' (borracha) ou 'restore' (adicionar/restaurar)
  const [interactionMode, setInteractionMode] = useState<'move' | 'erase' | 'restore'>('move');
  const [brushSize, setBrushSize] = useState<number>(24); // diâmetro visual em px na prévia
  const [softBrush, setSoftBrush] = useState<boolean>(true);
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Controles de Recorte, Redimensionamento e Centralização
  const [zoom, setZoom] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [cropMargin, setCropMargin] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>('1:1');
  const [exportFormat, setExportFormat] = useState<ExportImageFormat>('image/png');
  const [previewBackdrop, setPreviewBackdrop] = useState<'checker' | 'white' | 'cream'>('checker');

  // Histórico para Desfazer Alterações
  const [history, setHistory] = useState<EditorSnapshot[]>([]);

  // Referências de arraste e canvas interativo do pincel
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isBrushing, setIsBrushing] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(
    null
  );
  const lastBrushPointRef = useRef<{ x: number; y: number } | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const skipNextCanvasReloadRef = useRef<boolean>(false);

  // Mantém a imagem original carregada para permitir que o usuário pinte para Adicionar/Restaurar partes cortadas
  useEffect(() => {
    const src = originalImageUrl || imageUrl;
    if (!src) return;
    let active = true;
    loadImageElement(src)
      .then((img) => {
        if (active) sourceImageRef.current = img;
      })
      .catch(() => {
        if (active) sourceImageRef.current = null;
      });
    return () => {
      active = false;
    };
  }, [originalImageUrl, imageUrl]);

  // Garante que todas as categorias (padrão + existentes + atual) apareçam no select
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories, ...(category ? [category] : [])])
  );

  useEffect(() => {
    const initialImg = productToEdit ? productToEdit.imageUrl : DEFAULT_IMAGE_URL;
    const initialCutout = productToEdit?.cutoutImageUrl || '';
    if (productToEdit) {
      setName(productToEdit.name);
      setDescription(productToEdit.description);
      setPrice(productToEdit.price.toString());
      setCostPrice(productToEdit.costPrice.toString());
      setCategory(productToEdit.category);
      setStockQuantity(productToEdit.stockQuantity.toString());
      setMinStockThreshold(productToEdit.minStockThreshold.toString());
      setImageUrl(initialImg);
      setHasSizes(!!productToEdit.hasSizes);
      setSizes(
        productToEdit.sizes && productToEdit.sizes.length > 0
          ? productToEdit.sizes
          : [
              { name: 'P (150ml)', price: productToEdit.price },
              { name: 'M (300ml)', price: Number((productToEdit.price * 1.3).toFixed(2)) },
              { name: 'G (450ml)', price: Number((productToEdit.price * 1.6).toFixed(2)) },
            ]
      );
      setHasAddons(!!productToEdit.hasAddons || (!!productToEdit.addons && productToEdit.addons.length > 0));
      setAddons(productToEdit.addons && productToEdit.addons.length > 0 ? productToEdit.addons : []);
    } else {
      setName('');
      setDescription('');
      setPrice('12.00');
      setCostPrice('4.00');
      setCategory(categories[0] || 'Cafés Especiais');
      setStockQuantity('50');
      setMinStockThreshold('5');
      setImageUrl(initialImg);
      setHasSizes(false);
      setSizes([
        { name: 'P (150ml)', price: 8.00 },
        { name: 'M (300ml)', price: 12.00 },
        { name: 'G (450ml)', price: 16.00 },
      ]);
      setHasAddons(false);
      setAddons([]);
      setNewAddonName('');
      setNewAddonPrice('');
    }

    setOriginalImageUrl(initialImg);
    setCutoutImageUrl(initialCutout);
    setWorkingImageUrl(initialCutout || initialImg);
    setIsEditorOpen(false);
    setHasRemovedBg(Boolean(initialCutout));
    setIsRemovingBg(false);
    setBgProgressText('');
    setBgProgressPercent(0);
    setInteractionMode('move');
    setBrushSize(24);
    setSoftBrush(true);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setCropMargin(0);
    setAspectRatio('1:1');
    setExportFormat('image/png');
    setHistory([]);
    setImageActionNotice(null);
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setError(null);
  }, [productToEdit, isOpen]);

  // Bloqueia scroll do fundo e fecha com tecla ESC
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditorOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isEditorOpen, onClose]);

  // Sincroniza a imagem de trabalho (workingImageUrl) com o canvas interativo do editor
  useEffect(() => {
    if (!isOpen || !isEditorOpen || !workingImageUrl) return;
    if (skipNextCanvasReloadRef.current) {
      skipNextCanvasReloadRef.current = false;
      return;
    }

    let cancelled = false;
    loadImageElement(workingImageUrl)
      .then((img) => {
        if (cancelled || !editorCanvasRef.current) return;
        const canvas = editorCanvasRef.current;
        const maxDim = 800;
        let w = img.naturalWidth || img.width || 600;
        let h = img.naturalHeight || img.height || 600;
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
      })
      .catch(() => {
        // Caso uma URL externa bloqueie CORS no canvas, exibiremos normalmente
      });

    return () => {
      cancelled = true;
    };
  }, [workingImageUrl, isEditorOpen, isOpen]);

  if (!isOpen) return null;

  const pushToHistory = () => {
    setHistory((prev) => [
      ...prev.slice(-15),
      {
        workingImageUrl,
        zoom,
        offsetX,
        offsetY,
        cropMargin,
        aspectRatio,
        hasRemovedBg,
      },
    ]);
  };

  // Confirma a criação de uma nova categoria no modal
  const handleConfirmNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (onCreateCategory) {
      onCreateCategory(trimmed);
    }
    setCategory(trimmed);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  // 1. Upload da Foto Normal para a Gestão de Produtos (Quadrada)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Arquivo de imagem inválido.');
      e.target.value = '';
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const resultDataUrl = reader.result as string;
      setOriginalImageUrl(resultDataUrl);
      setImageUrl(resultDataUrl);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setCropMargin(0);
      setHistory([]);

      // Detecção inteligente: se o arquivo já tiver transparência (PNG/WebP sem fundo)
      const isAlreadyTransparent = await hasImageTransparency(resultDataUrl);
      if (isAlreadyTransparent) {
        try {
          const trimmed = await autoTrimAndCenterProduct(resultDataUrl, 0.02);
          setCutoutImageUrl(trimmed);
          setWorkingImageUrl(trimmed);
          setHasRemovedBg(true);
          setImageActionNotice(
            'Imagem com fundo transparente detectada! O produto foi recortado e centralizado para o cardápio.'
          );
        } catch {
          setCutoutImageUrl(resultDataUrl);
          setWorkingImageUrl(resultDataUrl);
          setHasRemovedBg(true);
        }
      } else {
        if (!cutoutImageUrl) {
          setWorkingImageUrl(resultDataUrl);
          setImageActionNotice(
            'Foto normal carregada. Agora você pode recortar para o cardápio usando IA ou enviar uma foto sem fundo.'
          );
        } else {
          setImageActionNotice('Foto normal atualizada para os produtos.');
        }
      }
    };
    reader.onerror = () => {
      setError('Falha ao ler o arquivo de imagem enviado.');
    };
    reader.readAsDataURL(file);
  };

  // 2. Upload direto da Foto Recortada sem Fundo para o Cardápio (PNG/WebP transparente)
  const handleCutoutFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Arquivo de imagem inválido.');
      e.target.value = '';
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const resultDataUrl = reader.result as string;
      try {
        const trimmed = await autoTrimAndCenterProduct(resultDataUrl, 0.02);
        setCutoutImageUrl(trimmed);
        setWorkingImageUrl(trimmed);
      } catch {
        setCutoutImageUrl(resultDataUrl);
        setWorkingImageUrl(resultDataUrl);
      }
      setHasRemovedBg(true);
      setImageActionNotice(
        'Foto recortada do cardápio carregada com sucesso! Ela será exibida no cardápio flutuando sobre o prato.'
      );
    };
    reader.onerror = () => {
      setError('Falha ao ler o arquivo de imagem enviado.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearCutout = () => {
    setCutoutImageUrl('');
    setHasRemovedBg(false);
    setWorkingImageUrl(originalImageUrl || imageUrl);
    setImageActionNotice('Recorte do cardápio removido.');
  };

  // Remoção automática de fundo por IA
  const handleRemoveBackground = async () => {
    const sourceImage = originalImageUrl || workingImageUrl || imageUrl;
    if (!sourceImage) {
      setError('Selecione ou informe uma imagem antes de remover o fundo.');
      return;
    }

    setError(null);
    setImageActionNotice(null);
    setIsEditorOpen(true);
    setIsRemovingBg(true);
    setBgProgressText('Iniciando remoção de fundo por IA...');
    setBgProgressPercent(8);

    try {
      pushToHistory();
      const transparentPng = await removeProductBackgroundAI(
        sourceImage,
        (status, percent) => {
          setBgProgressText(status);
          setBgProgressPercent(percent);
        }
      );

      // Recorta sobras transparentes e centraliza automaticamente o produto
      setBgProgressText('Centralizando produto e limpando resíduos...');
      const centeredPng = await autoTrimAndCenterProduct(transparentPng, 0.02);

      setWorkingImageUrl(centeredPng);
      setCutoutImageUrl(centeredPng);
      setHasRemovedBg(true);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setCropMargin(0);
      setPreviewBackdrop('checker');
      setImageActionNotice(
        'Fundo removido com sucesso! A imagem recortada foi salva para o cardápio.'
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Não foi possível remover o fundo desta imagem. Tente enviar o arquivo diretamente do seu computador.'
      );
    } finally {
      setIsRemovingBg(false);
      setBgProgressText('');
      setBgProgressPercent(0);
    }
  };

  // Limpeza rápida de resíduos isolados + centralização
  const handleCleanFragments = async () => {
    if (!workingImageUrl || isRemovingBg) return;
    try {
      pushToHistory();
      const cleaned = await cleanIsolatedFragments(workingImageUrl, 0.18);
      const centered = await autoTrimAndCenterProduct(cleaned, 0.08);
      setWorkingImageUrl(centered);
      setImageUrl(centered);
      setHasRemovedBg(true);
      setImageActionNotice('Resíduos isolados removidos e produto centralizado.');
    } catch {
      setError('Não foi possível limpar resíduos automaticamente nesta imagem.');
    }
  };

  // Centralizar produto automaticamente
  const handleCenterProduct = async () => {
    pushToHistory();
    setOffsetX(0);
    setOffsetY(0);
    if (hasRemovedBg) {
      try {
        const centered = await autoTrimAndCenterProduct(workingImageUrl, 0.08);
        setWorkingImageUrl(centered);
        setImageUrl(centered);
      } catch {
        // mantém workingImageUrl atual
      }
    }
    setImageActionNotice('Produto centralizado no quadro.');
  };

  // Desfazer última alteração no editor (inclusive pinceladas)
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setWorkingImageUrl(previous.workingImageUrl);
    setImageUrl(previous.workingImageUrl);
    setZoom(previous.zoom);
    setOffsetX(previous.offsetX);
    setOffsetY(previous.offsetY);
    setCropMargin(previous.cropMargin);
    setAspectRatio(previous.aspectRatio);
    setHasRemovedBg(previous.hasRemovedBg);
    setHistory((prev) => prev.slice(0, -1));
    setImageActionNotice('Última alteração desfeita.');
  };

  // Manter / Restaurar a imagem original intacta
  const handleRestoreOriginal = () => {
    pushToHistory();
    setWorkingImageUrl(originalImageUrl);
    setImageUrl(originalImageUrl);
    setHasRemovedBg(false);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setCropMargin(0);
    setImageActionNotice('Imagem original restaurada.');
  };

  // Salvar a imagem editada (exporta em PNG ou WebP com transparência e disposição padronizada)
  const handleApplyEditedImage = async (): Promise<string> => {
    try {
      setError(null);
      let sourceToRender = workingImageUrl;
      if (hasRemovedBg && offsetX === 0 && offsetY === 0) {
        try {
          sourceToRender = await autoTrimAndCenterProduct(workingImageUrl, 0.09);
          setWorkingImageUrl(sourceToRender);
        } catch {
          sourceToRender = workingImageUrl;
        }
      }
      const finalDataUrl = await renderEditedProductImage(sourceToRender, {
        zoom,
        offsetX,
        offsetY,
        cropMargin,
        aspectRatio,
        exportFormat,
      });
      setImageUrl(finalDataUrl);
      setIsEditorOpen(false);
      setImageActionNotice(
        `Imagem editada e padronizada em formato ${
          exportFormat === 'image/png' ? 'PNG' : 'WebP'
        } com transparência preservada.`
      );
      return finalDataUrl;
    } catch (err: any) {
      const msg =
        err.message ||
        'Erro ao exportar a imagem editada. Verifique se a imagem permite edição.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // ================= LÓGICA DO PINCEL DE AJUSTE (BORRACHA PARA APAGAR & PINCEL PARA ADICIONAR/RESTAURAR) =================
  const getCanvasPointFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      radius: (brushSize / 2) * ((scaleX + scaleY) / 2),
    };
  };

  // 1. Borracha: Torna pixels transparentes (destination-out)
  const eraseStrokeOnCanvas = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    radius: number
  ) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = radius * 2;

    if (softBrush) {
      ctx.shadowColor = 'rgba(0, 0, 0, 1)';
      ctx.shadowBlur = Math.max(2, radius * 0.35);
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Garante remoção imediata mesmo num clique simples sem movimento
    ctx.beginPath();
    ctx.arc(to.x, to.y, radius * (softBrush ? 0.85 : 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 2. Pincel de Adicionar/Restaurar: Pinta de volta os pixels da foto original
  const restoreStrokeOnCanvas = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    radius: number
  ) => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;

    // Recupera a imagem original da referência ou do elemento DOM
    let sourceImg = sourceImageRef.current;
    if (!sourceImg || !sourceImg.complete || sourceImg.naturalWidth === 0) {
      const domImg = document.querySelector(
        'img[alt="Foto normal quadrada para os produtos"]'
      ) as HTMLImageElement | null;
      if (domImg && domImg.complete && domImg.naturalWidth > 0) {
        sourceImg = domImg;
        sourceImageRef.current = domImg;
      }
    }
    if (!sourceImg) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas.width !== canvas.width || maskCanvas.height !== canvas.height) {
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
    }
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // A. Limpa a máscara do traço
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // B. Desenha o traço do pincel na máscara
    maskCtx.save();
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.lineWidth = radius * 2;
    maskCtx.fillStyle = '#000000';
    maskCtx.strokeStyle = '#000000';

    if (softBrush) {
      maskCtx.shadowColor = '#000000';
      maskCtx.shadowBlur = Math.max(2, radius * 0.35);
    } else {
      maskCtx.shadowBlur = 0;
    }

    maskCtx.beginPath();
    maskCtx.moveTo(from.x, from.y);
    maskCtx.lineTo(to.x, to.y);
    maskCtx.stroke();

    maskCtx.beginPath();
    maskCtx.arc(to.x, to.y, radius * (softBrush ? 0.85 : 1), 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();

    // C. Aplica a foto original restrita à área do traço (source-in)
    maskCtx.save();
    maskCtx.globalCompositeOperation = 'source-in';
    maskCtx.drawImage(sourceImg, 0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.restore();

    // D. Pinta os detalhes recuperados sobre o canvas principal (source-over)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.restore();
  };

  // Eventos de Ponteiro na Pré-visualização (Alterna entre Mover, Apagar e Adicionar/Restaurar)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isRemovingBg) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (interactionMode === 'erase' || interactionMode === 'restore') {
      const pt = getCanvasPointFromEvent(e);
      if (!pt) return;
      pushToHistory();
      setIsBrushing(true);
      lastBrushPointRef.current = { x: pt.x, y: pt.y };
      if (interactionMode === 'erase') {
        eraseStrokeOnCanvas(pt, pt, pt.radius);
      } else {
        restoreStrokeOnCanvas(pt, pt, pt.radius);
      }
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: offsetX,
      startY: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (previewContainerRef.current) {
      const stageRect = previewContainerRef.current.getBoundingClientRect();
      setBrushCursor({
        x: e.clientX - stageRect.left,
        y: e.clientY - stageRect.top,
        visible: true,
      });
    }

    if (interactionMode === 'erase' || interactionMode === 'restore') {
      if (!isBrushing) return;
      const pt = getCanvasPointFromEvent(e);
      if (!pt) return;
      const prev = lastBrushPointRef.current || { x: pt.x, y: pt.y };
      if (interactionMode === 'erase') {
        eraseStrokeOnCanvas(prev, pt, pt.radius);
      } else {
        restoreStrokeOnCanvas(prev, pt, pt.radius);
      }
      lastBrushPointRef.current = { x: pt.x, y: pt.y };
      return;
    }

    if (!isDragging || !dragStartRef.current || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const dxPct = ((e.clientX - dragStartRef.current.x) / Math.max(rect.width, 1)) * 100;
    const dyPct = ((e.clientY - dragStartRef.current.y) / Math.max(rect.height, 1)) * 100;

    setOffsetX(Math.max(-45, Math.min(45, Math.round(dragStartRef.current.startX + dxPct))));
    setOffsetY(Math.max(-45, Math.min(45, Math.round(dragStartRef.current.startY + dyPct))));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isBrushing) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsBrushing(false);
      lastBrushPointRef.current = null;

      if (editorCanvasRef.current) {
        try {
          const updatedDataUrl = editorCanvasRef.current.toDataURL('image/png');
          skipNextCanvasReloadRef.current = true;
          setWorkingImageUrl(updatedDataUrl);
          setCutoutImageUrl(updatedDataUrl);
          setHasRemovedBg(true);
        } catch {
          // ignora erro se o canvas estiver contaminado por CORS externo
        }
      }
      return;
    }

    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handlePointerLeave = () => {
    setBrushCursor((prev) => ({ ...prev, visible: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do produto.');
      return;
    }

    let finalCategory = category;
    if (isCreatingCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim();
      if (onCreateCategory) {
        onCreateCategory(finalCategory);
      }
    }

    if (!finalCategory || !finalCategory.trim()) {
      setError('Por favor, selecione ou crie uma categoria.');
      return;
    }

    const numPrice = parseFloat(price);
    const numCost = parseFloat(costPrice);
    const numStock = parseInt(stockQuantity, 10);
    const numMin = parseInt(minStockThreshold, 10);

    if (isNaN(numPrice) || numPrice <= 0) {
      setError('O preço de venda deve ser maior que zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let finalProductImage = imageUrl || DEFAULT_IMAGE_URL;
      const hasTransformAdjustments =
        isEditorOpen ||
        hasRemovedBg ||
        zoom !== 1 ||
        offsetX !== 0 ||
        offsetY !== 0 ||
        cropMargin !== 0;

      if (hasTransformAdjustments && workingImageUrl) {
        try {
          let sourceToRender = workingImageUrl;
          if (hasRemovedBg && offsetX === 0 && offsetY === 0) {
            try {
              sourceToRender = await autoTrimAndCenterProduct(workingImageUrl, 0.09);
            } catch {
              sourceToRender = workingImageUrl;
            }
          }
          finalProductImage = await renderEditedProductImage(sourceToRender, {
            zoom,
            offsetX,
            offsetY,
            cropMargin,
            aspectRatio,
            exportFormat,
          });
        } catch {
          finalProductImage = workingImageUrl;
        }
      }

      const cleanedSizes = hasSizes
        ? sizes.filter((s) => s.name.trim() && s.price > 0)
        : undefined;

      const cleanedAddons = hasAddons
        ? addons.filter((a) => a.name.trim().length > 0)
        : undefined;

      let rawCutout = cutoutImageUrl || (hasRemovedBg ? (finalProductImage || workingImageUrl) : undefined);
      let normalizedCutout = rawCutout;
      if (rawCutout && (rawCutout.startsWith('data:image/png') || rawCutout.startsWith('data:image/webp'))) {
        try {
          normalizedCutout = await autoTrimAndCenterProduct(rawCutout, 0.02);
        } catch {
          normalizedCutout = rawCutout;
        }
      }

      await onSave({
        name: name.trim(),
        description: description.trim(),
        price: hasSizes && cleanedSizes && cleanedSizes.length > 0 ? cleanedSizes[0].price : numPrice,
        costPrice: isNaN(numCost) ? numPrice * 0.4 : numCost,
        category: finalCategory,
        stockQuantity: isNaN(numStock) ? 0 : numStock,
        minStockThreshold: isNaN(numMin) ? 5 : numMin,
        imageUrl: originalImageUrl || imageUrl,
        cutoutImageUrl: normalizedCutout || undefined,
        hasSizes: hasSizes && cleanedSizes && cleanedSizes.length > 0,
        sizes: cleanedSizes,
        hasAddons: hasAddons && cleanedAddons && cleanedAddons.length > 0,
        addons: cleanedAddons,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedPrice = parseFloat(price) || 0;
  const parsedCost = parseFloat(costPrice) || 0;
  const estimatedProfit = Math.max(0, parsedPrice - parsedCost);
  const estimatedMargin =
    parsedPrice > 0 ? Math.round(((parsedPrice - parsedCost) / parsedPrice) * 100) : 0;

  const isModifiedFromOriginal =
    workingImageUrl !== originalImageUrl ||
    imageUrl !== originalImageUrl ||
    zoom !== 1 ||
    offsetX !== 0 ||
    offsetY !== 0 ||
    cropMargin !== 0;

  // Estilo de fundo quadriculado para evidenciar transparência (PNG/WebP)
  const checkerboardStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(45deg, #e7e5e4 25%, transparent 25%), linear-gradient(-45deg, #e7e5e4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e7e5e4 75%), linear-gradient(-45deg, transparent 75%, #e7e5e4 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
    backgroundColor: '#fafaf9',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#f6efdd] text-[#35312F] overflow-y-auto animate-in fade-in duration-150 flex flex-col bg-aroma-stripes"
      style={{
        backgroundColor: '#f6efdd',
        backgroundImage: "repeating-linear-gradient(to right, #7e8b60 0px, #7e8b60 64px, #f6efdd 64px, #f6efdd 128px)",
      }}
    >
      {/* 1. Cabeçalho Superior que rola naturalmente com o conteúdo (não fixo/estático) */}
      <div className="w-full bg-white/95 backdrop-blur-md border-b border-stone-200/90 px-6 sm:px-10 py-4 flex items-center justify-between shadow-2xs">
        <div>
          <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
            <span>Cardápio</span>
            <span>/</span>
            <span className="text-[#850D2C]">{productToEdit ? 'Editar Produto' : 'Cadastrar Produto'}</span>
          </div>
          <h2
            className="text-2xl sm:text-3xl font-normal text-[#35312F] tracking-tight font-amarego"
            style={{ fontFamily: "'Amarego', 'Abril Fatface', Georgia, serif" }}
          >
            {productToEdit ? 'Editar Produto do Cardápio' : 'Cadastrar Novo Produto'}
          </h2>
          <p className="text-xs text-stone-400">
            {productToEdit
              ? 'Atualize informações, precificação, adicionais, foto ou parâmetros de estoque'
              : 'Adicione um novo item gastronômico ao catálogo digital da cafeteria'}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition cursor-pointer"
          title="Fechar tela inteira (ESC)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Conteúdo Central em Tela Inteira */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 pb-12 flex-1">
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-[#850D2C] rounded-2xl text-xs flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#850D2C]" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-[#850D2C]/70 hover:text-[#850D2C] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-8 space-y-5">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Nome & Categoria (com opção de criar nova categoria) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pão de Queijo Mineiro"
                className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider">
                  Categoria *
                </label>
                {!isCreatingCategory ? (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-[#850D2C] hover:text-[#6e0a24] transition cursor-pointer"
                    title="Criar uma nova categoria de cardápio"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nova categoria</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="text-[11px] font-medium text-stone-400 hover:text-stone-600 transition cursor-pointer"
                  >
                    Selecionar existente
                  </button>
                )}
              </div>

              {!isCreatingCategory ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingCategory(true);
                    } else {
                      setCategory(e.target.value as ProductCategory);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] font-medium focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition cursor-pointer"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__NEW__">+ Criar nova categoria...</option>
                </select>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmNewCategory();
                      }
                    }}
                    placeholder="Ex: Chás & Infusões"
                    className="flex-1 px-3 py-2.5 text-xs border border-[#850D2C] rounded-xl bg-white text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:outline-none transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmNewCategory}
                    disabled={!newCategoryName.trim()}
                    className="h-9 px-3 rounded-xl bg-[#850D2C] hover:bg-[#6e0a24] disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer shrink-0"
                    title="Adicionar categoria"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Criar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
              Descrição no Cardápio
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os ingredientes, notas sensoriais e preparo artesanal..."
              className="w-full px-3.5 py-2 text-xs border border-stone-300 rounded-xl bg-stone-50/50 text-[#35312F] placeholder-stone-400 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none resize-none transition"
            />
          </div>

          {/* Preço de Venda, Preço de Custo e Margem Estimada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Preço de Venda (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-bold text-[#35312F] border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Auditado automaticamente
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Custo Unitário (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-xs font-semibold text-stone-700 border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Base para cálculo de lucro
              </span>
            </div>

            <div className="bg-[#F9F7F3] border border-stone-200/80 rounded-xl px-3.5 py-2 flex flex-col justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                Lucro / Margem Bruta
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-sm font-extrabold text-[#4c543c]">
                  {formatCurrencyBRL(estimatedProfit)}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#858F6D]/15 text-[#4c543c]">
                  {estimatedMargin}%
                </span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5">
                Retorno estimado por un.
              </span>
            </div>
          </div>

          {/* ================= OPÇÃO DE TAMANHOS (CAFÉS & BEBIDAS) ================= */}
          <div className="p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Coffee className="w-4 h-4 text-[#850D2C]" />
                <div>
                  <span className="text-xs font-bold text-[#35312F]">
                    Opções de Tamanho (Cafés e Bebidas)
                  </span>
                  <p className="text-[10px] text-stone-500">
                    Habilite para oferecer variações de volume (ex: P, M, G) com preços específicos
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSizes}
                  onChange={(e) => setHasSizes(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#850D2C]"></div>
              </label>
            </div>

            {hasSizes && (
              <div className="space-y-2 pt-2 border-t border-stone-200/60 animate-in fade-in duration-150">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
                  <div className="col-span-6">Identificação do Tamanho</div>
                  <div className="col-span-4">Preço (R$)</div>
                  <div className="col-span-2 text-right">Ação</div>
                </div>

                {sizes.map((s, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => {
                          const updated = [...sizes];
                          updated[index].name = e.target.value;
                          setSizes(updated);
                        }}
                        placeholder="Ex: P (150ml)"
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none"
                      />
                    </div>
                    <div className="col-span-4 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.10"
                        min="0.10"
                        value={s.price}
                        onChange={(e) => {
                          const updated = [...sizes];
                          const newP = parseFloat(e.target.value) || 0;
                          updated[index].price = newP;
                          setSizes(updated);
                          if (index === 0) setPrice(e.target.value);
                        }}
                        className="w-full pl-7 pr-2 py-1.5 text-xs font-bold border border-stone-300 rounded-xl bg-white focus:ring-1 focus:ring-[#850D2C] focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      {sizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSizes(sizes.filter((_, i) => i !== index))}
                          className="p-1.5 text-stone-400 hover:text-[#850D2C] hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remover tamanho"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSizes((prev) => [
                        ...prev,
                        {
                          name: `Tamanho ${prev.length + 1}`,
                          price: Number(((prev[prev.length - 1]?.price || 10) + 4).toFixed(2)),
                        },
                      ])
                    }
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-[#850D2C] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar outro tamanho</span>
                  </button>
                  <span className="text-[10px] text-stone-400">
                    O cliente poderá escolher o tamanho diretamente no cardápio digital.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ================= OPÇÃO DE ADICIONAIS & COMPLEMENTOS ================= */}
          <div className="p-3.5 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#850D2C]" />
                <div>
                  <span className="text-xs font-bold text-[#35312F]">
                    Opções de Adicionais & Complementos (Comidas e Bebidas)
                  </span>
                  <p className="text-[10px] text-stone-500">
                    Habilite para definir quais adicionais podem acompanhar este item (com preços específicos ou grátis)
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAddons}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasAddons(checked);
                    if (checked && addons.length === 0) {
                      const isBeverage =
                        category === 'Cafés Especiais' ||
                        category === 'Bebidas Geladas' ||
                        name.toLowerCase().includes('café');
                      if (isBeverage) {
                        setAddons([
                          { id: 'add_1', name: 'Chantilly Artesanal', price: 3.0 },
                          { id: 'add_2', name: 'Calda de Caramelo Salgado', price: 2.5 },
                          { id: 'add_3', name: 'Shot Extra de Espresso', price: 4.0 },
                        ]);
                      } else {
                        setAddons([
                          { id: 'add_1', name: 'Aquecer no Forno / Tostado', price: 0.0 },
                          { id: 'add_2', name: 'Geléia Artesanal', price: 3.5 },
                          { id: 'add_3', name: 'Requeijão Cremoso Extra', price: 3.5 },
                        ]);
                      }
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#850D2C]"></div>
              </label>
            </div>

            {hasAddons && (
              <div className="space-y-3 pt-2 border-t border-stone-200/60 animate-in fade-in duration-150">
                {/* Sugestões Rápidas Pré-prontas ("pode ter pre pronto tb") */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Sugestões Rápidas (clique para incluir neste produto):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ADDON_SUGGESTIONS.map((preset) => {
                      const alreadyAdded = addons.some(
                        (a) => a.name.toLowerCase() === preset.name.toLowerCase()
                      );
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            if (!alreadyAdded) {
                              setAddons((prev) => [
                                ...prev,
                                {
                                  id: `addon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                                  name: preset.name,
                                  price: preset.price,
                                },
                              ]);
                            }
                          }}
                          disabled={alreadyAdded}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            alreadyAdded
                              ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-50'
                              : 'bg-white hover:bg-rose-50 text-[#850D2C] border border-[#850D2C]/30 hover:border-[#850D2C]'
                          }`}
                          title={alreadyAdded ? 'Já adicionado a este produto' : 'Adicionar sugestão'}
                        >
                          <span>+ {preset.name}</span>
                          <span className="text-[10px] font-normal opacity-80">
                            ({preset.price > 0 ? `+R$ ${preset.price.toFixed(2)}` : 'Grátis'})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Escrever Novo Adicional Manual ("ele deve poder escrever") */}
                <div className="p-2.5 bg-white rounded-xl border border-stone-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-[#35312F] uppercase tracking-wider block">
                    Escrever Novo Adicional para esta comida/bebida:
                  </span>
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-7">
                      <input
                        type="text"
                        value={newAddonName}
                        onChange={(e) => setNewAddonName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomAddon();
                          }
                        }}
                        placeholder="Ex: Bacon Crocante, Molho Especial, etc."
                        className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none"
                      />
                    </div>
                    <div className="col-span-3 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={newAddonPrice}
                        onChange={(e) => setNewAddonPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomAddon();
                          }
                        }}
                        placeholder="0.00"
                        className="w-full pl-7 pr-2 py-1.5 text-xs font-bold border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white focus:ring-1 focus:ring-[#850D2C] focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={handleAddCustomAddon}
                        disabled={!newAddonName.trim()}
                        className="w-full py-1.5 px-2 bg-[#850D2C] hover:bg-[#6e0a24] text-white rounded-xl text-xs font-bold transition disabled:opacity-40 flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Incluir</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Adicionais Cadastrados */}
                {addons.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider px-1">
                      <div className="col-span-7">Nome do Adicional</div>
                      <div className="col-span-3">Preço (R$)</div>
                      <div className="col-span-2 text-right">Ação</div>
                    </div>

                    {addons.map((a, index) => (
                      <div key={a.id || index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7">
                          <input
                            type="text"
                            value={a.name}
                            onChange={(e) => {
                              const updated = [...addons];
                              updated[index].name = e.target.value;
                              setAddons(updated);
                            }}
                            className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:ring-1 focus:ring-[#850D2C] focus:outline-none"
                          />
                        </div>
                        <div className="col-span-3 relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-semibold">
                            R$
                          </span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={a.price}
                            onChange={(e) => {
                              const updated = [...addons];
                              updated[index].price = parseFloat(e.target.value) || 0;
                              setAddons(updated);
                            }}
                            className="w-full pl-7 pr-2 py-1.5 text-xs font-bold border border-stone-300 rounded-xl bg-white focus:ring-1 focus:ring-[#850D2C] focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          <button
                            type="button"
                            onClick={() => setAddons(addons.filter((_, i) => i !== index))}
                            className="p-1.5 text-stone-400 hover:text-[#850D2C] hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Remover adicional"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Estoque Inicial / Atual & Limite de Estoque Baixo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-[#F9F7F3] rounded-2xl border border-stone-200/80">
            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Estoque Disponível (un.) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold border border-stone-300 rounded-xl bg-white text-[#35312F] focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Se chegar a 0, bloqueia vendas no cardápio
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider mb-1">
                Limite Mínimo de Alerta (un.) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={minStockThreshold}
                onChange={(e) => setMinStockThreshold(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold border border-stone-300 rounded-xl bg-white text-[#35312F] focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Exibe aviso de reposição quando ≤ este limite
              </span>
            </div>
          </div>

          {/* ================= ÁREA DE FOTOGRAFIAS DO PRODUTO (PRODUTOS & CARDÁPIO) ================= */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-[#35312F] uppercase tracking-wider">
                Imagens do Produto (Gestão e Cardápio)
              </label>
              <div className="flex items-center space-x-2">
                {cutoutImageUrl && (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Recorte do cardápio ativo</span>
                  </span>
                )}
                <span className="text-[10px] font-normal text-stone-400">
                  PNG, JPG ou WebP (máx. 10MB)
                </span>
              </div>
            </div>

            {/* Container das duas imagens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              
              {/* 1. FOTO PARA A GESTÃO / PRODUTOS (QUADRADA NORMAL) */}
              <div className="p-3.5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-stone-200 shadow-2xs bg-stone-100 flex items-center justify-center relative shrink-0">
                    {originalImageUrl || imageUrl ? (
                      <img
                        src={originalImageUrl || imageUrl}
                        alt="Foto normal quadrada para os produtos"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-stone-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                      1. Para a Gestão
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 leading-tight">
                      Foto Normal (Quadrada)
                    </h4>
                    <p className="text-[10px] text-stone-400 leading-tight mt-0.5">
                      Exibida na tela interna de produtos.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-stone-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer h-8 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition shadow-2xs">
                      <Upload className="w-3 h-3" />
                      <span>Enviar foto normal</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="url"
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImageUrl(val);
                        setOriginalImageUrl(val);
                        if (!cutoutImageUrl) setWorkingImageUrl(val);
                      }}
                      placeholder="Ou cole URL..."
                      className="flex-1 min-w-[130px] h-8 px-2.5 text-xs border border-stone-300 rounded-xl bg-white text-[#35312F] placeholder-stone-400 focus:ring-1 focus:ring-[#850D2C] focus:border-[#850D2C] focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* 2. FOTO PARA O CARDÁPIO (RECORTADA SEM FUNDO) */}
              <div className="p-3.5 bg-[#fdfcfa] rounded-2xl border-2 border-dashed border-[#850D2C]/40 shadow-2xs flex flex-col justify-between space-y-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-20 h-20 rounded-2xl overflow-hidden border border-stone-200/90 shadow-2xs flex items-center justify-center relative bg-stone-50 shrink-0"
                    style={checkerboardStyle}
                  >
                    {cutoutImageUrl || (hasRemovedBg && workingImageUrl) ? (
                      <img
                        src={cutoutImageUrl || workingImageUrl}
                        alt="Foto recortada para o cardápio"
                        className="w-full h-full object-contain drop-shadow"
                      />
                    ) : (
                      <div className="text-center p-1">
                        <Sparkles className="w-5 h-5 text-amber-500/80 mx-auto mb-0.5" />
                        <span className="text-[9px] text-stone-400 leading-tight block">Sem recorte</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      2. Para o Cardápio
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 leading-tight flex items-center space-x-1">
                      <span>Foto Recortada</span>
                      {cutoutImageUrl || (hasRemovedBg && workingImageUrl) ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                          Ativa ✓
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md">
                          Opcional
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-stone-400 leading-tight mt-0.5">
                      Flutua sobre o prato no cardápio e modal.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-stone-200/60">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Botão de Enviar Foto Recortada Diretamente */}
                    <label className="cursor-pointer h-8 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 transition shadow-2xs">
                      <Upload className="w-3 h-3 text-amber-700" />
                      <span>Enviar PNG sem fundo</span>
                      <input
                        type="file"
                        accept="image/png,image/webp"
                        onChange={handleCutoutFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Botão de Recortar com IA a partir da foto normal */}
                    <button
                      type="button"
                      onClick={handleRemoveBackground}
                      disabled={isRemovingBg || (!originalImageUrl && !imageUrl)}
                      className="h-8 px-2.5 rounded-xl bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-1 shadow-2xs transition cursor-pointer"
                      title="Recortar automaticamente a foto normal usando IA"
                    >
                      {isRemovingBg ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>IA...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3" />
                          <span>Recortar c/ IA</span>
                        </>
                      )}
                    </button>

                    {/* Botão para limpar recorte */}
                    {(cutoutImageUrl || (hasRemovedBg && workingImageUrl)) && (
                      <button
                        type="button"
                        onClick={handleClearCutout}
                        className="h-8 px-2 rounded-xl text-stone-500 hover:text-rose-700 hover:bg-rose-50 text-xs font-medium inline-flex items-center space-x-1 border border-stone-200 transition cursor-pointer"
                        title="Remover recorte do cardápio"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}

                    {/* Botão de Ajustar no Estúdio */}
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen((prev) => !prev)}
                      disabled={isRemovingBg}
                      className={`h-8 px-2 rounded-xl text-xs font-semibold inline-flex items-center space-x-1 border transition cursor-pointer ${
                        isEditorOpen
                          ? 'bg-[#35312F] text-white border-[#35312F]'
                          : 'bg-white hover:bg-stone-100 text-[#35312F] border-stone-300'
                      }`}
                      title="Ajustar recorte, pincel e centralização"
                    >
                      <Crop className="w-3 h-3" />
                      <span>{isEditorOpen ? 'Fechar' : 'Ajustar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso de feedback rápido de edição */}
            {imageActionNotice && !isRemovingBg && (
              <div className="px-3 py-2 rounded-xl bg-[#F9F7F3] border border-stone-200/80 text-[11px] text-stone-600 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-[#4c543c] shrink-0" />
                  <span>{imageActionNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImageActionNotice(null)}
                  className="text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* ================= ESTÚDIO INTERATIVO DE PINCEL, RECORTE, ZOOM E CENTRALIZAÇÃO ================= */}
            {isEditorOpen && (
                <div className="pt-3 border-t border-stone-200/80 space-y-3.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    {/* Coluna Esquerda: Palco de Pré-visualização Interativa (5 cols) */}
                    <div className="md:col-span-5 flex flex-col items-center space-y-2.5">
                      {/* Seletor de Modo: Mover vs Apagar (Borracha) vs Adicionar (Pincel) */}
                      <div className="w-full max-w-[270px] inline-flex rounded-xl bg-stone-200/70 p-0.5 border border-stone-200">
                        <button
                          type="button"
                          onClick={() => setInteractionMode('move')}
                          className={`flex-1 py-1.5 px-1.5 rounded-lg text-[10.5px] font-semibold inline-flex items-center justify-center space-x-1 transition cursor-pointer ${
                            interactionMode === 'move'
                              ? 'bg-white text-[#35312F] shadow-2xs'
                              : 'text-stone-600 hover:text-[#35312F]'
                          }`}
                          title="Arrastar a imagem para posicionar"
                        >
                          <Move className="w-3 h-3 text-[#850D2C]" />
                          <span>Mover</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInteractionMode('erase')}
                          className={`flex-1 py-1.5 px-1.5 rounded-lg text-[10.5px] font-semibold inline-flex items-center justify-center space-x-1 transition cursor-pointer ${
                            interactionMode === 'erase'
                              ? 'bg-[#850D2C] text-white shadow-2xs'
                              : 'text-stone-600 hover:text-[#35312F]'
                          }`}
                          title="Apagar sobras ou fundo da imagem recortada"
                        >
                          <Eraser className="w-3 h-3" />
                          <span>Apagar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInteractionMode('restore')}
                          className={`flex-1 py-1.5 px-1.5 rounded-lg text-[10.5px] font-semibold inline-flex items-center justify-center space-x-1 transition cursor-pointer ${
                            interactionMode === 'restore'
                              ? 'bg-[#4c543c] text-white shadow-2xs'
                              : 'text-stone-600 hover:text-[#35312F]'
                          }`}
                          title="Pintar para adicionar/restaurar partes cortadas da foto original"
                        >
                          <Paintbrush className="w-3 h-3" />
                          <span>Adicionar</span>
                        </button>
                      </div>

                      <div
                        ref={previewContainerRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerLeave}
                        className={`relative w-full max-w-[260px] rounded-2xl overflow-hidden border border-stone-300 shadow-inner select-none flex items-center justify-center touch-none ${
                          interactionMode !== 'move'
                            ? 'cursor-crosshair'
                            : isDragging
                            ? 'cursor-grabbing'
                            : 'cursor-grab'
                        }`}
                        style={{
                          aspectRatio:
                            aspectRatio === '1:1'
                              ? '1 / 1'
                              : aspectRatio === '4:3'
                              ? '4 / 3'
                              : '16 / 9',
                          ...(previewBackdrop === 'checker'
                            ? checkerboardStyle
                            : previewBackdrop === 'white'
                            ? { backgroundColor: '#ffffff' }
                            : { backgroundColor: '#F9F7F3' }),
                        }}
                        title={
                          interactionMode === 'restore'
                            ? 'Clique e arraste para adicionar/restaurar partes da foto original'
                            : interactionMode === 'erase'
                            ? 'Clique e arraste a borracha para apagar resíduos do fundo'
                            : 'Arraste para posicionar manualmente o produto'
                        }
                      >
                        {/* Guias sutis de centralização */}
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-stone-400/35" />
                        <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-stone-400/35" />

                        {/* Canvas interativo com transformações em tempo real */}
                        <div
                          className="w-full h-full flex items-center justify-center overflow-hidden pointer-events-none"
                          style={{
                            padding: `${cropMargin}%`,
                          }}
                        >
                          <canvas
                            ref={editorCanvasRef}
                            className="max-w-full max-h-full object-contain transition-transform duration-75"
                            style={{
                              transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`,
                            }}
                          />
                        </div>

                        {/* Indicador circular do Pincel/Borracha em tempo real */}
                        {interactionMode !== 'move' && brushCursor.visible && !isRemovingBg && (
                          <div
                            className={`pointer-events-none absolute rounded-full border-2 shadow-xs ${
                              interactionMode === 'restore'
                                ? 'border-emerald-600 bg-emerald-500/20'
                                : 'border-[#850D2C] bg-[#850D2C]/15'
                            }`}
                            style={{
                              width: `${brushSize}px`,
                              height: `${brushSize}px`,
                              left: `${brushCursor.x - brushSize / 2}px`,
                              top: `${brushCursor.y - brushSize / 2}px`,
                            }}
                          />
                        )}

                        {/* Badge de instrução de interação */}
                        {!isRemovingBg && (
                          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1 whitespace-nowrap shadow-sm">
                            {interactionMode === 'restore' ? (
                              <>
                                <Paintbrush className="w-2.5 h-2.5 text-emerald-300" />
                                <span>Pinte para restaurar da foto</span>
                              </>
                            ) : interactionMode === 'erase' ? (
                              <>
                                <Eraser className="w-2.5 h-2.5 text-rose-300" />
                                <span>Passe para apagar o fundo</span>
                              </>
                            ) : (
                              <>
                                <Move className="w-2.5 h-2.5 text-amber-300" />
                                <span>Arraste para mover</span>
                              </>
                            )}
                          </span>
                        )}

                        {/* Overlay de Carregamento durante Processamento da IA */}
                        {isRemovingBg && (
                          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center space-y-2.5 z-10">
                            <RefreshCw className="w-6 h-6 text-[#850D2C] animate-spin" />
                            <div className="space-y-1 w-full">
                              <p className="text-xs font-semibold text-[#35312F]">
                                {bgProgressText || 'Removendo fundo...'}
                              </p>
                              <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#850D2C] rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(10, bgProgressPercent)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-stone-400 block">
                                {bgProgressPercent}% concluído
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Seletor de Fundo de Teste (Não afeta a transparência exportada) */}
                      <div className="flex items-center space-x-1 text-[10px] text-stone-500">
                        <span>Fundo de teste:</span>
                        <button
                          type="button"
                          onClick={() => setPreviewBackdrop('checker')}
                          className={`px-2 py-0.5 rounded-md border font-medium cursor-pointer ${
                            previewBackdrop === 'checker'
                              ? 'bg-[#850D2C] text-white border-[#850D2C]'
                              : 'bg-white text-stone-600 border-stone-200'
                          }`}
                        >
                          Transparente
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewBackdrop('white')}
                          className={`px-2 py-0.5 rounded-md border font-medium cursor-pointer ${
                            previewBackdrop === 'white'
                              ? 'bg-[#850D2C] text-white border-[#850D2C]'
                              : 'bg-white text-stone-600 border-stone-200'
                          }`}
                        >
                          Branco
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewBackdrop('cream')}
                          className={`px-2 py-0.5 rounded-md border font-medium cursor-pointer ${
                            previewBackdrop === 'cream'
                              ? 'bg-[#850D2C] text-white border-[#850D2C]'
                              : 'bg-white text-stone-600 border-stone-200'
                          }`}
                        >
                          Creme
                        </button>
                      </div>
                    </div>

                    {/* Coluna Direita: Controles Manuais de Pincel, Recorte, Zoom e Centralização (7 cols) */}
                    <div className="md:col-span-7 space-y-3 bg-white p-3.5 rounded-2xl border border-stone-200/80">
                      {/* Painel do Pincel & Borracha Manual */}
                      <div className="p-2.5 rounded-xl bg-[#F9F7F3] border border-stone-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            {interactionMode === 'restore' ? (
                              <Paintbrush className="w-3.5 h-3.5 text-[#4c543c]" />
                            ) : (
                              <Eraser className="w-3.5 h-3.5 text-[#850D2C]" />
                            )}
                            <span className="text-xs font-bold text-[#35312F]">
                              Ajuste Manual do Recorte
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCleanFragments}
                            className="px-2 py-0.5 rounded-lg bg-white hover:bg-stone-100 text-[#850D2C] border border-stone-200 text-[10px] font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                            title="Remover automaticamente manchas e fragmentos soltos ao redor do produto"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Limpar resíduos soltos</span>
                          </button>
                        </div>

                        {/* Alternador Rápido: Borracha (Apagar) vs Pincel (Adicionar/Restaurar) */}
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-stone-200">
                          <button
                            type="button"
                            onClick={() => setInteractionMode('erase')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                              interactionMode === 'erase'
                                ? 'bg-[#850D2C] text-white shadow-2xs'
                                : 'text-stone-600 hover:text-[#35312F] hover:bg-stone-50'
                            }`}
                          >
                            <Eraser className="w-3.5 h-3.5" />
                            <span>Borracha (Apagar)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInteractionMode('restore')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                              interactionMode === 'restore'
                                ? 'bg-[#4c543c] text-white shadow-2xs'
                                : 'text-stone-600 hover:text-[#35312F] hover:bg-stone-50'
                            }`}
                          >
                            <Paintbrush className="w-3.5 h-3.5" />
                            <span>Pincel (Adicionar)</span>
                          </button>
                        </div>

                        {/* Mensagem de orientação */}
                        <p className="text-[10.5px] leading-tight">
                          {interactionMode === 'restore' ? (
                            <span className="text-[#4c543c] font-medium">
                              ✓ <strong>Modo Adicionar ativo:</strong> pinte sobre áreas apagadas para trazer de volta os detalhes originais da foto.
                            </span>
                          ) : interactionMode === 'erase' ? (
                            <span className="text-[#850D2C] font-medium">
                              ✓ <strong>Modo Borracha ativo:</strong> passe o pincel para apagar restos de fundo ou sombras indesejadas.
                            </span>
                          ) : (
                            <span className="text-stone-500">
                              Escolha <strong>Borracha</strong> para apagar ou <strong>Pincel</strong> para recuperar partes cortadas da foto original.
                            </span>
                          )}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1 border-t border-stone-200/60">
                          <div className="sm:col-span-8">
                            <div className="flex items-center justify-between text-[11px] mb-0.5">
                              <span className="text-stone-600 font-medium">
                                Tamanho do pincel
                              </span>
                              <span className={`font-bold ${interactionMode === 'restore' ? 'text-[#4c543c]' : 'text-[#850D2C]'}`}>{brushSize}px</span>
                            </div>
                            <input
                              type="range"
                              min="6"
                              max="64"
                              step="2"
                              value={brushSize}
                              onChange={(e) => {
                                setBrushSize(parseInt(e.target.value, 10));
                                if (interactionMode === 'move') setInteractionMode('erase');
                              }}
                              className={`w-full cursor-pointer ${interactionMode === 'restore' ? 'accent-[#4c543c]' : 'accent-[#850D2C]'}`}
                            />
                          </div>

                          <div className="sm:col-span-4 flex flex-col">
                            <span className="text-[10px] text-stone-500 font-medium mb-0.5">
                              Borda do pincel
                            </span>
                            <div className="inline-flex rounded-lg bg-white p-0.5 border border-stone-200">
                              <button
                                type="button"
                                onClick={() => {
                                  setSoftBrush(true);
                                  if (interactionMode === 'move') setInteractionMode('erase');
                                }}
                                className={`flex-1 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                                  softBrush
                                    ? (interactionMode === 'restore' ? 'bg-[#4c543c] text-white' : 'bg-[#850D2C] text-white')
                                    : 'text-stone-600 hover:text-[#35312F]'
                                }`}
                              >
                                Suave
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSoftBrush(false);
                                  if (interactionMode === 'move') setInteractionMode('erase');
                                }}
                                className={`flex-1 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                                  !softBrush
                                    ? (interactionMode === 'restore' ? 'bg-[#4c543c] text-white' : 'bg-[#850D2C] text-white')
                                    : 'text-stone-600 hover:text-[#35312F]'
                                }`}
                              >
                                Nítida
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 1. Redimensionar (Zoom / Escala) */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#35312F]">
                            Redimensionar produto (Zoom)
                          </span>
                          <span className="text-[11px] font-bold text-[#850D2C]">
                            {Math.round(zoom * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              pushToHistory();
                              setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))));
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 cursor-pointer"
                            title="Diminuir tamanho"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="range"
                            min="0.5"
                            max="2.2"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 accent-[#850D2C] cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              pushToHistory();
                              setZoom((z) => Math.min(2.2, Number((z + 0.1).toFixed(2))));
                            }}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 cursor-pointer"
                            title="Aumentar tamanho"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 2. Recortar Margens & Proporção */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-stone-100">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-[#35312F]">
                              Recorte de bordas
                            </span>
                            <span className="text-[11px] text-stone-500">{cropMargin}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="25"
                            step="1"
                            value={cropMargin}
                            onChange={(e) => setCropMargin(parseInt(e.target.value, 10))}
                            className="w-full accent-[#850D2C] cursor-pointer"
                          />
                        </div>

                        <div>
                          <span className="block text-xs font-semibold text-[#35312F] mb-1">
                            Proporção do recorte
                          </span>
                          <div className="inline-flex rounded-xl bg-stone-100 p-0.5 border border-stone-200 w-full">
                            {(['1:1', '4:3', '16:9'] as CropAspectRatio[]).map((ratio) => (
                              <button
                                key={ratio}
                                type="button"
                                onClick={() => {
                                  pushToHistory();
                                  setAspectRatio(ratio);
                                }}
                                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                  aspectRatio === ratio
                                    ? 'bg-[#850D2C] text-white shadow-2xs'
                                    : 'text-stone-600 hover:text-[#35312F]'
                                }`}
                              >
                                {ratio}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 3. Centralização Rápida & Formato com Transparência */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-stone-100 items-end">
                        <div>
                          <span className="block text-[11px] font-semibold text-[#35312F] mb-1">
                            Alinhamento do produto
                          </span>
                          <button
                            type="button"
                            onClick={handleCenterProduct}
                            className="w-full h-8 px-3 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-[#35312F] border border-stone-200 text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition cursor-pointer"
                            title="Centralizar automaticamente o produto no quadro"
                          >
                            <Crosshair className="w-3.5 h-3.5 text-[#850D2C]" />
                            <span>Centralizar produto</span>
                          </button>
                        </div>

                        <div>
                          <span className="block text-[11px] font-semibold text-[#35312F] mb-1">
                            Formato transparente
                          </span>
                          <select
                            value={exportFormat}
                            onChange={(e) =>
                              setExportFormat(e.target.value as ExportImageFormat)
                            }
                            className="w-full h-8 px-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-medium text-[#35312F] focus:ring-1 focus:ring-[#850D2C] focus:outline-none cursor-pointer"
                          >
                            <option value="image/png">PNG (Transparência máxima)</option>
                            <option value="image/webp">WebP (Transparente leve)</option>
                          </select>
                        </div>
                      </div>

                      {/* 4. Barra de Ações do Editor: Desfazer, Manter Original e Salvar Imagem Editada */}
                      <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={handleUndo}
                            disabled={history.length === 0 || isRemovingBg}
                            className="h-8 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                            title="Desfazer última alteração ou pincelada"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Desfazer</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRestoreOriginal}
                            disabled={!isModifiedFromOriginal || isRemovingBg}
                            className="h-8 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                            title="Recuperar e manter a imagem original sem edições"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Original</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleApplyEditedImage}
                          disabled={isRemovingBg}
                          className="h-8 px-3.5 rounded-xl bg-[#850D2C] hover:bg-[#6e0a24] text-white text-xs font-semibold inline-flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                          title="Salvar e aplicar a imagem editada ao produto"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar imagem editada</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé de Ações integrado diretamente ao Card */}
            <div className="pt-4 mt-6 border-t border-stone-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isRemovingBg}
                className="px-5 py-2.5 text-xs font-semibold text-stone-600 hover:text-[#35312F] rounded-xl hover:bg-stone-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isRemovingBg}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#850D2C] hover:bg-[#6e0a24] active:bg-[#58071c] rounded-xl shadow-xs transition inline-flex items-center space-x-2 disabled:opacity-75 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>{productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
