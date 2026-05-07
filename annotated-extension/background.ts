import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { generateSemanticTags } from './aiInference';

// Singleton FFmpeg instance — avoids re-loading the WASM binary on every call
let ffmpegInstance: FFmpeg | null = null;

/**
 * initFFmpeg: Lazily loads the WASM binaries from the extension's local assets.
 * Binaries are copied to `assets/` by `scripts/copy-wasm.cjs` at build time.
 */
async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  ffmpegInstance = new FFmpeg();

  // These URLs resolve to the binaries we copied into assets/ at build time.
  // chrome.runtime.getURL ensures the correct extension-internal URL.
  await ffmpegInstance.load({
    coreURL: chrome.runtime.getURL('assets/ffmpeg-core.js'),
    wasmURL: chrome.runtime.getURL('assets/ffmpeg-core.wasm'),
    // workerURL not needed — @ffmpeg/core v0.12 inlines the worker
  });

  console.log('[background] ✅ FFmpeg WASM loaded successfully');
  return ffmpegInstance;
}

/**
 * compressVideoBlob: Converts raw WebM blob → compressed H.264 MP4 at 240p
 * Space complexity: O(1) — WASM virtual files are explicitly deleted after use
 */
export const compressVideoBlob = async (videoBlob: Blob): Promise<Uint8Array | null> => {
  const inputName = 'input.webm';
  const outputName = 'output.mp4';

  try {
    const ff = await initFFmpeg();
    
    // Write the raw blob into WASM's virtual file system (MEMFS)
    await ff.writeFile(inputName, await fetchFile(videoBlob));

    // Compression pipeline:
    // -vf scale=-2:240  → Proportional scale to 240p height
    // -c:v libx264      → H.264 codec for maximum compatibility
    // -preset veryfast  → Optimised for client-side CPU constraints
    // -crf 28           → High compression ratio (lower = better quality)
    // -t 90             → Hard cap at 90 seconds
    await ff.exec([
      '-i', inputName,
      '-vf', 'scale=-2:240',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-t', '90',
      outputName,
    ]);

    // Extract compressed file from WASM memory
    const compressedData = await ff.readFile(outputName);

    return compressedData as Uint8Array;

  } catch (error) {
    console.error('[background] ❌ WASM Compression Pipeline Failed:', error);
    return null;
  } finally {
    // CRITICAL: Explicit MEMFS garbage collection.
    // WASM does NOT auto-collect virtual files — failing to delete causes memory leaks.
    try {
      await ffmpegInstance?.deleteFile(inputName);
      await ffmpegInstance?.deleteFile(outputName);
    } catch { /* files may not have been created if error occurred early */ }
  }
};

// === Chrome Side Panel ===
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error('[background] sidePanel error:', err));

// === Message Dispatcher ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Route 1: Text/audio clip from content script
  if (message.type === 'CLIPPED_MEDIA') {
    chrome.storage.local.set({ currentClip: message.data });
    chrome.runtime.sendMessage({ type: 'UPDATE_SIDEBAR', data: message.data });
  }

  // Route 2: Raw video buffer → WASM compress → update sidebar
  if (message.type === 'COMPRESS_VIDEO') {
    console.log('[background] Received raw video, starting WASM pipeline...');

    // Notify sidebar that compression is underway
    chrome.runtime.sendMessage({
      type: 'UPDATE_SIDEBAR',
      data: {
        type: 'video',
        content: 'Compressing video locally via WASM...',
        sourceUrl: message.data.sourceUrl,
        sourceTitle: message.data.sourceTitle,
      },
    });

    (async () => {
      const uint8Array = new Uint8Array(message.data.buffer);
      const blob = new Blob([uint8Array], { type: 'video/webm' });
      const compressed = await compressVideoBlob(blob);

      if (!compressed) {
        chrome.runtime.sendMessage({
          type: 'UPDATE_SIDEBAR',
          data: { content: 'Compression failed.', type: 'error', sourceUrl: message.data.sourceUrl },
        });
        return;
      }

      // Convert to base64 data URI for the sidebar preview
      const base64 = btoa(String.fromCharCode(...new Uint8Array(compressed.buffer)));
      const dataUri = `data:video/mp4;base64,${base64}`;

      const clipPayload = {
        type: 'video',
        content: 'Compressed Clip (240p)',
        sourceUrl: message.data.sourceUrl,
        sourceTitle: message.data.sourceTitle,
        videoDataUri: dataUri,
        compressedBytes: compressed,
      };

      chrome.storage.local.set({ currentClip: clipPayload });
      chrome.runtime.sendMessage({ type: 'UPDATE_SIDEBAR', data: clipPayload });
    })().catch(console.error);

    return true; // Keep message channel open for async
  }

  // Route 3: AI semantic tagging
  if (message.type === 'GENERATE_TAGS') {
    generateSemanticTags(message.commentary, message.sourceText)
      .then(tags => sendResponse({ tags }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});
