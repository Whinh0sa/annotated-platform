import { createClient } from "@supabase/supabase-js"
import { useState, useEffect } from "react"

// Initialize Supabase Client
// Actionable Takeaway: Store these in Plasmo's environment variables (.env.local)
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export const useExtensionAuth = () => {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Check active session on load
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // The Disruptor Native Auth Engine
  const signInWithProvider = async (provider: 'google' | 'twitter') => {
    try {
      const manifest = chrome.runtime.getManifest()
      const extensionId = chrome.runtime.id
      const redirectUrl = `https://${extensionId}.chromiumapp.org/`

      // 1. Ask Supabase for the exact OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true // CRITICAL: Stop Supabase from handling the redirect
        }
      })

      if (error) throw error

      // 2. Launch Chrome's native auth window
      chrome.identity.launchWebAuthFlow({
        url: data.url,
        interactive: true
      }, async (callbackUrl: string | undefined) => {
        if (chrome.runtime.lastError || !callbackUrl) {
          console.error("Auth Flow Interrupted")
          return
        }

        // 3. Extract the session fragments from the callback URL
        const urlObj = new URL(callbackUrl)
        const hashParams = new URLSearchParams(urlObj.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        if (accessToken && refreshToken) {
          // 4. Manually inject the tokens into the Supabase client
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        }
      })

    } catch (err) {
      console.error(`Failed to initialize ${provider} Auth:`, err)
    }
  }

  const signOut = () => supabase.auth.signOut()

  return { session, signInWithProvider, signOut }
}
