import { remove, newSession, rembgConfig } from '@bunnio/rembg-web';
import * as ort from 'onnxruntime-web';

/** User-facing error for network/model load failures */
export const REMBG_NETWORK_ERROR =
  'Could not prepare your photo (model download failed). Check connection and try again.';

export const REMBG_PROCESSING_ERROR =
  'Could not remove the background from this photo. Try again with a clear photo on white paper.';

const REMBG_MODELS = ['u2netp', 'u2net'] as const;
const ONNX_WASM_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';

let configured = false;
let sessionPromise: ReturnType<typeof sessionForModel> | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureRembgConfig(): void {
  if (configured) return;
  ort.env.wasm.wasmPaths = ONNX_WASM_CDN;
  ort.env.wasm.numThreads = 1;
  rembgConfig.setBaseUrl('https://huggingface.co/bunnio/dis_anime/resolve/main');
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

/** Shrink large phone photos so rembg + WASM stay within mobile memory limits. */
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

/**
 * Crop image to content bounding box, trimming transparent/empty edges.
 */
function cropToContentBounds(dataUrl: string, padding = 6): Promise<string> {
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
          if (alpha > 10) {
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

async function sessionForModel(model: (typeof REMBG_MODELS)[number]) {
  ensureRembgConfig();
  return newSession(model);
}

async function removeWithModel(dataUrl: string, model: (typeof REMBG_MODELS)[number]): Promise<string> {
  const img = await loadImage(dataUrl);
  const session = await sessionForModel(model);
  const blob = await remove(img, { session });
  const withBgRemoved = await blobToDataUrl(blob);
  return cropToContentBounds(withBgRemoved);
}

/** Warm ONNX + model while the user fills the form (optional). */
export function preloadBackgroundRemovalModel() {
  ensureRembgConfig();
  if (!sessionPromise) {
    sessionPromise = sessionForModel('u2netp');
  }
  return sessionPromise;
}

/**
 * Remove background using in-browser AI. Retries models and attempts — not a silent skip.
 */
export async function removeBackgroundFromImage(dataUrl: string): Promise<string> {
  ensureRembgConfig();
  const scaled = await downscaleDataUrl(dataUrl);
  let lastErr: unknown = null;

  for (const model of REMBG_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await removeWithModel(scaled, model);
      } catch (err) {
        lastErr = err;
        sessionPromise = null;
        await sleep(400 * (attempt + 1));
      }
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message.toLowerCase() : '';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('wasm') || msg.includes('backend')) {
    throw new Error(REMBG_NETWORK_ERROR);
  }
  throw new Error(REMBG_PROCESSING_ERROR);
}
