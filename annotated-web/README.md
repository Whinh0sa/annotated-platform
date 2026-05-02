# Annotated Web Platform 🌐

The social backbone of the Annotated ecosystem. A high-performance, viral-optimized web platform for viewing and sharing media insights.

## 🛠️ Tech Stack
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Infrastructure**: Vercel-ready with Server-Side Rendering (SSR)

## ✨ Core Features
- **Virality Engine**: Dynamic Open Graph and Twitter Player Card generation at $O(1)$ speed. Links shared on 𝕏 render a native media player for maximum engagement.
- **Community Feed**: A paginated, social-graph-aware feed powered by a PostgreSQL B-Tree traversal RPC. Optimized for $O(K)$ space/time complexity.
- **Deep Obsidian Theme**: A premium dark-mode aesthetic with Neon Lime accents and glassmorphic components.
- **Fair Use Governance**: Built-in reporting and claim filing system to satisfy legal compliance requirements.

## 🚀 Performance Engineering
The platform uses **Server-Side Rendering (SSR)** to ensure that Time to First Byte (TTFB) is minimized and search engine crawlers receive a fully hydrated document. This is critical for link unfurling on platforms like LinkedIn and X.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase Project with `annotations` and `users` tables.

### Setup
1. Clone the repo.
2. Run `npm install`.
3. Configure `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---
*Built for the Annotated $5K Bounty Challenge.*
