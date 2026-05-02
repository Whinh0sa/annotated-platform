document.addEventListener('DOMContentLoaded', () => {
    const clipBox = document.getElementById('clipBox');
    
    // Check storage on load
    chrome.storage.local.get(['currentClip'], (result) => {
        if (result.currentClip) {
            updateClipDisplay(result.currentClip);
        }
    });

    // Listen for incoming clips
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'UPDATE_SIDEBAR') {
            updateClipDisplay(message.data);
        }
    });

    function updateClipDisplay(data) {
        if (!data) return;
        let contentHtml = `"${data.content}"`;
        if (data.type === 'video' || data.type === 'audio') {
            contentHtml = `🎵 ${data.content}`;
        }
        
        const urlObj = new URL(data.sourceUrl);
        
        clipBox.innerHTML = `
            <div>${contentHtml}</div>
            <a href="${data.sourceUrl}" class="source" target="_blank" title="${data.sourceTitle}">
                🔗 ${urlObj.hostname}
            </a>
        `;
    }

    // Post button interaction
    document.getElementById('postBtn').addEventListener('click', () => {
        const comment = document.getElementById('commentary').value;
        if (!comment) return;
        
        const btn = document.getElementById('postBtn');
        btn.textContent = 'Posting...';
        
        setTimeout(() => {
            btn.textContent = 'Post Annotation';
            document.getElementById('commentary').value = '';
            
            // Add to feed mock
            const feedList = document.getElementById('feedList');
            const newItem = document.createElement('div');
            newItem.className = 'feed-item glass-panel';
            newItem.style.animation = 'fadeIn 0.5s ease-out';
            
            chrome.storage.local.get(['currentClip'], (result) => {
                const clip = result.currentClip || { content: 'General Comment', sourceUrl: '#' };
                const hostname = clip.sourceUrl !== '#' ? new URL(clip.sourceUrl).hostname : 'source';
                
                newItem.innerHTML = `
                    <div class="feed-user">@you</div>
                    <div class="feed-clip">"${clip.content}"</div>
                    <div class="feed-comment">${comment}</div>
                    <div class="feed-meta">
                        <a href="${clip.sourceUrl}" class="source-link" target="_blank">${hostname}</a>
                        <button class="btn-claim">File a claim</button>
                    </div>
                `;
                feedList.insertBefore(newItem, feedList.firstChild);
            });
        }, 800);
    });
});
