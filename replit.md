# VORA Smart Mobility

VORA is a Cameroon-first smart mobility app that helps people in Yaoundé find safer, more affordable, and more practical ways to move.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vora-mobile/app/index.tsx` — complete local-first demo flow, navigation state, trip lifecycle, authentication, safety, accessibility, and rating
- `artifacts/vora-mobile/components/MapPanel.tsx` — map/route/tracking visualization
- `artifacts/vora-mobile/components/VoraLogo.tsx` — VORA identity mark and wordmark
- `artifacts/vora-mobile/constants/colors.ts` — VORA deep-blue, vibrant-green, neutral, and danger tokens
- `artifacts/vora-mobile/assets/images/icon.png` — generated VORA app icon
- `attached_assets/VORA_Hackathon_Battle_Plan_1788593180149.md` — product brief and hackathon demo plan

## Architecture decisions

- The first build is local-first and persists profile photo and accessibility settings with AsyncStorage so the complete pitch flow works without an account or external API setup.
- OTP is intentionally demo-friendly, while device GPS permission is requested on native and a safe browser fallback is used on web previews.
- The map is a lightweight Expo-compatible route visualization with simulated driver movement, matching the hackathon plan's recommendation to simulate movement when real GPS is too costly.
- VORA Smart Choice is rules-based: shared rides are recommended when the main benefit is saving 900 FCFA for only 3 extra minutes.

## Product

The app covers splash and phone/OTP/name authentication, Yaoundé landmark search, current-location and destination mapping, route preview with distance/ETA/traffic, transparent fare calculation, VORA Solo/Share/Accessible options, Smart Choice recommendations, driver matching, verified driver and vehicle details, live trip simulation, SOS, live trip sharing, accessibility settings, trip completion, rating, profile photo, saved places, ride history, emergency contact, and logout.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
