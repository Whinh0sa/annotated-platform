// Simplified background script (no WASM)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received:", message);
  if (message.type === "START_CAPTURE") {
    // Basic capture logic without FFmpeg for the manual demo
    sendResponse({ ok: true });
  }
  return true;
});
