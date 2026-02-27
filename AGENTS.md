# PhotoPro — Monorepo

> **CLAUDE.md** is a symlink to this file.

## Structure

```
photopro/
├── web/             ← React 19 + Vite 7 + TypeScript 5.9 + Bun + Tailwind v4 + shadcn/ui
├── ios/             ← Swift 5.10 + SwiftUI (iOS 17+) + Xcode 16+
├── ALGORITHM.md     ← Canonical algorithm specification (shared between platforms)
├── AGENTS.md        ← This file
└── README.md
```

## Algorithm Sync Rule

**When `ALGORITHM.md` is updated, the corresponding implementation must be updated in both `web/` and `ios/`.** The algorithm file is the single source of truth — platform code must match it.

- Web implementation: `web/src/lib/astronomy/` and `web/src/lib/weather/scoring.ts`
- iOS implementation: `ios/PhotoPro/PhotoPro/Lib/Astronomy/` and `ios/PhotoPro/PhotoPro/Lib/Weather/WeatherScoring.swift`

## Platform Details

Each platform has its own `AGENTS.md` with stack-specific instructions:
- `web/AGENTS.md` — commands, patterns, conventions for the web app
- `ios/AGENTS.md` — commands, patterns, conventions for the iOS app
