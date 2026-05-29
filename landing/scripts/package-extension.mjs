// Zips the built extension (extension/dist) into the landing site's public
// folder so the Download button serves a real, current build. Cross-platform
// (runs locally on Windows and on Netlify's Linux builders).
//
// Run via the repo-root script:  pnpm package:extension
// (which builds the extension first, then invokes this).

import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const distDir = resolve(repoRoot, 'extension', 'dist');
const outDir = resolve(repoRoot, 'landing', 'public');
const outFile = resolve(outDir, 'interviewary-extension.zip');

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  console.error(
    `\n✗ Extension build not found at ${distDir}\n` +
      `  Build the extension first:  pnpm --filter @interview-copilot/extension build\n` +
      `  (or just run:  pnpm package:extension)\n`,
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const output = createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const kb = (archive.pointer() / 1024).toFixed(0);
  console.log(`✓ Packaged extension → landing/public/interviewary-extension.zip (${kb} KB)`);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') console.warn(err);
  else throw err;
});
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
// Place the build under a named folder inside the zip so it extracts to a
// single, clearly-named directory the user points "Load unpacked" at.
archive.directory(distDir, 'interviewary-extension');
await archive.finalize();
