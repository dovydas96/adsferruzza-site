import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function run() {
  const srcArg = process.argv[2];
  if (!srcArg) {
    console.error('Usage: node scripts/import-hero.mjs <source-image-path>');
    process.exit(1);
  }
  const source = resolve(srcArg);
  const outDir = resolve(root, 'images');
  const outJpg = resolve(outDir, 'family-hero.jpg');

  mkdirSync(outDir, { recursive: true });

  // Normalize to a web-friendly base JPG around 2000px wide
  await sharp(source)
    .resize({ width: 2000, withoutEnlargement: true })
    .jpeg({ quality: 85, chromaSubsampling: '4:4:4' })
    .toFile(outJpg);

  console.log('Imported hero to', outJpg);
}

run().catch((e) => { console.error(e); process.exit(1); });
