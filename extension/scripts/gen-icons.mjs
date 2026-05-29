// Rasterizes the master logo SVG into the PNG sizes Chrome needs for the
// extension (toolbar/management/store). Run: node scripts/gen-icons.mjs
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(here, '..', 'public', 'icons');
const svg = await readFile(join(iconsDir, 'icon.svg'));

for (const size of [16, 32, 48, 128]) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toBuffer();
  await writeFile(join(iconsDir, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png`);
}
