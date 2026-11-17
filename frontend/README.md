# Frontend — Image Generator UI

React + TypeScript + Vite frontend for **Agentic Content Generator**.

## Source Layout

- `src/App.tsx` — Main `ImageGenerator` workspace and client-side routing (`/`, `/api-setup`, `/image-generator`, `/content-generator`)
- `src/components/HomePage.tsx` — Landing page and workspace launcher
- `src/components/ApiKeySetup.tsx` — Upload `.env`/`.txt`/`.json` API key files and select active AI providers
- `src/components/ApiServiceIcon.tsx` — Provider badge/icon registry
- `src/services/templateService.ts` — Template API client & TypeScript types
- `src/types/app.ts` — Shared TypeScript interfaces
- `src/utils/appHelpers.ts` — API URL resolution, social hashtag helpers, and browser session persistence
- `src/App.css` — Workspace, reference library, prompt, and output preview styles

## Scripts

```powershell
npm install       # Install dependencies
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Type-check with tsc -b and build production bundle
npm run preview   # Preview production build
```
