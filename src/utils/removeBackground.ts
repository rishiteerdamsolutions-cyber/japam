/** Works offline — no model download. For handwritten nāma photographed on white paper. */

export const REMBG_PROCESSING_ERROR =
  'Could not prepare your photo. Use a clear photo of the nāma on plain white paper.';

export const REMBG_NETWORK_ERROR = REMBG_PROCESSING_ERROR;

type Rgb = { r: number; g: number; b: number };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

async function downscaleDataUrl(dataUrl: string, maxSide = 1600): Promise<string> {
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

/** Sample border pixels to learn the paper colour (handles cream/off-white paper). */
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

/** True when the image already has transparent pixels (background already removed). */
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

/**
 * Remove white/cream paper background — runs entirely on-device (no network, no AI model).
 */
export async function removeWhitePaperBackground(dataUrl: string): Promise<string> {
  const scaled = await downscaleDataUrl(dataUrl);
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
    if (looksLikePaper) {
      data[i + 3] = 0;
    } else {
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return cropToContentBounds(canvas.toDataURL('image/png'));
}

/** No-op — kept so callers can warm up without downloading anything. */
export function preloadBackgroundRemovalModel() {
  return Promise.resolve();
}

export async function removeBackgroundFromImage(dataUrl: string): Promise<string> {
  if (await imageHasTransparentBackground(dataUrl)) {
    return cropToContentBounds(dataUrl);
  }
  await sleep(0);
  return removeWhitePaperBackground(dataUrl);
}
