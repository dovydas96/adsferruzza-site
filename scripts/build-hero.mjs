import sharp from 'sharp';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const input = resolve(root, 'images', 'family-hero.jpg');
const outDir = resolve(root, 'images');

const sizes = [700, 1400];

async function run() {
  if (!existsSync(input)) {
    console.error('Input not found:', input);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });

  for (const w of sizes) {
    const jpgOut = resolve(outDir, `family-hero-${w}.jpg`);
    const webpOut = resolve(outDir, `family-hero-${w}.webp`);
    await sharp(input)
      .resize({ width: w, withoutEnlargement: true })
      .jpeg({ quality: w === 700 ? 82 : 80, chromaSubsampling: '4:4:4' })
      .toFile(jpgOut);
    await sharp(input)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: w === 700 ? 80 : 78 })
      .toFile(webpOut);
    console.log('Wrote', jpgOut);
    console.log('Wrote', webpOut);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
