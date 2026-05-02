import { useExtensionAuth } from "./useAuth"
import React, { useState, useEffect } from "react"
import { publishAnnotation } from "./publish"
import "./sidebar.css"

export default function SidebarUI() {
  const { session, signInWithProvider, signOut } = useExtensionAuth()
  const [commentary, setCommentary] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [currentClip, setCurrentClip] = useState<any>(null)

  useEffect(() => {
    // Listen for clips from background/content scripts
    const listener = (message: any) => {
      if (message.type === 'UPDATE_SIDEBAR') {
        setCurrentClip(message.data)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    
    // Check initial storage
    chrome.storage.local.get(['currentClip'], (res: { currentClip?: any }) => {
      if (res.currentClip) setCurrentClip(res.currentClip)
    })

    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const handlePublish = async () => {
    if (!session || !currentClip) return

    setIsPublishing(true)
    
    // Mocking the compressed media Uint8Array for the demo
    // In production, this comes from the WASM background process
    const mockMedia = new Uint8Array([0, 1, 2, 3]) 

    try {
      const result = await publishAnnotation(
        session.user.id,
        mockMedia,
        currentClip.sourceUrl || "https://example.com",
        commentary,
        currentClip.type === 'video' ? 'video' : 'text' as any
      )

      if (result.success) {
        setIsSuccess(true)
        setCommentary("")
        // Clear clip after success
        chrome.storage.local.remove(['currentClip'])
        setTimeout(() => {
            setIsPublishing(false)
            setIsSuccess(false)
            setCurrentClip(null)
        }, 3000)
      } else {
        alert("Failed to publish: " + (result.error as Error).message)
        setIsPublishing(false)
      }
    } catch (err) {
      console.error(err)
      setIsPublishing(false)
    }
  }

  if (!session) {
    return (
      <div className="app-container">
        <header className="glass-header">
            <h1>Annotated</h1>
        </header>
        <main>
          <section className="glass-panel" style={{ textAlign: 'center', marginTop: '40px' }}>
            <h2>Authenticate</h2>
            <p className="placeholder-text" style={{ marginBottom: '20px' }}>Join the community to clip and share.</p>
            <div className="auth-buttons" style={{ flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => signInWithProvider('twitter')} className="btn btn-x" style={{ padding: '12px' }}>
                Login with 𝕏
              </button>
              <button onClick={() => signInWithProvider('google')} className="btn btn-google" style={{ padding: '12px' }}>
                Login with Google
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-container">
      {isPublishing && (
        <div className="publishing-overlay">
          {!isSuccess ? (
            <>
              <div className="publishing-title">Encrypting & Uploading...</div>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: '60%', transition: 'width 2s ease-in-out' }}></div>
              </div>
            </>
          ) : (
            <div className="success-state">
              <div className="success-icon">✔️</div>
              <div className="publishing-title">Published Successfully!</div>
              <div className="share-link">View on Community Feed ↗</div>
            </div>
          )}
        </div>
      )}

      <header className="glass-header">
          <h1>Annotated</h1>
          <button onClick={signOut} className="btn-text" style={{ color: 'var(--text-secondary)' }}>Disconnect</button>
      </header>
      
      <main>
        <section className="clip-section">
          <h2>Welcome, {session.user?.user_metadata?.full_name || 'Annotator'}</h2>
          <div className="clip-box glass-panel" id="clipBox">
              {currentClip ? (
                  <>
                    <div>{currentClip.type === 'text' ? `"${currentClip.content}"` : `🎬 ${currentClip.content}`}</div>
                    <a href={currentClip.sourceUrl} className="source" target="_blank">🔗 {currentClip.sourceTitle || 'Source'}</a>
                  </>
              ) : (
                <p className="placeholder-text">Highlight text or right-click media on any page to clip it.</p>
              )}
          </div>
        </section>

        <section className="annotation-section">
            <h2>Add Commentary</h2>
            <textarea 
                className="glass-input" 
                value={commentary}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentary(e.target.value)}
                placeholder="Share your thoughts..."
            ></textarea>
            <div className="action-row">
                <button className="btn btn-record" id="recordBtn" title="Record Audio">🎤</button>
                <button 
                    className="btn btn-primary" 
                    onClick={handlePublish}
                    disabled={!currentClip || !commentary}
                >
                    Post Annotation
                </button>
            </div>
        </section>

        <section className="feed-section">
            <div className="feed-header">
                <h2>Community Feed</h2>
                <button className="btn-text">Refresh</button>
            </div>
            <div className="feed-list" id="feedList">
                <div className="feed-item glass-panel">
                    <div className="feed-user">@jason</div>
                    <div className="feed-clip">"The future of AI is agentic. It's not just about chat."</div>
                    <div className="feed-comment">Exactly what I was saying on the pod last week!</div>
                    <div className="feed-meta">
                        <a href="#" className="source-link">techcrunch.com</a>
                        <button className="btn-claim">File a claim</button>
                    </div>
                </div>
            </div>
        </section>
      </main>
    </div>
  )
}
