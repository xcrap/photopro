# PhotoPro - Photographer's Astronomy App

## Tech Stack
- React 19 + Vite 7 + TypeScript 5.9 + Bun 1.3
- shadcn/ui + Tailwind CSS v4 + Zustand 5 + SunCalc + date-fns + lucide-react
- Dark astronomy theme with pastel accents (oklch color space)

## Architecture
- Feature modules in `src/features/` (home, moon, sun, settings)
- Astronomy calculations: pure functions in `src/lib/astronomy/` (8 files)
- Pre-computed data: eclipse/supermoon JSON in `src/data/` (2024-2030)
- Zustand stores with localStorage persistence in `src/stores/`
- GPS-first location with manual fallback

## Key Patterns
- `verbatimModuleSyntax: true` → always use `import type` for type-only imports
- `noUnusedLocals: true` → remove unused imports/variables before build
- shadcn/ui components in `src/components/ui/`, shared components in `src/components/shared/`
- Tailwind v4 with `@tailwindcss/vite` plugin, no config file
- Path alias: `@/` maps to `src/`

## Commands
- `bun run dev` → development server
- `bun run build` → production build (tsc + vite build)
- `bun run lint` → eslint
