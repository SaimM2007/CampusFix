# Developer packet — CampusFix frontend

## Goal
A polished but functional Voltera-inspired **original** dashboard: charcoal/dark neutral background, warm orange accent, restrained typography, clear status and data labels. Avoid copying branded artwork. Use Next.js App Router, Tailwind, shadcn/ui, Recharts, Lucide.

## Setup
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app
cd frontend
npx shadcn@latest init
npm install recharts lucide-react
npm run dev
```

## Screens
1. Overview: purchased kWh, charges, meter count, investigation candidates, data coverage warning.
2. Sites: searchable/sortable table, fiscal year and campus filters.
3. Investigations: candidate list with transparent rule, severity as review priority (not verified fault).
4. Case detail: measured bill history chart, source rows, evidence, browser run timeline, report, approve/assign action.
5. Reports: printable report with provenance, uncertainty and next actions.

## Integration
Use `/api` contract in `00_START_HERE.md`. Create `lib/api.ts` adapter and local fixture JSON that mirrors exactly the API shapes. When backend available, swap base URL via `NEXT_PUBLIC_API_BASE_URL` (never put secret keys in NEXT_PUBLIC). Handle loading, empty, failed states; disable buttons that aren't connected to actual functionality.

## UI and accessibility
Dark theme, clear 1 primary CTA per screen, chart labels with units, keyboard navigation, focus rings, contrast, responsive layout, plain-language caveats. Real data should replace mock fixtures before demo. Mark any fixture as DEMO DATA.

## Deliverables
Working Next.js app, screenshots, documented setup, integration checklist. At least one five-minute test with a real attendee and note what changed. No fake functional buttons.
