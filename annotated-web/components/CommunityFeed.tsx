import { createClient } from '@supabase/supabase-js';

// Server-side initialization
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CommunityFeed({ currentUserId }: { currentUserId: string }) {
  // $O(1)$ Network call executing the $O(K)$ database traversal
  const { data: feedData, error } = await supabase.rpc('get_community_feed', {
    viewer_id: currentUserId,
    page_limit: 20,
    page_offset: 0
  });

  if (error) {
    console.error("Feed Traversal Failed:", error);
    return <div className="text-white font-inter">Failed to load feed.</div>;
  }

  // Actionable Takeaway: Empty states must drive action.
  if (!feedData || (feedData as any[]).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#0B0B0B] border border-[#9126EF]/20 rounded-xl max-w-xl mx-auto mt-10">
        <h3 className="font-poppins text-2xl text-white mb-2">Your Feed is Empty</h3>
        <p className="font-montserrat text-gray-400 mb-6 text-center">Discover the disruptors shaping the future.</p>
        <button className="bg-[#9126EF] text-white font-bold py-2 px-6 rounded hover:bg-[#32CD32] hover:text-black transition-all">
          Explore Global Annotations
        </button>
      </div>
    );
  }

  return (
    <section className="bg-[#0B0B0B] min-h-screen p-4 flex flex-col gap-6 items-center">
      {(feedData as any[]).map((post) => (
        <article key={post.annotation_id} className="w-full max-w-xl bg-black border border-[#222] hover:border-[#32CD32]/50 transition-colors rounded-lg p-5">
          <header className="flex items-center gap-3 mb-4">
            <img src={post.author_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + post.author_username} alt="avatar" className="w-10 h-10 rounded-full border border-[#9126EF]" />
            <div>
              <h2 className="font-poppins text-white font-semibold tracking-wide">@{post.author_username}</h2>
              <span className="font-montserrat text-xs text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </div>
          </header>
          
          <video src={post.media_url} controls className="w-full rounded bg-gray-900 mb-4 max-h-[300px] object-contain" />
          
          <p className="font-inter text-gray-200 text-base leading-relaxed">
            {post.commentary}
          </p>
        </article>
      ))}
    </section>
  );
}
