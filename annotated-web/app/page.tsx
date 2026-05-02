import Link from "next/link";
import CommunityFeed from "@/components/CommunityFeed";

export default function Home() {
  // In a real app, you would fetch this from Supabase Auth or a session
  // Using a dummy UUID for demonstration of the feed component
  const dummyUserId = "00000000-0000-0000-0000-000000000000";

  return (
    <main className="min-h-screen flex flex-col items-center p-8 text-center bg-[#0B0B0B]">
      <section className="py-20">
        <h1 className="text-6xl font-bold font-poppins mb-6 bg-gradient-to-r from-[#9126EF] to-[#32CD32] bg-clip-text text-transparent">
          Annotated
        </h1>
        <p className="text-xl text-gray-400 font-inter max-w-lg mb-12 mx-auto">
          The social layer for web media. Capture, compress, and share insights with the world.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="bg-[#9126EF] hover:bg-[#7a1fd1] text-white px-8 py-3 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(145,38,239,0.4)]">
            Download Extension
          </button>
          <button className="border border-gray-700 hover:border-[#32CD32] px-8 py-3 rounded-full font-bold transition-all">
            Explore Global Feed
          </button>
        </div>
      </section>

      <section className="w-full max-w-4xl border-t border-gray-800 pt-16">
        <h2 className="text-3xl font-poppins font-bold mb-8 text-white">Your Community Feed</h2>
        {/* Pass the logged-in user ID here */}
        <CommunityFeed currentUserId={dummyUserId} />
      </section>
    </main>
  );
}
