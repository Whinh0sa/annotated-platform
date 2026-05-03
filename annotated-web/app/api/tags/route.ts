import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const MAX_CHAR_LIMIT = 2000;

export async function POST(req: Request) {
  try {
    // 1. Authentication Gate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization Header' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Payload Validation
    const { commentaryText, sourceText } = await req.json();
    const totalLength = (commentaryText?.length || 0) + (sourceText?.length || 0);

    if (totalLength > MAX_CHAR_LIMIT) {
      return NextResponse.json({ error: 'Payload Too Large' }, { status: 413 });
    }

    if (!commentaryText) {
      return NextResponse.json({ error: 'Commentary text is required' }, { status: 400 });
    }

    // 3. Inference Execution (GPT-4o-mini for Margin Protection)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a semantic tagging engine. Return ONLY a strict JSON array of 3-5 tags. Example: ["tech", "ai", "web"]'
          },
          {
            role: 'user',
            content: `Source: ${sourceText}\nCommentary: ${commentaryText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      })
    });

    const aiData = await response.json();
    const tagsText = aiData.choices[0]?.message?.content || '["general"]';
    
    // Parse and return strict JSON
    try {
      const tags = JSON.parse(tagsText);
      return NextResponse.json({ tags: Array.isArray(tags) ? tags : ["general"] });
    } catch {
      return NextResponse.json({ tags: ["general"] });
    }

  } catch (error: any) {
    console.error('[CLOUD_FALLBACK_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
