# CampusFix — Start Here (Nov 21, 2026)

Repo: https://github.com/SaimM2007/CampusFix (create/verify if not yet created). Main track: Climate Good. Also enter Best Overall and only sponsor tracks with functioning demos. **Submission time conflicts:** opening slides say 5:00 PM; website says 5:30 PM. Treat **5 PM** as hard deadline and verify with organizers. Code during event; planning beforehand allowed.

## What we are making
Rutgers facilities energy analyst chooses a meter/building with an unusual **historical purchased-electricity** trend, reviews the actual bills and data caveats, runs a browser research workflow for contextual evidence, reads a Cortex-written evidence-grounded report, and approves/assigns a follow-up. Optional Gemini reads an image of a synthetic/sample bill and compares extracted fields. No claims of real-time HVAC fault detection.

## Critical path
1. Lead verifies Snowflake SQL and Cortex, creates repo and shared API schema.
2. Data developer loads real CSV and mapping into Snowflake, computes deterministic candidates.
3. Browser developer implements one real Stagehand browser workflow, records replay/evidence/errors. Avoid wasting browser hours on generic demos.
4. Frontend developer builds working dashboard from agreed API contract, with mock JSON until backend is ready.
5. Lead integrates FastAPI and Cortex; then Gemini if time.
6. By ~4:15, freeze features; test complete path, capture 3-minute demo, README, 5–8 slides, submit by 5 PM.

## Current team assignments — all four members present
Assign owners immediately in the group chat. Each person owns one folder and a working deliverable:
- **Member 1 (project lead):** `backend/` FastAPI integration, Cortex trial escalation, environment/config, end-to-end tests, submission.
- **Member 2 (data):** `scripts/`, `data/` (data files only when licensing/size permit), `sql/`: ingest Rutgers electricity + mapping into Snowflake; deterministic anomaly queries and validation.
- **Member 3 (browser):** `browser-agent/`: Browserbase + Stagehand real interactive research, provenance JSON, session replay, failure handling.
- **Member 4 (frontend):** `frontend/`: dark polished dashboard, API integration, accessible controls, empty/error/loading states, report/approval flow.
Everyone should read `05_CORTEX_TRIAL_FIX.md`. Only lead needs to pursue Cortex activation; **other work continues in parallel**.

## API contract
- GET /api/overview → {period, purchased_kwh, total_charges, meter_count, candidate_count, caveats:[]}
- GET /api/sites → [{site_id, site_name, purchased_kwh, meter_count, coverage_note}]
- GET /api/candidates → [{id, meter_id, site, fiscal_year, current_kwh, prior_kwh, yoy_pct, reason, data_quality_flags:[]}]
- GET /api/investigations/{id} → {candidate, bills:[], evidence:[], summary, actions:[], status}
- POST /api/investigations/{id}/research → {run_id, status, session_url?}
- POST /api/investigations/{id}/report → {summary, facts:[], hypotheses:[], uncertainties:[], next_actions:[]}
- POST /api/investigations/{id}/approve → {status, approved_action, assigned_to?}
- POST /api/documents/extract → {fields, mismatches, warnings} (optional)
Use CORS for localhost:3000; avoid putting secrets in client code. Every numeric metric must be calculated from data, not invented by an LLM.

## Source files
Zip uploaded: `2026 Hackathon Datasets.zip`. Prior detailed specification: `CampusFix_Hackathon_Build_Plan.md`. Read notes and mapping before aggregating.

## Shared rules
- Don't commit .env or credentials. **Rotate the Browserbase key exposed in the pasted onboarding text.**
- Historical purchased electricity is not total campus electricity; Busch/Newark cogeneration omitted.
- Measured / modeled / assumed labels; show dates, units, provenance, missing data.
- Browserbase must demonstrate real browser interaction, not only search/fetch.
- Avoid submitting Rutgers facilities work orders or taking external actions without explicit authorization.
- Test one attendee using UI; document one change for Design entry.
