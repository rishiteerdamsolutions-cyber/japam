import { remove, newSession, rembgConfig } from '@bunnio/rembg-web';

/** User-facing error for network/model load failures */
export const REMBG_NETWORK_ERROR = 'Network error. Please check your connection and try again.';

/**
 * Crop image to content bounding box, trimming transparent/empty edges.
 * Reduces gaps when image has lots of empty space above/below the actual nama.
 * Alpha threshold 10: pixels with alpha <= 10 are treated as empty.
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

/**
 * Blob to data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/** One-time config: use free HuggingFace-hosted models */
let configured = false;
function ensureConfig(): void {
  if (configured) return;
  rembgConfig.setBaseUrl('https://huggingface.co/bunnio/dis_anime/resolve/main');
  configured = true;
}

/**
 * Remove background using AI (MIT license, runs in browser, no API key).
 * Models hosted on HuggingFace, free. Uses u2netp (~5MB) for fast load.
 * On network/model errors, throws with REMBG_NETWORK_ERROR message.
 */
export async function removeBackgroundFromImage(dataUrl: string): Promise<string> {
  ensureConfig();
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Failed to load image'));
      i.src = dataUrl;
    });
    const session = await newSession('u2netp');
    const blob = await remove(img, { session });
    const withBgRemoved = await blobToDataUrl(blob);
    return cropToContentBounds(withBgRemoved);
  } catch (err) {
    throw new Error(REMBG_NETWORK_ERROR);
  }
}
