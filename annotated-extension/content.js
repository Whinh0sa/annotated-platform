document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
        chrome.runtime.sendMessage({ 
            type: 'CLIPPED_MEDIA', 
            data: {
                type: 'text',
                content: selectedText,
                sourceUrl: window.location.href,
                sourceTitle: document.title
            } 
        });
    }
});

// Upgraded: Intercept and capture video stream using MediaRecorder API
document.addEventListener('contextmenu', async (e) => {
    if (e.target.tagName === 'VIDEO') {
        // e.preventDefault(); // Uncomment if you want to completely hijack the right-click menu
        const video = e.target;
        
        try {
            // Intercept active HTMLVideoElement stream
            const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
            if (!stream) {
                console.warn('Cannot capture stream from this video element.');
                return;
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            const chunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('Finished capturing video stream.');
                // Create the raw stream Blob
                const blob = new Blob(chunks, { type: 'video/webm' });
                
                // Convert Blob to ArrayBuffer for background transmission
                const arrayBuffer = await blob.arrayBuffer();
                
                // We send it as ArrayBuffer directly (modern Chrome supports this in sendMessage)
                chrome.runtime.sendMessage({
                    type: 'COMPRESS_VIDEO',
                    data: {
                        buffer: Array.from(new Uint8Array(arrayBuffer)), // serialized for reliable extension messaging
                        sourceUrl: window.location.href,
                        sourceTitle: document.title
                    }
                });
            };

            // Start recording
            mediaRecorder.start();
            console.log('Started local media recording of video element...');

            // Cap at 90 seconds maximum per requirements
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 90000);

            // Also stop if video stops playing or pauses
            video.addEventListener('pause', () => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, { once: true });

        } catch (err) {
            console.error('Failed to instantiate MediaRecorder stream:', err);
        }
    } else if (e.target.tagName === 'AUDIO') {
        chrome.runtime.sendMessage({
            type: 'CLIPPED_MEDIA',
            data: {
                type: 'audio',
                content: `[Clipped audio from ${e.target.currentTime.toFixed(1)}s]`,
                sourceUrl: window.location.href,
                sourceTitle: document.title
            }
        });
    }
});
