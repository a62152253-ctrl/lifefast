# LifeFast

LifeFast is a personal productivity dashboard built with React, Vite, Firebase and Gemini. It combines tasks, budget, habits, calendar, notes and lightweight AI assistance into one fast web app.

## Stack

- React 19 + Vite 6
- TypeScript
- Firebase Auth + Firestore
- Tailwind CSS 4
- Gemini via `@google/genai`

## Local development

Prerequisites: Node.js 20+ and npm.

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` or update `.env`
3. Set at minimum:
   `GEMINI_API_KEY`
4. Optional but recommended for real deployments:
   set all `VITE_FIREBASE_*` variables to your own Firebase project
5. Start the dev server:
   `npm run dev`

## Scripts

- `npm run dev` - local development server
- `npm run typecheck` - TypeScript validation
- `npm run lint` - current static validation alias
- `npm run build` - production build
- `npm run preview` - preview built app
- `npm run clean` - remove `dist`

## Deployment notes

- The app can run with the built-in fallback Firebase config, but production deployments should use your own `VITE_FIREBASE_*` values.
- `VITE_DISABLE_AUTH=true` is meant only for local UI work and should stay off in production.
- Build artifacts are generated into `dist/`.
