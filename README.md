# AuditIQ — SEO & Landing Page Audit Dashboard

AI-powered SEO and landing page analysis. Built with Next.js 15, deployable to Vercel in minutes.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
AI_PROVIDER=anthropic
```

Get a key at https://console.anthropic.com

To use OpenAI instead:
```
OPENAI_API_KEY=sk-your-key-here
AI_PROVIDER=openai
```

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000

## Deploy to Vercel

1. Push this folder contents (not a subfolder) to GitHub
2. Import at vercel.com
3. Add environment variables in Vercel dashboard → Settings → Environment Variables:
   - `ANTHROPIC_API_KEY` = your key
   - `AI_PROVIDER` = `anthropic`
4. Deploy

**Important:** When pushing to GitHub, make sure `package.json` is at the ROOT of your repo, not inside a subfolder.

## Structure
```
src/
  app/
    api/audit/route.ts   — API endpoint
    page.tsx             — Full dashboard UI
    layout.tsx           — Root layout
    globals.css          — Styles
  lib/
    ai.ts                — Anthropic / OpenAI abstraction
    prompt.ts            — Audit prompt builder
    pdfExport.ts         — PDF export
    storage.ts           — localStorage utilities
    types.ts             — TypeScript types
```
