import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Enforce SSR for SEO virality and prevent build crashes
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize server-side Supabase client with safety check
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null as any; // Allow build to pass; runtime will handle missing config if needed


interface PageProps {
  params: { id: string };
}

// 1. The Virality Engine: Dynamic Open Graph Metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: annotation } = await supabase
    .from('annotations')
    .select('*, users(username)')
    .eq('id', params.id)
    .single();

  if (!annotation) return { title: 'Annotation Not Found' };

  return {
    title: `${annotation.users.username}'s Annotation`,
    description: annotation.commentary.substring(0, 150) + '...',
    openGraph: {
      title: `Insight from @${annotation.users.username}`,
      description: annotation.commentary,
      url: `https://annotated.com/annotation/${params.id}`,
      type: 'video.other',
      images: [{ url: annotation.media_url }],
      videos: [{ url: annotation.media_url }] // Forces the video to play inline on some platforms
    },
    twitter: {
      card: 'player', // CRITICAL: Tells 𝕏 to render a media player frame
      title: `Annotation by @${annotation.users.username}`,
      description: annotation.commentary,
      players: [{ playerUrl: annotation.media_url, streamUrl: annotation.media_url, width: 480, height: 240 }]
    }
  };
}

// 2. The Server-Rendered UI
export default async function AnnotationPage({ params }: PageProps) {
  // $O(1)$ B-Tree Index Lookup
  const { data: annotation, error } = await supabase
    .from('annotations')
    .select('*, users(username, avatar_url)')
    .eq('id', params.id)
    .single();

  if (error || !annotation) return notFound();

  return (
    <main className="min-h-screen bg-[#0B0B0B] text-white flex flex-col items-center py-12 px-4">
      <article className="max-w-2xl w-full border border-[#9126EF]/30 rounded-xl p-6 shadow-[0_0_15px_rgba(145,38,239,0.1)] bg-[#121212]/50 backdrop-blur-sm">
        
        {/* Header: Author & Source */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <img src={annotation.users.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + annotation.users.username} alt="Avatar" className="w-10 h-10 rounded-full border border-[#32CD32]" />
            <h1 className="font-poppins font-bold text-xl tracking-wide">
              @{annotation.users.username}
            </h1>
          </div>
          <a href={annotation.source_url} target="_blank" className="font-inter text-sm text-[#9126EF] hover:text-[#32CD32] transition-colors">
            View Original Source ↗
          </a>
        </header>

        {/* Media Payload */}
        <div className="rounded-lg overflow-hidden mb-6 bg-black border border-gray-800">
          <video src={annotation.media_url} controls className="w-full h-auto max-h-[400px] object-contain" />
        </div>

        {/* Commentary */}
        <section className="mb-8">
          <p className="font-inter text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
            {annotation.commentary}
          </p>
        </section>

        {/* Bounty Requirement: File a Claim */}
        <footer className="border-t border-gray-800 pt-4 flex justify-end">
          <button className="font-montserrat text-[10px] text-red-500/70 hover:text-red-500 transition-colors uppercase tracking-[0.2em]">
            ⚠ File a Fair Use Claim
          </button>
        </footer>
      </article>
    </main>
  );
}
