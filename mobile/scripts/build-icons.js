/**
 * Renders the SVG icon sources in assets/branding/ to the PNG files Expo expects:
 *   assets/icon.png            (1024x1024 — iOS + universal app icon)
 *   assets/adaptive-icon.png   (1024x1024 — Android adaptive foreground)
 *   assets/splash-icon.png     (1024x1024 — splash screen mark)
 *   assets/favicon.png         (48x48    — web favicon)
 *
 * Re-run this whenever you edit a file under assets/branding/:
 *     node scripts/build-icons.js
 *
 * Then run `npm run prebuild` so the new icons are baked into android/ + ios/.
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const branding = path.join(root, 'assets', 'branding');
const assets = path.join(root, 'assets');

const jobs = [
  { src: 'app-icon.svg',           out: 'icon.png',           size: 1024 },
  { src: 'adaptive-foreground.svg', out: 'adaptive-icon.png',  size: 1024 },
  { src: 'splash-icon.svg',        out: 'splash-icon.png',    size: 1024 },
  { src: 'app-icon.svg',           out: 'favicon.png',        size: 48   },
];

(async () => {
  for (const job of jobs) {
    const src = path.join(branding, job.src);
    const dst = path.join(assets, job.out);
    if (!fs.existsSync(src)) {
      console.warn(`[icons] skipping ${job.src} — file not found`);
      continue;
    }
    await sharp(src, { density: 384 })
      .resize(job.size, job.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(dst);
    console.log(`[icons] wrote ${path.relative(root, dst)} (${job.size}x${job.size})`);
  }
})();
