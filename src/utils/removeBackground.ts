import { remove, newSession, rembgConfig, type ProgressInfo } from '@bunnio/rembg-web';
import * as ort from 'onnxruntime-web';

export const REMBG_PROCESSING_ERROR =
  'Could not prepare your photo. Use a clear photo of the nāma on plain white paper.';

export const REMBG_NETWORK_ERROR =
  'Still downloading the photo tools. Stay on this page — slow network is OK. Tap try again if needed.';

export type BackgroundRemovalProgress = {
  step: 'downloading' | 'processing' | 'postprocessing' | 'complete' | 'fallback';
  progress: number;
  message: string;
};

export type RemoveBackgroundOptions = {
  onProgress?: (info: BackgroundRemovalProgress) => void;
  /** Prefer AI model; if it fails, fall back to white-paper cleanup. Default true. */
  allowOfflineFallback?: boolean;
};

type Rgb = { r: number; g: number; b: number };

const ONNX_WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';

let configured = false;
let sessionPromise: Promise<Awaited<ReturnType<typeof newSession>>> | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureRembgConfig(): void {
  if (configured) return;
  ort.env.wasm.wasmPaths = ONNX_WASM_CDN;
  ort.env.wasm.numThreads = 1;
  // Default rembg path is /models/u2netp.onnx — we ship that file from public/models.
  rembgConfig.setBaseUrl('');
  rembgConfig.setCustomModelPath('u2netp', '/models/u2netp.onnx');
  configured = true;
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

async function downscaleDataUrl(dataUrl: string, maxSide = 1280): Promise<string> {
  const img = await loadImage(dataUrl);
  const longest = Math.max(img.width, img.height);
  if (longest <= maxSide) return dataUrl;
  const scale = maxSide / longest;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function colorDistance(r: number, g: number, b: number, ref: Rgb): number {
  const dr = r - ref.r;
  const dg = g - ref.g;
  const db = b - ref.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function estimatePaperFromBorder(data: Uint8ClampedArray, width: number, height: number): Rgb {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;
  const band = Math.max(4, Math.round(Math.min(width, height) * 0.06));

  const sample = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    rSum += data[i]!;
    gSum += data[i + 1]!;
    bSum += data[i + 2]!;
    n += 1;
  };

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < band; y++) sample(x, y);
    for (let y = height - band; y < height; y++) sample(x, y);
  }
  for (let y = band; y < height - band; y++) {
    for (let x = 0; x < band; x++) sample(x, y);
    for (let x = width - band; x < width; x++) sample(x, y);
  }

  if (!n) return { r: 250, g: 250, b: 250 };
  return { r: rSum / n, g: gSum / n, b: bSum / n };
}

function cropToContentBounds(dataUrl: string, padding = 8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;

      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const alpha = data[(y * width + x) * 4 + 3]!;
          if (alpha > 20) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX < minX || maxY < minY) {
        resolve(dataUrl);
        return;
      }

      const pad = Math.min(padding, Math.floor(Math.min(maxX - minX + 1, maxY - minY + 1) * 0.08));
      const left = Math.max(0, minX - pad);
      const top = Math.max(0, minY - pad);
      const right = Math.min(width, maxX + 1 + pad);
      const bottom = Math.min(height, maxY + 1 + pad);
      const w = right - left;
      const h = bottom - top;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = w;
      cropCanvas.height = h;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) {
        reject(new Error('Could not get crop canvas context'));
        return;
      }
      cropCtx.drawImage(img, left, top, w, h, 0, 0, w, h);
      resolve(cropCanvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

export async function imageHasTransparentBackground(dataUrl: string): Promise<boolean> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const step = Math.max(4, Math.floor(data.length / 4 / 8000));
  for (let i = 3; i < data.length; i += step * 4) {
    if (data[i]! < 240) return true;
  }
  return false;
}

