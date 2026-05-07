/**
 * scripts/copy-wasm.cjs
 * Pre-build script: copies FFmpeg WASM binaries from node_modules
 * into the `assets/` folder so Plasmo bundles them into the extension.
 *
 * Uses CommonJS (.cjs) so it runs without transpilation under "type":"module".
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const DEST_DIR = path.resolve(__dirname, '..', 'assets');

const FILES = [
  'ffmpeg-core.js',
  'ffmpeg-core.wasm',
  // Note: @ffmpeg/core v0.12 inlines the worker into ffmpeg-core.js
  // No separate worker file is needed.
];

// Create destination directory if it doesn't exist
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  console.log('[copy-wasm] Created assets/ directory');
}

let allCopied = true;

for (const file of FILES) {
  const src = path.join(SRC_DIR, file);
  const dest = path.join(DEST_DIR, file);

  if (!fs.existsSync(src)) {
    console.error(`[copy-wasm] ❌ Source not found: ${src}`);
    console.error(`[copy-wasm]    Run "npm install" first to download @ffmpeg/core`);
    allCopied = false;
    continue;
  }

  fs.copyFileSync(src, dest);
  const size = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(`[copy-wasm] ✅ Copied ${file} → assets/${file} (${size} KB)`);
}

if (allCopied) {
  console.log('[copy-wasm] 🚀 All WASM binaries ready. Build can proceed.');
} else {
  console.warn('[copy-wasm] ⚠️  Some files were missing. FFmpeg will fail at runtime.');
  process.exit(1); // Fail the build so the error is visible
}
