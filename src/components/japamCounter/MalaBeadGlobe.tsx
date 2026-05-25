import { forwardRef, memo, useImperativeHandle, useLayoutEffect, useRef } from 'react';

export type MalaBeadGlobeQuality = 'draft' | 'full';

export type MalaBeadGlobeHandle = {
  /** Paint immediately (used while finger is rolling — skips React state). */
  paint: (spinXDeg: number, quality?: MalaBeadGlobeQuality) => void;
};

type Props = {
  /** Roll on thread axis — rotation around X (poles left/right; only top↔bottom spin) */
  spinX?: number;
  sizePx?: number;
};

const DEG = Math.PI / 180;
/** 90° left: model poles (+Y) → fixed on ±X (pole-to-pole horizontal) */
const POLE_ON_X_RZ = 90 * DEG;
const VIEW_TILT_X = 14 * DEG;
const MUKHI_COUNT = 5;
const LIGHT = normVec(-0.36, -0.4, 0.82);
const SPEC_DIR = normVec(0.5, -0.3, 0.8);

function normVec(x: number, y: number, z: number) {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}

function norm(x: number, y: number, z: number) {
  return normVec(x, y, z);
}

function dot(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function hash3(x: number, y: number, z: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise3(x: number, y: number, z: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const c = (i: number, j: number, k: number) => hash3(ix + i, iy + j, iz + k);
  const x00 = c(0, 0, 0) * (1 - ux) + c(1, 0, 0) * ux;
  const x10 = c(0, 1, 0) * (1 - ux) + c(1, 1, 0) * ux;
  const x01 = c(0, 0, 1) * (1 - ux) + c(1, 0, 1) * ux;
  const x11 = c(0, 1, 1) * (1 - ux) + c(1, 1, 1) * ux;
  const y0 = x00 * (1 - uy) + x10 * uy;
  const y1 = x01 * (1 - uy) + x11 * uy;
  return y0 * (1 - uz) + y1 * uz;
}

function fbm(x: number, y: number, z: number, octaves: number) {
  let amp = 0.55;
  let freq = 1;
  let sum = 0;
  let normAmp = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq);
    normAmp += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / normAmp;
}

function lonY(mx: number, mz: number) {
  return Math.atan2(mx, mz);
}

function rudrakshaHeight(mx: number, my: number, mz: number) {
  const lon = lonY(mx, mz);
  const mukhiWave = Math.cos(lon * MUKHI_COUNT);

  const groove = Math.pow(Math.max(0, -mukhiWave), 2.8) * 0.62;
  const ridge = Math.pow(Math.max(0, mukhiWave), 1.45) * 0.32;
  const poleCup = Math.pow(Math.abs(my), 3.2) * 0.2;
  const grain = (fbm(mx * 16, my * 16, mz * 16, 2) - 0.5) * 0.09;
  const organic = (fbm(mx * 5.5, my * 5.5, mz * 5.5, 3) - 0.5) * 0.14;

  return ridge - groove - poleCup + grain + organic;
}

function grooveDepth01(mx: number, mz: number) {
  const mukhiWave = Math.cos(lonY(mx, mz) * MUKHI_COUNT);
  return Math.pow(Math.max(0, -mukhiWave), 1.6);
}

function perturbedNormal(mx: number, my: number, mz: number, strength: number) {
  const eps = 0.026;
  const h = rudrakshaHeight(mx, my, mz);
  const hx = rudrakshaHeight(mx + eps, my, mz) - h;
  const hy = rudrakshaHeight(mx, my + eps, mz) - h;
  const hz = rudrakshaHeight(mx, my, mz + eps) - h;
  return norm(mx - (hx / eps) * strength, my - (hy / eps) * strength, mz - (hz / eps) * strength);
}

function modelToView(x: number, y: number, z: number, spinX: number) {
  const cz = Math.cos(POLE_ON_X_RZ);
  const sz = Math.sin(POLE_ON_X_RZ);
  const x0 = x * cz - y * sz;
  const y0 = x * sz + y * cz;
  const z0 = z;

  const cx = Math.cos(spinX);
  const sx = Math.sin(spinX);
  const y1 = y0 * cx - z0 * sx;
  const z1 = y0 * sx + z0 * cx;

  const cx2 = Math.cos(VIEW_TILT_X);
  const sx2 = Math.sin(VIEW_TILT_X);
  const y2 = y1 * cx2 - z1 * sx2;
  const z2 = y1 * sx2 + z1 * cx2;
  return { x: x0, y: y2, z: z2 };
}

function viewToModel(x: number, y: number, z: number, spinX: number) {
  const cx2 = Math.cos(VIEW_TILT_X);
  const sx2 = Math.sin(VIEW_TILT_X);
  const y1 = y * cx2 + z * sx2;
  const z1 = -y * sx2 + z * cx2;

  const cx = Math.cos(spinX);
  const sx = Math.sin(spinX);
  const y0 = y1 * cx + z1 * sx;
  const z0 = -y1 * sx + z1 * cx;

  const cz = Math.cos(POLE_ON_X_RZ);
  const sz = Math.sin(POLE_ON_X_RZ);
  const x2 = x * cz + y0 * sz;
  const y2 = -x * sz + y0 * cz;
  return norm(x2, y2, z0);
}

function shadeRudraksha(
  n: { x: number; y: number; z: number },
  viewZ: number,
  cavity: number,
  groove01: number,
) {
  const ndotl = Math.max(0, dot(n, LIGHT));
  const half = normVec(LIGHT.x + SPEC_DIR.x, LIGHT.y + SPEC_DIR.y, LIGHT.z + SPEC_DIR.z);
  const ndoth = Math.max(0, dot(n, half));
  const specTight = Math.pow(ndoth, 85) * 0.72;
  const specWide = Math.pow(ndoth, 14) * 0.18;
  const fresnel = Math.pow(1 - Math.max(0, viewZ), 2.6) * 0.32;

  const grooveDark = 1 - groove01 * 0.42;
  const ambient = 0.11;
  const diffuse = ndotl * 0.58 * cavity * grooveDark;
  const v = Math.min(1.12, ambient + diffuse + specTight + specWide + fresnel);

  const lo = [48, 26, 14];
  const groove = [62, 34, 18];
  const base = [108, 62, 34];
  const hi = [196, 148, 98];
  const t = Math.min(1, v);
  const mixGroove = groove01 * 0.55;
  const b0 = [
    lo[0] + (base[0] - lo[0]) * (1 - mixGroove) + (groove[0] - lo[0]) * mixGroove,
    lo[1] + (base[1] - lo[1]) * (1 - mixGroove) + (groove[1] - lo[1]) * mixGroove,
    lo[2] + (base[2] - lo[2]) * (1 - mixGroove) + (groove[2] - lo[2]) * mixGroove,
  ];
  let r = b0[0]! + (hi[0]! + (base[0]! - b0[0]!) * t - b0[0]!) * t;
  let g = b0[1]! + (hi[1]! + (base[1]! - b0[1]!) * t - b0[1]!) * t;
  let b = b0[2]! + (hi[2]! + (base[2]! - b0[2]!) * t - b0[2]!) * t;

  if (specTight > 0.3) {
    const s = Math.min(1, (specTight - 0.3) * 1.2);
    r = r + (245 - r) * s * 0.42;
    g = g + (228 - g) * s * 0.38;
    b = b + (195 - b) * s * 0.28;
  }

  return {
    r: Math.round(Math.min(255, r)),
    g: Math.round(Math.min(255, g)),
    b: Math.round(Math.min(255, b)),
    a: 255,
  };
}

function drawRudraksha(
  ctx: CanvasRenderingContext2D,
  size: number,
  spinXDeg: number,
  quality: MalaBeadGlobeQuality,
) {
  const spinX = spinXDeg * DEG;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.48;
  const bump = 0.48;
  const stride = quality === 'draft' ? 2 : 1;

  ctx.clearRect(0, 0, size, size);

  const img = ctx.createImageData(size, size);
  const d = img.data;
  const R2 = R * R;

  for (let py = 0; py < size; py += stride) {
    for (let px = 0; px < size; px += stride) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy > R2) continue;

      const vx = dx / R;
      const vy = dy / R;
      const vz = Math.sqrt(Math.max(0, 1 - vx * vx - vy * vy));
      const m = viewToModel(vx, vy, vz, spinX);
      const n = perturbedNormal(m.x, m.y, m.z, bump);
      const h = rudrakshaHeight(m.x, m.y, m.z);
      const cavity = h < 0 ? 1 + h * 1.4 : 1 - h * 0.1;
      const groove01 = grooveDepth01(m.x, m.z);
      const nView = modelToView(n.x, n.y, n.z, spinX);
      const viewZ = Math.max(0, nView.z);
      const { r, g, b, a } = shadeRudraksha(n, viewZ, cavity, groove01);

      for (let sy = 0; sy < stride && py + sy < size; sy++) {
        for (let sx = 0; sx < stride && px + sx < size; sx++) {
          const ppx = px + sx;
          const ppy = py + sy;
          if ((ppx - cx) ** 2 + (ppy - cy) ** 2 > R2) continue;
          const i = (ppy * size + ppx) * 4;
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  const gloss = ctx.createRadialGradient(
    cx - R * 0.26,
    cy - R * 0.3,
    R * 0.02,
    cx - R * 0.12,
    cy - R * 0.18,
    R * 0.7,
  );
  gloss.addColorStop(0, 'rgba(255, 242, 220, 0.32)');
  gloss.addColorStop(0.4, 'rgba(220, 180, 130, 0.1)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  const rim = ctx.createRadialGradient(cx, cy, R * 0.68, cx, cy, R);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(32, 16, 8, 0.5)');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
}

function paintGlobeCanvas(
  canvas: HTMLCanvasElement,
  sizePx: number,
  spinXDeg: number,
  quality: MalaBeadGlobeQuality,
) {
  const dpr =
    quality === 'draft'
      ? 1
      : Math.min(2.5, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const px = Math.round(sizePx * dpr);
  canvas.width = px;
  canvas.height = px;
  canvas.style.width = `${sizePx}px`;
  canvas.style.height = `${sizePx}px`;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  drawRudraksha(ctx, px, spinXDeg, quality);
}

/** 3D rudraksha — thread on X; roll top↔bottom on X only */
export const MalaBeadGlobe = memo(
  forwardRef<MalaBeadGlobeHandle, Props>(function MalaBeadGlobe({ spinX = 0, sizePx = 70 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useImperativeHandle(
      ref,
      () => ({
        paint(spinXDeg: number, quality: MalaBeadGlobeQuality = 'draft') {
          const canvas = canvasRef.current;
          if (!canvas) return;
          paintGlobeCanvas(canvas, sizePx, spinXDeg, quality);
        },
      }),
      [sizePx],
    );

    useLayoutEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      paintGlobeCanvas(canvas, sizePx, spinX, 'full');
    }, [spinX, sizePx]);

    return (
      <div
        className="pointer-events-none relative shrink-0 overflow-hidden rounded-full"
        style={{
          width: sizePx,
          height: sizePx,
          filter: 'drop-shadow(0 3px 8px rgba(40, 20, 8, 0.52))',
        }}
        aria-hidden
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    );
  }),
);
