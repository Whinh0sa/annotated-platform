import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

// Actionable Takeaway: Hook directly into the DOM's native MediaStream
export const captureActiveVideo = async (maxSeconds: number = 90): Promise<Blob | null> => {
  const videos = Array.from(document.querySelectorAll('video'));
  const activeVideo = videos.find(v => !v.paused && v.readyState > 2);

  if (!activeVideo) {
    console.error("No active video stream detected.");
    return null;
  }

  // Cast standard HTML element to any to capture its raw stream
  const stream = (activeVideo as any).captureStream ? (activeVideo as any).captureStream() : null;
  
  if (!stream) return null;

  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: BlobPart[] = [];

  return new Promise((resolve) => {
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    
    recorder.start();
    // Enforce the 90-second bounty limit constraint
    setTimeout(() => recorder.stop(), maxSeconds * 1000); 
  });
}

// Listen for the sidebar UI trigger
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_CAPTURE") {
    captureActiveVideo().then(blob => {
      // Send raw blob to Background Worker for WASM compression
      sendResponse({ status: "captured", payload: blob }); 
    });
    return true; 
  }
});
