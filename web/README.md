# Nodeframe — web app

The marketing site and operator dashboard for [Nodeframe](../readme.md), a
modular sensor platform. Next.js 16 (App Router), TypeScript, Tailwind v4,
React 19.

```bash
npm install
npm run dev
```

- `http://localhost:3000` — marketing landing page
- `http://localhost:3000/dashboard` — operator console

`npm run build && npm run start` runs the production build. See the
[repo root README](../readme.md) for the project's architecture, plugin
manifest spec, and backend setup — this file only covers the web app itself.

Fonts (Archivo, IBM Plex Sans, IBM Plex Mono) are self-hosted via
`@fontsource`, so there's no build- or run-time dependency on Google's font
CDN. The dashboard fetches live data from Supabase via `lib/data.ts` and falls back
to `lib/seed-data.json` if credentials aren't provided. See [`.env.example`](.env.example)
for setup details. No UI components are directly coupled to the database.

## AI Insights (local, via Ollama)

The dashboard's **AI Insights** panel (`components/dashboard/AIInsights.tsx`
→ `app/api/insights/route.ts`) reads live module state and writes
plain-English maintenance insights ("running hot," "sustained unusual
noise") using a locally hosted [Ollama](https://ollama.com) model — no API
key, no external network call. See [`.env.example`](.env.example) for the
two optional env vars (`OLLAMA_HOST`, `OLLAMA_MODEL`); the defaults match a
stock local Ollama install. If Ollama isn't running, the route falls back to
a deterministic rule-based generator (`lib/ai/heuristic.ts`) automatically —
the panel always shows something, it just labels its source accordingly.
