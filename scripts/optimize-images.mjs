#!/usr/bin/env node
// Resize & re-encode hero and gallery JPEGs in place using sharp.
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, statSync, readdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const targets = [
  { in: resolve(root, 'images/family-hero.jpg'), out: resolve(root, 'images/family-hero.jpg'), w: 1920, h: 1080, q: 80 },
  { in: resolve(root, 'images/gallery/FD2_3265.jpg'), out: resolve(root, 'images/gallery/FD2_3265.jpg'), w: 1400, h: 1000, q: 80 },
];

for (const t of targets) {
  if (!existsSync(t.in)) { console.log(`Missing: ${t.in}`); continue; }
  const buf = await sharp(t.in)
    .resize({ width: t.w, height: t.h, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: t.q, mozjpeg: true })
    .toBuffer();
  await sharp(buf).toFile(t.out);
  console.log(`Wrote ${t.out}`);
}

console.log('\nOptimized files:');
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (name.toLowerCase().endsWith('.jpg')) console.log(`${s.size.toString().padStart(9)} ${p}`);
  }
}
walk(resolve(root, 'images'));
