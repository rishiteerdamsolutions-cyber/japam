/**
 * Power strip icons — policy (read before changing this file)
 *
 * Shipped game uses **PNG only** in public/images/powers/ — no SVG strip assets.
 * Files: offering-{deityId}.png, namaskaram.png, bomb-overlay.png, free-swap.png.
 * Spec: docs/POWER_BOOSTER_PHASES.md Phase 2 (512px, plate #2a1f24).
 * App paths: src/data/offeringPowers.ts
 *
 * This script is a no-op reminder. Do not add generation that overwrites those PNGs
 * without an explicit product decision.
 *
 * npm run icons:powers
 */
import path from 'path';

const root = process.cwd();
const outDir = path.join(root, 'public', 'images', 'powers');

console.log(
  'Power icons: hand-maintained PNGs in',
  path.relative(root, outDir),
  '\nSee docs/POWER_BOOSTER_PHASES.md (Phase 2). Nothing generated.',
);
