import { useExtensionAuth } from "./useAuth"
import React, { useState, useEffect, useCallback } from "react"
import { publishAnnotation } from "./publish"
import "./sidebar.css"

// ─── Types ────────────────────────────────────────────────────────────────────

type ClipType = 'text' | 'audio' | 'video' | 'error'

interface Clip {
  type: ClipType
  content: string        // Display text — already plain string, React escapes in JSX
  sourceUrl: string
  sourceTitle: string
  videoDataUri?: string  // base64 data URI from background WASM pipeline
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * sanitizeUrl: Blocks javascript: and data: protocol injection in href attributes.
 * React escapes JSX text content automatically, but href needs explicit validation.
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) return '#'
    return parsed.href
  } catch {
    return '#'
  }
}

/**
 * dataUriToUint8Array: Reconstructs the compressed Uint8Array from the base64
 * data URI that background.ts sends after WASM compression.
 *
 * Why we do it here instead of receiving compressedBytes directly:
 *   chrome.runtime.sendMessage serialises via JSON, which converts Uint8Array
 *   into a plain object {0: val, 1: val, ...} — unusable without reconstruction.
 *   A base64 string survives JSON serialisation perfectly.
 */
function dataUriToUint8Array(dataUri: string): Uint8Array {
  const base64 = dataUri.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SidebarUI() {
  const { session, signInWithProvider, signOut } = useExtensionAuth()
  const [commentary, setCommentary] = useState("")
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [currentClip, setCurrentClip] = useState<Clip | null>(null)

  // ── Message Listener ────────────────────────────────────────────────────────
  useEffect(() => {
    /**
     * Receives UPDATE_SIDEBAR messages from background.ts.
     * The clip object contains either:
     *   - Plain text/audio clips  (no videoDataUri)
     *   - Compressed video clips  (videoDataUri = base64 data URI from WASM pipeline)
     */
    const listener = (message: { type: string; data: Clip }) => {
      if (message.type === 'UPDATE_SIDEBAR') {
        setCurrentClip(message.data)
      }
    }

    chrome.runtime.onMessage.addListener(listener)

    // Hydrate from storage on sidebar open (handles extension reload edge cases)
    chrome.storage.local.get(['currentClip'], (res: { currentClip?: Clip }) => {
      if (res.currentClip) setCurrentClip(res.currentClip)
    })

    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // ── Publish Handler ─────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!session || !currentClip || !commentary.trim()) return
    setIsPublishing(true)

    try {
      let mediaPayload: Uint8Array
      let mediaType: 'video' | 'audio' | 'text' = 'text'

      if (currentClip.type === 'video' && currentClip.videoDataUri) {
        // ✅ Real WASM-compressed payload — reconstruct from the base64 data URI
        mediaPayload = dataUriToUint8Array(currentClip.videoDataUri)
        mediaType = 'video'
      } else if (currentClip.type === 'audio') {
        // Audio annotations: encode commentary text as UTF-8 bytes
        mediaPayload = new TextEncoder().encode(commentary)
        mediaType = 'audio'
      } else {
        // Text annotation: encode the clipped text as UTF-8 bytes
        // This is intentional — text clips still need a media record for RLS consistency
        mediaPayload = new TextEncoder().encode(currentClip.content)
        mediaType = 'text'
      }

      const result = await publishAnnotation(
        session.user.id,
        mediaPayload,
        sanitizeUrl(currentClip.sourceUrl || 'https://example.com'),
        commentary,
        mediaType
      )

      if (result.success) {
        setIsSuccess(true)
        setCommentary("")
        chrome.storage.local.remove(['currentClip'])
        setTimeout(() => {
          setIsPublishing(false)
          setIsSuccess(false)
          setCurrentClip(null)
        }, 3000)
      } else {
        const errMsg = result.error instanceof Error
          ? result.error.message
          : String(result.error)
        alert("Failed to publish: " + errMsg)
        setIsPublishing(false)
      }
    } catch (err) {
      console.error('[sidebar] publish error:', err)
      setIsPublishing(false)
    }
  }, [session, currentClip, commentary])

  // ── Auth Gate ───────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="app-container">
        <header className="glass-header">
          <h1>Annotated</h1>
        </header>
        <main>
          <section className="glass-panel" style={{ textAlign: 'center', marginTop: '40px' }}>
            <h2>Authenticate</h2>
            <p className="placeholder-text" style={{ marginBottom: '20px' }}>
              Join the community to clip and share.
            </p>
            <div className="auth-buttons" style={{ flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => signInWithProvider('twitter')}
                className="btn btn-x"
                style={{ padding: '12px' }}
              >
                Login with 𝕏
              </button>
              <button
                onClick={() => signInWithProvider('google')}
                className="btn btn-google"
                style={{ padding: '12px' }}
              >
                Login with Google
              </button>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ── Main UI ─────────────────────────────────────────────────────────────────
  const isVideoReady = currentClip?.type === 'video' && !!currentClip.videoDataUri
  const canPublish = !!currentClip && !!commentary.trim() && !isPublishing

  return (
    <div className="app-container">

      {/* Publishing Overlay */}
      {isPublishing && (
        <div className="publishing-overlay">
          {!isSuccess ? (
            <>
              <div className="publishing-title">Encrypting &amp; Uploading...</div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{ width: '60%', transition: 'width 2s ease-in-out' }}
                />
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
        <button
          onClick={signOut}
          className="btn-text"
          style={{ color: 'var(--text-secondary)' }}
        >
          Disconnect
        </button>
      </header>

      <main>
        {/* Clip Preview */}
        <section className="clip-section">
          <h2>Welcome, {session.user?.user_metadata?.full_name || 'Annotator'}</h2>
          <div className="clip-box glass-panel" id="clipBox">
            {currentClip ? (
              <>
                {/* ✅ XSS Safe: React renders string content as text nodes, not HTML */}
                {isVideoReady && currentClip.videoDataUri ? (
                  <video
                    src={currentClip.videoDataUri}
                    controls
                    style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }}
                  />
                ) : (
                  <div>
                    {currentClip.type === 'text'
                      ? `"${currentClip.content}"`
                      : `🎬 ${currentClip.content}`}
                  </div>
                )}
                {/* ✅ XSS Safe: sanitizeUrl() blocks javascript: and data: protocol attacks */}
                <a
                  href={sanitizeUrl(currentClip.sourceUrl)}
                  className="source"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🔗 {currentClip.sourceTitle || new URL(sanitizeUrl(currentClip.sourceUrl)).hostname}
                </a>
              </>
            ) : (
              <p className="placeholder-text">
                Highlight text or right-click a video on any page to clip it.
              </p>
            )}
          </div>
        </section>

        {/* Commentary */}
        <section className="annotation-section">
          <h2>Add Commentary</h2>
          <textarea
            className="glass-input"
            value={commentary}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentary(e.target.value)}
            placeholder="Share your thoughts..."
          />
          <div className="action-row">
            <button className="btn btn-record" id="recordBtn" title="Record Audio">🎤</button>
            <button
              className="btn btn-primary"
              onClick={handlePublish}
              disabled={!canPublish}
            >
              {isPublishing ? 'Posting...' : 'Post Annotation'}
            </button>
          </div>
        </section>

        {/* Community Feed */}
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
                <a href="https://techcrunch.com" className="source-link" target="_blank" rel="noopener noreferrer">
                  techcrunch.com
                </a>
                <button className="btn-claim">File a claim</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
