import { remove, newSession, rembgConfig } from '@bunnio/rembg-web';

/** User-facing error for network/model load failures */
export const REMBG_NETWORK_ERROR = 'Network error. Please check your connection and try again.';

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
    return blobToDataUrl(blob);
  } catch (err) {
    throw new Error(REMBG_NETWORK_ERROR);
  }
}
