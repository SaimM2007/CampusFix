# Developer packet — Browserbase + Stagehand

## Goal
Build **one live, multi-step** public-site research workflow for a selected Rutgers utility investigation. Browserbase cloud browser + Stagehand act/observe/extract; not decorative scraping. Save session replay and structured evidence.

## Credential caution
The onboarding text pasted into chat exposed a live Browserbase key: **rotate it now** at https://browserbase.com/settings . Never put a real key in a repo, chat, or screenshots. Current onboarding says `BROWSERBASE_API_KEY` alone resolves the project in browse CLI/Stagehand v4; **no project ID is required for that setup**. Older SDK examples may differ; follow current v4 docs. Free tier is limited; avoid running canned demos.

## Verify without consuming a browser session
Check `node --version` and `browse --version`; install CLI only if missing (`npm install -g browse@latest`). In PowerShell, put the rotated key in local environment or .env (gitignored), then `browse cloud projects list`. This checks access without opening Chrome. Do not paste CLI output containing secrets.

## Implementation
Read https://docs.stagehand.dev/llms.txt and current v4 setup before coding. Use `@browserbasehq/stagehand` and current Browserbase SDK instructions. Use Model Gateway on free tier if supported, leaving placeholder MODEL_API_KEY/OPENAI_API_KEY blank; monitor token cap. Use short sessions and cache supported stable steps.

## Suggested real workflow
Input: {site, meter_id, fiscal_year, anomaly_summary}. Browser agent visits a public Rutgers Climate Action dashboard and/or a public NJ energy interactive data site, navigates actual UI controls, selects a relevant region/timeframe if available, extracts context and links to original evidence, optionally exports a public report if site supports it. If navigation fails, capture observed page state and return error; do not fabricate values. Record sources as **context_only** unless genuinely comparable to meter bill period/geography/units.

Potential sites to verify manually before running: https://climateaction.rutgers.edu/dashboard/ and https://njenergydata.rutgers.edu/electricity/ . These are candidates, not guaranteed automation targets. If site has no useful interactive UI, pick another legitimate public climate/energy portal; document why it needs a browser rather than an API.

## Output JSON
```json
{"run_id":"...","status":"completed|needs_review|failed","session_url":"...","steps":[{"action":"...","outcome":"..."}],"evidence":[{"title":"...","source_url":"https://...","retrieved_at":"ISO time","observed_value":null,"units":null,"relevance":"comparable|context_only","notes":"..."}],"error":null}
```

## Deliverables
`browser-agent/` runnable TypeScript code, `.env.example` (no secrets), README with run command, sample JSON, one genuine session replay link, failure-mode screenshot or logs if possible. Do **not** submit a real work order or post to university systems without authorization. A prepared draft for human review is fine.

## Acceptance
From a case input, visibly navigate at least 2 UI steps, extract evidence with URLs, return JSON, and handle unexpected page content.