export async function removeWhitePaperBackground(dataUrl: string): Promise<string> {
  const scaled = await downscaleDataUrl(dataUrl, 1600);
  const img = await loadImage(scaled);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(REMBG_PROCESSING_ERROR);
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const paper = estimatePaperFromBorder(data, width, height);
  const threshold = 52;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const nearPaper = colorDistance(r, g, b, paper) < threshold;
    const looksLikePaper = nearPaper || (lum > 195 && chroma < 55);
    data[i + 3] = looksLikePaper ? 0 : 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return cropToContentBounds(canvas.toDataURL('image/png'));
}

async function getOrCreateSession(onProgress?: (info: BackgroundRemovalProgress) => void) {
  ensureRembgConfig();
  if (!sessionPromise) {
    onProgress?.({
      step: 'downloading',
      progress: 5,
      message: 'Preparing photo tools (first time may take a minute)…',
    });
    sessionPromise = newSession('u2netp');
  }
  return sessionPromise;
}

async function removeWithAi(
  dataUrl: string,
  onProgress?: (info: BackgroundRemovalProgress) => void,
): Promise<string> {
  const scaled = await downscaleDataUrl(dataUrl);
  const img = await loadImage(scaled);
  const session = await getOrCreateSession(onProgress);
  const blob = await remove(img, {
    session,
    onProgress: (info: ProgressInfo) => {
      onProgress?.({
        step: info.step,
        progress: Math.max(0, Math.min(100, info.progress)),
        message:
          info.step === 'downloading'
            ? `Downloading photo tools… ${Math.round(info.progress)}%`
            : info.step === 'processing'
              ? `Removing background… ${Math.round(info.progress)}%`
              : info.step === 'postprocessing'
                ? 'Finishing your nāma photo…'
                : info.message || 'Almost ready…',
      });
    },
  });
  const withBgRemoved = await blobToDataUrl(blob);
  onProgress?.({ step: 'postprocessing', progress: 95, message: 'Your Japa PDF is getting ready…' });
  return cropToContentBounds(withBgRemoved);
}

/** Warm the model while the devotee fills name/gotram (best effort). */
export function preloadBackgroundRemovalModel(onProgress?: (info: BackgroundRemovalProgress) => void) {
  return getOrCreateSession(onProgress).catch(() => {
    sessionPromise = null;
  });
}

/**
 * Prefer AI model (self-hosted u2netp + progress). On failure, clean white paper offline.
 */
export async function removeBackgroundFromImage(
  dataUrl: string,
  options?: RemoveBackgroundOptions,
): Promise<string> {
  const onProgress = options?.onProgress;
  const allowFallback = options?.allowOfflineFallback !== false;

  if (await imageHasTransparentBackground(dataUrl)) {
    onProgress?.({ step: 'complete', progress: 100, message: 'Photo ready.' });
    return cropToContentBounds(dataUrl);
  }

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      onProgress?.({
        step: 'downloading',
        progress: 2 + attempt * 3,
        message:
          attempt === 0
            ? 'Your Japa PDF is getting ready…'
            : `Still preparing your photo (attempt ${attempt + 1})…`,
      });
      const result = await removeWithAi(dataUrl, onProgress);
      onProgress?.({ step: 'complete', progress: 100, message: 'Background removed — PDF almost ready.' });
      return result;
    } catch (err) {
      lastErr = err;
      sessionPromise = null;
      await sleep(700 * (attempt + 1));
    }
  }

  if (allowFallback) {
    onProgress?.({
      step: 'fallback',
      progress: 70,
      message: 'Using on-device cleanup while the model finishes caching…',
    });
    try {
      const offline = await removeWhitePaperBackground(dataUrl);
      onProgress?.({
        step: 'complete',
        progress: 100,
        message: 'Photo ready — your Japa PDF is getting ready.',
      });
      return offline;
    } catch {
      /* fall through */
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message.toLowerCase() : '';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('wasm') || msg.includes('download')) {
    throw new Error(REMBG_NETWORK_ERROR);
  }
  throw new Error(REMBG_PROCESSING_ERROR);
}
