# CampusFix — Integration and Submission Checklist

## Work in parallel NOW
- [ ] Lead creates GitHub issues/assigns owners, confirms branch ownership and common API contracts in `00_START_HERE.md`.
- [ ] Data owner commits Snowflake DDL, loader, a successful count query, and `/api/candidates` sample JSON. Verify CSV columns/units/coverage before implementing SQL.
- [ ] Browser owner commits one Stagehand workflow that **interacts with** a public site (not just a Fetch call), produces source URLs and a session replay; record failed pages without fabricating evidence. Avoid submitting real work orders.
- [ ] Frontend owner commits functional pages with mock API data shaped exactly like the contract; then switches to backend API.
- [ ] Lead implements FastAPI endpoints and integrates real data and browser evidence. Cortex activation is optional until confirmed. Gemini image extraction only after vertical slice works.

## Contract freeze
`GET /api/overview`, `GET /api/sites`, `GET /api/candidates`, `GET /api/investigations/{id}`, `POST /api/investigations/{id}/research`, `POST /api/investigations/{id}/report`, `POST /api/investigations/{id}/approve`. See `00_START_HERE.md` for JSON shapes. Document actual differences in a single PR and notify all owners.

## Required end-to-end demo
1. Show Rutgers purchased electricity data in Snowflake (real query).
2. Select a meter/site and explain the measured period, units, coverage and modeled anomaly.
3. Run browser investigation and show live/replay browser interaction plus evidence URLs.
4. Generate a report from **measured data + verified evidence**; distinguish hypotheses and uncertainties.
5. Human approves or assigns a follow-up; no unauthorized real-world submission.
6. Show a polished responsive UI with errors, loading, and no-data states.

## Safety / honesty
- [ ] No `.env`, API keys, Snowflake password/PAT, or Browserbase tokens committed.
- [ ] Browserbase key pasted into earlier onboarding text was rotated; use the replacement only in local environment.
- [ ] Browserbase project UUID may be retained privately for diagnostics; current CLI/Stagehand onboarding resolves project from API key and does not require an ID.
- [ ] Historical purchased electricity != total campus consumption; cogeneration omissions noted.
- [ ] Measured / modeled / assumed tags visible on findings.
- [ ] Do not call a template response 'Cortex-generated' if Cortex is blocked.
- [ ] README lists what worked, what was mocked, and what remains unverified.

## Deadline
Opening slides: **5:00 PM EST hard submission deadline** (OrganizerHQ). Aim for feature freeze by 4:15 PM and submit early. Submission: https://mlh.link/mt-hacks-fall-2026
