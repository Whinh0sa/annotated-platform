/**
 * Module 3A: The Edge Intelligence Engine
 * Handles zero-cost local inference using Chrome's native window.ai (Gemini Nano)
 */

export class LocalInferenceFailed extends Error {
  constructor(public reason: string) {
    super(`Local Inference Failed: ${reason}`);
    this.name = 'LocalInferenceFailed';
  }
}

/**
 * Feature Detection: Checks if the native AI engine is available
 */
export async function checkAIReady(): Promise<boolean> {
  // In a Service Worker, `window` is undefined. The Prompt API is exposed as
  // the global `ai` object directly, not `window.ai`.
  try {
    const aiGlobal = (globalThis as any).ai;
    if (!aiGlobal) return false;
    const status = await aiGlobal.canCreateTextSession();
    return status === 'readily';
  } catch {
    return false;
  }
}

/**
 * generateSemanticTags: Uses Gemini Nano to categorize the annotation
 * Complexity: O(1) Space (Sessions are destroyed immediately)
 */
export async function generateSemanticTags(
  commentaryText: string, 
  sourceText: string
): Promise<string[]> {
  let session: AIInferenceSession | null = null;
  
  try {
    const isReady = await checkAIReady();
    if (!isReady) {
      throw new LocalInferenceFailed('NATIVE_MODEL_UNAVAILABLE');
    }

    session = await window.ai.createTextSession();
    
    const prompt = `
      You are a semantic tagging engine for a social media annotation platform.
      
      SOURCE MATERIAL: "${sourceText.substring(0, 500)}"
      USER COMMENTARY: "${commentaryText}"
      
      INSTRUCTION: Based on the source and commentary, return 3-5 highly relevant metadata tags.
      Format: JSON array of strings only.
      Example: ["technology", "productivity", "webdev"]
    `;

    const response = await session.prompt(prompt);
    
    // Parse response - Gemini Nano might return markdown blocks
    const jsonMatch = response.match(/\[.*\]/s);
    if (!jsonMatch) return ['general'];

    const tags = JSON.parse(jsonMatch[0]);
    return Array.isArray(tags) ? tags.slice(0, 5) : ['general'];

  } catch (err: any) {
    console.warn('[LOCAL_INFERENCE_FAILING] Attempting Cloud Fallback...', err.message);
    
    // Cloud Fallback Logic: Margin Protection in action
    try {
      // Retrieve token from chrome.storage (localStorage is unavailable in Service Workers)
      const token = await new Promise<string>((resolve) => {
        chrome.storage.local.get(['sb-access-token'], (res) => {
          resolve(res['sb-access-token'] || '');
        });
      });

      const response = await fetch('https://annotated-platform.vercel.app/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ commentaryText, sourceText }),
      });

      if (!response.ok) throw new Error(`Cloud API returned ${response.status}`);
      const data = await response.json();
      return data.tags || ['general'];

    } catch (fallbackErr) {
      console.error('[CLOUD_FALLBACK_FAILED]', fallbackErr);
      return ['general']; // Absolute bottom-tier fallback
    }
    
  } finally {
    // Memory & Concurrency: Explicit session destruction
    if (session) {
      session.destroy();
    }
  }
}
