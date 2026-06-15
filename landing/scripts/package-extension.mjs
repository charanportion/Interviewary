// Builds the extension once per edition and zips each into the landing site's
// public folder, so the post-checkout success page can serve the right build:
//   - lifetime     → interviewary-lifetime.zip      (BYOK + credits)
//   - subscription → interviewary-subscription.zip  (credits only, no BYOK)
//
// The edition is passed to Vite via VITE_EDITION (read by extension/src/lib/edition.ts).
// Cross-platform (Windows local + Linux CI). Run via the repo-root script:
//   pnpm package:extension

import { execSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const distDir = resolve(repoRoot, 'extension', 'dist');
const outDir = resolve(repoRoot, 'landing', 'public');

const EDITIONS = ['lifetime', 'subscription'];

mkdirSync(outDir, { recursive: true });

function zipDist(outFile, folderName) {
  return new Promise((resolvePromise, rejectPromise) => {
    const output = createWriteStream(outFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', () => resolvePromise(archive.pointer()));
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') console.warn(err);
      else rejectPromise(err);
    });
    archive.on('error', rejectPromise);
    archive.pipe(output);
    // Single, clearly-named folder inside the zip for "Load unpacked".
    archive.directory(distDir, folderName);
    archive.finalize();
  });
}

for (const edition of EDITIONS) {
  console.log(`\n▸ Building extension (${edition})…`);
  execSync('pnpm --filter @interview-copilot/extension build', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, VITE_EDITION: edition },
  });

  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    console.error(`\n✗ Extension build produced no dist at ${distDir}`);
    process.exit(1);
  }

  const outFile = resolve(outDir, `interviewary-${edition}.zip`);
  const bytes = await zipDist(outFile, `interviewary-${edition}`);
  console.log(`✓ Packaged ${edition} → landing/public/interviewary-${edition}.zip (${(bytes / 1024).toFixed(0)} KB)`);
}

console.log('\n✓ Both editions packaged.');
