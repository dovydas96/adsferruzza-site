#!/usr/bin/env node
// Resize a single image to a target width, preserving aspect ratio.
// Usage: node scripts/resize-image.mjs <source> <width> <output> [quality]
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const [, , source, widthStr, output, qualityStr] = process.argv;
if (!source || !widthStr || !output) {
  console.error('Usage: node scripts/resize-image.mjs <source> <width> <output> [quality]');
  process.exit(1);
}
const width = parseInt(widthStr, 10);
const quality = Math.max(1, Math.min(100, parseInt(qualityStr || '85', 10)));

const src = resolve(source);
if (!existsSync(src)) { console.error(`Source file not found: ${src}`); process.exit(1); }
const out = resolve(output);
mkdirSync(dirname(out), { recursive: true });

const info = await sharp(src)
  .resize({ width, withoutEnlargement: true })
  .jpeg({ quality, mozjpeg: true })
  .toFile(out);

console.log(`Saved ${out} (${info.width} x ${info.height}, quality ${quality})`);
