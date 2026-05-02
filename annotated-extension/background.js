// WebAssembly Integration: Assuming these are bundled or accessible in the MV3 environment
import { FFmpeg } from '@ffmpeg/ffmpeg';
// import { fetchFile } from '@ffmpeg/util'; // Unused in this specific pipeline but standard in setup

let ffmpeg = null;

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// Initialize FFmpeg WASM Instance
async function initFFmpeg() {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    
    // In a real build, these point to locally packaged WASM files to comply with MV3
    await ffmpeg.load({
        coreURL: chrome.runtime.getURL('ffmpeg-core.js'),
        wasmURL: chrome.runtime.getURL('ffmpeg-core.wasm'),
        workerURL: chrome.runtime.getURL('ffmpeg-core.worker.js')
    });
    
    return ffmpeg;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CLIPPED_MEDIA') {
        chrome.storage.local.set({ currentClip: message.data });
        chrome.runtime.sendMessage({ type: 'UPDATE_SIDEBAR', data: message.data });
    }
    
    if (message.type === 'COMPRESS_VIDEO') {
        console.log("Received raw video stream, spinning up WebAssembly pipeline...");
        
        // Notify sidebar that compression is starting
        chrome.runtime.sendMessage({ 
            type: 'UPDATE_SIDEBAR', 
            data: {
                type: 'video',
                content: 'Compressing video locally via WASM...',
                sourceUrl: message.data.sourceUrl,
                sourceTitle: message.data.sourceTitle
            } 
        });

        executeCompressionPipeline(message.data).catch(console.error);
        return true; 
    }
});

// The Compression Algorithm & Memory Safety
async function executeCompressionPipeline(data) {
    let inputName = 'input.webm';
    let outputName = 'output.mp4';
    let outputData = null;

    try {
        const ff = await initFFmpeg();
        
        // Deserialize back into Uint8Array
        const uint8Array = new Uint8Array(data.buffer);
        
        // Write file into FFmpeg's virtual memory file system (MEMFS)
        await ff.writeFile(inputName, uint8Array);
        
        console.log('Executing local FFmpeg compression algorithm...');
        
        // The exact compression algorithm
        // -vf scale=-2:240 scales the height to 240px and keeps aspect ratio
        await ff.exec([
            '-i', inputName,
            '-vf', 'scale=-2:240',
            '-c:v', 'libx264',
            '-preset', 'veryfast',  // Fast encoding
            '-crf', '28',           // High compression factor to protect margins
            outputName
        ]);
        
        // Read the processed, compressed MP4 back from WASM memory
        outputData = await ff.readFile(outputName);
        console.log('Video compression succeeded!');

        // Format to Data URL for the sidebar preview or storage
        const base64Data = bufferToBase64(outputData);
        const dataUri = `data:video/mp4;base64,${base64Data}`;

        const clipPayload = {
            type: 'video',
            content: 'Compressed Clip (< 480p)',
            sourceUrl: data.sourceUrl,
            sourceTitle: data.sourceTitle,
            videoDataUri: dataUri 
        };

        chrome.storage.local.set({ currentClip: clipPayload });
        chrome.runtime.sendMessage({ type: 'UPDATE_SIDEBAR', data: clipPayload });

    } catch (error) {
        console.error('WASM Pipeline Error:', error);
        chrome.runtime.sendMessage({ 
            type: 'UPDATE_SIDEBAR', 
            data: { content: 'Video compression failed.', type: 'error', sourceUrl: data.sourceUrl } 
        });
    } finally {
        // MEMORY SAFETY: Explicit Garbage Collection
        // WebAssembly does not automatically garbage collect MEMFS.
        // Failing to delete files here WILL cause a browser tab memory leak and crash.
        if (ffmpeg) {
            try {
                await ffmpeg.deleteFile(inputName);
                await ffmpeg.deleteFile(outputName);
            } catch (e) {
                // Ignore if files weren't created
            }
        }
        
        // Nullify large buffers to hint to JS garbage collector
        data.buffer = null;
        outputData = null;
    }
}

// Utility to convert WASM buffer to base64
function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
