# Annotated Extension 🚀

A high-performance Chrome Extension built for the social media age. Capture, compress, and share media insights directly from your browser.

## 🛠️ Tech Stack
- **Framework**: [Plasmo](https://www.plasmo.com/) (Manifest V3)
- **UI**: React & Vanilla CSS (Glassmorphic Design)
- **Processing**: FFmpeg WebAssembly (WASM) for client-side video compression
- **Backend**: Supabase (Auth & Storage)

## ✨ Core Features
- **Intelligent Capture**: Intercepts active `<video>` tags using the `MediaRecorder` API without CORS interference.
- **Local Compression**: Downscales video to 240p locally using WASM. This protects server bandwidth and ensures instant uploads.
- **Native Auth**: Uses `chrome.identity` for a seamless login experience via Google/X without leaving the sidebar.
- **Collision-Resistant Storage**: Media is hashed and pushed to Supabase with strict RLS security policies.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase Project

### Installation
1. Clone the repo.
2. Run `npm install`.
3. Create a `.env.local` file:
   ```env
   PLASMO_PUBLIC_SUPABASE_URL=your_project_url
   PLASMO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Load the `build/chrome-mv3-dev` folder into Chrome.

## 🛡️ Security
This extension follows the principle of least privilege, requiring only `activeTab` and `storage` permissions to operate. All authentication tokens are handled securely via Chrome's native identity provider.

---
*Built for the Annotated $5K Bounty Challenge.*
