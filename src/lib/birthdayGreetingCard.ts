export interface BirthdayGreetingCardCopy {
  headline: string;
  achievement: string;
  blessing1: string;
  blessing2: string;
  from: string;
}

export interface RenderBirthdayGreetingCardOptions {
  deityName: string;
  copy: BirthdayGreetingCardCopy;
  /** Optional top symbol (e.g. 🎂). Pass null/empty to hide. */
  topSymbol?: string | null;
  /** Keep footer website line for birthday card by default. */
  showBrandUrl?: boolean;
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const header = parts[0] || '';
    const base64 = parts.slice(1).join(',');
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mime = mimeMatch?.[1] || 'image/png';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function drawGlossBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bg = ctx.createLinearGradient(0, 0, width, height * 1.2);
  bg.addColorStop(0, '#E91E63');
  bg.addColorStop(0.25, '#D81B60');
  bg.addColorStop(0.5, '#E91E63');
  bg.addColorStop(0.75, '#D81B60');
  bg.addColorStop(1, '#C2185B');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const radialTop = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width * 0.9);
  radialTop.addColorStop(0, 'rgba(255, 120, 160, 0.4)');
  radialTop.addColorStop(0.5, 'rgba(255, 120, 160, 0.1)');
  radialTop.addColorStop(1, 'transparent');
  ctx.fillStyle = radialTop;
  ctx.fillRect(0, 0, width, height * 0.5);
}

/** Shareable birthday greeting after a Special 108 Japa win. */
export async function renderBirthdayGreetingCardBlob(
  opts: RenderBirthdayGreetingCardOptions,
): Promise<Blob | null> {
  try {
    const width = 720;
    const height = 1280;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const pad = 40;
    const centerX = width / 2;
    const maxW = width - pad * 2;
    const fontFamily = '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, serif';

    drawGlossBackground(ctx, width, height);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

    const wrapAndDraw = (
      text: string,
      fontSize: number,
      weight: string,
      color: string,
      startY: number,
      lineGap: number,
      font: string,
      align: CanvasTextAlign = 'center',
    ) => {
      ctx.font = `${weight} ${fontSize}px ${font}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      let y = startY;
      for (const ln of lines) {
        ctx.fillText(ln, align === 'center' ? centerX : pad + 8, y);
        y += fontSize * lineGap;
      }
      ctx.textAlign = 'left';
      return y - startY;
    };

    let y = pad + 72;
    const topSymbol = opts.topSymbol === undefined ? '🎂' : opts.topSymbol;
    if (topSymbol) {
      ctx.font = `700 56px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText(topSymbol, centerX, y);
      y += 64;
    }

    y += wrapAndDraw(opts.copy.headline, 52, '700', 'rgba(255, 248, 220, 0.98)', y, 1.15, fontFamily) + 28;

    ctx.font = `600 28px ${fontFamily}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.95)';
    ctx.textAlign = 'center';
    ctx.fillText(opts.deityName, centerX, y);
    y += 48;

    y += wrapAndDraw(opts.copy.achievement, 26, '500', 'rgba(255, 255, 255, 0.92)', y, 1.35, fontFamily) + 24;
    y += wrapAndDraw(opts.copy.blessing1, 24, '500', 'rgba(255, 255, 255, 0.88)', y, 1.35, fontFamily) + 20;
    y += wrapAndDraw(opts.copy.blessing2, 24, '500', 'rgba(255, 255, 255, 0.88)', y, 1.35, fontFamily) + 40;

    ctx.font = `600 22px ${fontFamily}`;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(opts.copy.from, centerX, height - pad - 56);

    if (opts.showBrandUrl !== false) {
      ctx.font = `700 36px ${fontFamily}`;
      ctx.fillStyle = 'rgba(255, 248, 220, 0.95)';
      ctx.fillText('www.japam.digital', centerX, height - pad - 16);
    }

    return dataUrlToBlob(canvas.toDataURL('image/png'));
  } catch {
    return null;
  }
}

export function downloadBirthdayGreetingCard(blob: Blob, deitySlug: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `japam-birthday-greeting-${deitySlug}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
