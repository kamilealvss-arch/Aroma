const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
};

let bucketCreationAttempted = false;

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function getStorageConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || 'product-images').trim();
  return { supabaseUrl, serviceKey, bucket };
}

function buildAuthHeaders(serviceKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: serviceKey,
  };
  if (!serviceKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }
  return headers;
}

async function ensurePublicBucket(supabaseUrl: string, serviceKey: string, bucket: string): Promise<boolean> {
  if (bucketCreationAttempted) return false;
  bucketCreationAttempted = true;

  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(serviceKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: true,
      }),
    });
    return res.ok || res.status === 409;
  } catch (err: any) {
    console.warn('⚠️  Supabase Storage: falha ao criar bucket:', err?.message || err);
    return false;
  }
}

async function putObjectToStorage(
  supabaseUrl: string,
  serviceKey: string,
  bucket: string,
  objectPath: string,
  mimeType: string,
  bytes: Uint8Array
): Promise<Response> {
  return fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(serviceKey),
      'Content-Type': mimeType,
      'x-upsert': 'true',
      'cache-control': '31536000',
    },
    body: new Blob([bytes as unknown as BlobPart], { type: mimeType }),
  });
}

export async function uploadDataUrlIfConfigured(
  dataUrl: string | undefined,
  filePrefix: string
): Promise<string | undefined> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || !isSupabaseStorageConfigured()) {
    return dataUrl;
  }

  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl;

  const header = dataUrl.slice(5, commaIdx);
  if (!header.includes(';base64')) return dataUrl;

  const mimeType = (header.split(';')[0] || 'image/png').toLowerCase();
  const base64Data = dataUrl.slice(commaIdx + 1);
  if (!base64Data) return dataUrl;

  const ext = MIME_EXTENSION_MAP[mimeType] || 'bin';
  const safePrefix = filePrefix.replace(/[^a-zA-Z0-9_-]/g, '_') || 'img';
  const objectPath = `${safePrefix}-${Date.now()}.${ext}`;

  const { supabaseUrl, serviceKey, bucket } = getStorageConfig();

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const bytes = new Uint8Array(buffer);

    let res = await putObjectToStorage(supabaseUrl, serviceKey, bucket, objectPath, mimeType, bytes);

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      const shouldCreateBucket =
        !bucketCreationAttempted &&
        (res.status === 400 || res.status === 404 || errorText.toLowerCase().includes('bucket not found'));

      if (shouldCreateBucket) {
        const created = await ensurePublicBucket(supabaseUrl, serviceKey, bucket);
        if (created) {
          res = await putObjectToStorage(supabaseUrl, serviceKey, bucket, objectPath, mimeType, bytes);
        }
      } else if (!res.ok) {
        console.warn(`⚠️  Supabase Storage upload falhou (${res.status}): ${errorText.slice(0, 180)}`);
        return dataUrl;
      }
    }

    if (!res.ok) {
      const retryErr = await res.text().catch(() => '');
      console.warn(`⚠️  Supabase Storage upload falhou após criar bucket (${res.status}): ${retryErr.slice(0, 180)}`);
      return dataUrl;
    }

    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  } catch (err: any) {
    console.warn('⚠️  Erro ao enviar imagem para Supabase Storage (usando fallback Base64):', err?.message || err);
    return dataUrl;
  }
}

export async function processProductImagesForStorage<
  T extends { imageUrl?: string; cutoutImageUrl?: string }
>(payload: T, productIdHint: string): Promise<T> {
  const copy: T = { ...payload };

  if (typeof copy.imageUrl === 'string' && copy.imageUrl.startsWith('data:image/')) {
    copy.imageUrl = await uploadDataUrlIfConfigured(copy.imageUrl, `${productIdHint}-main`);
  }

  if (typeof copy.cutoutImageUrl === 'string' && copy.cutoutImageUrl.startsWith('data:image/')) {
    copy.cutoutImageUrl = await uploadDataUrlIfConfigured(copy.cutoutImageUrl, `${productIdHint}-cutout`);
  }

  return copy;
}
