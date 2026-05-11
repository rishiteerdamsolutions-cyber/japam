import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('ad-assets/menu-demo-frames');
const url = process.env.DEMO_URL || 'http://127.0.0.1:5173/menu';
const fps = Number(process.env.DEMO_FPS || 30);
const seconds = Number(process.env.DEMO_SECONDS || 10);
const totalFrames = Math.max(1, Math.round(fps * seconds));
const frameDelayMs = Math.max(1, Math.round(1000 / fps));

await fs.mkdir(outDir, { recursive: true });
for (const name of await fs.readdir(outDir)) {
  if (name.endsWith('.png')) await fs.unlink(path.join(outDir, name));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(2200);

for (let i = 0; i < totalFrames; i++) {
  const n = String(i + 1).padStart(4, '0');
  await page.screenshot({
    path: path.join(outDir, `frame-${n}.png`),
    fullPage: false,
    timeout: 0,
  });
  await page.waitForTimeout(frameDelayMs);
}

await browser.close();
console.log(`Captured ${totalFrames} frames to ${outDir}`);
