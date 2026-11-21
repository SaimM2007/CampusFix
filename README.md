# CampusFix

**AI-assisted campus energy investigation dashboard** | MT-haCks 2026 | Rutgers University

> **Status:** Hackathon work in progress. This README is a temporary guide for the team, not a claim that every feature is finished.

## The idea

Rutgers operates many buildings, and its public utility datasets contain years of electricity and natural-gas usage. Spotting unusual patterns across buildings and meters takes time, and an unexpected spike does not automatically mean something is broken.

**CampusFix helps a facilities or sustainability analyst find patterns worth checking, research possible explanations, and organize follow-up.** It turns historical utility data into a clear investigation workflow instead of pretending to detect live equipment failures.

**Workflow:** Detect → Research → Investigate → Recommend → Assign → Verify

## What we're building

- **Energy dashboard:** View campuses/buildings, utility trends, and energy intensity where the data supports fair comparisons.
- **Anomaly detection:** Flag unusual year-over-year changes, outliers, and data-quality issues (missing periods, incomplete coverage, etc.). Flagged results are *leads*, not confirmed faults.
- **Evidence-gathering agent:** Use Browserbase + Stagehand to navigate relevant public energy/facilities pages and capture source links and findings.
- **AI-assisted explanations:** Generate grounded, clearly qualified summaries and recommended next steps using Snowflake Cortex AI where available, with Gemini as an alternative.
- **Investigation workflow:** Open an alert, inspect supporting data and research, record notes, assign a person/status, and prepare a human-reviewed follow-up. **Do not automatically submit real facilities work orders.**
- **Presentation-ready UI:** Dark energy-operations dashboard with useful charts, alerts, and investigation detail pages.

## Data and accuracy rules

Primary source: public Rutgers FY21–FY25 purchased-electricity data; natural-gas data is an additional source. Fiscal years run July–June. **Purchased electricity is not the same as total electricity consumed**: some cogeneration generation is excluded. A consumption change alone does not establish a cause. Distinguish measured data, calculated metrics, and assumptions; never invent cost savings or fault diagnoses.

## Tech stack

| Component | Stack | Purpose |
| --- | --- | --- |
| Frontend | Next.js, React, Tailwind CSS, shadcn/ui, Recharts | Dashboard and investigations |
| API | Python, FastAPI | Connect data, AI, agent, and UI |
| Data | Snowflake SQL, Python/pandas | Store utility data and calculate anomalies |
| Browser agent | Browserbase, Stagehand, TypeScript | Navigate public sites and collect cited evidence |
| AI | Snowflake Cortex `AI_COMPLETE` (if enabled), Gemini | Grounded explanations and optional multimodal extraction |

## Team branches

| Branch | Owner / focus |
| --- | --- |
| `feature/frontend` | Dashboard, charts, site/alert/investigation pages |
| `feature/snowflake` | Data loading, cleaning, SQL analytics, anomaly queries |
| `feature/browserbase` | Browser research workflow, extraction, source provenance |
| `feature/backend` | FastAPI endpoints, integration, Cortex/Gemini, investigation state |

Each teammate works on their branch, pushes changes, and opens a PR into `main`. Agree on API shapes early; don't build four disconnected demos.

## Suggested repository layout

```text
CampusFix/
├── frontend/          # Next.js application
├── backend/           # FastAPI application and requirements.txt
├── browser-agent/     # Stagehand / Browserbase agent
├── scripts/           # Data ingestion and setup scripts
├── data/              # Local datasets (don't commit large raw files)
├── docs/              # Team specs, integration notes
└── README.md
```

## Getting started (Windows PowerShell)

```powershell
git clone https://github.com/SaimM2007/CampusFix.git
cd CampusFix
code .

git fetch origin
git switch feature/frontend  # replace with your assigned branch
```

Work in your assigned component. After making changes:

```powershell
git add .
git commit -m "Describe your change"
git push -u origin HEAD
```

Create a pull request into `main` on GitHub. Keep API keys in local `.env` files, **never commit credentials**, and add `.env.example` files with placeholder variable names only.

## Snowflake Cortex issue

Basic Snowflake SQL and model discovery work, but this trial account currently returns `AI function _COMPLETE_WITH_PROMPT_HISTORY_LLM is not available for trial accounts` when running `AI_COMPLETE`. The team is checking hackathon-specific activation with organizers. **This does not block Snowflake tables, SQL analytics, or the rest of CampusFix.** Use Gemini as the temporary explanation provider if necessary. Do not claim Cortex inference works until tested.

## Demo goal

Show one real Rutgers historical energy anomaly or data-quality flag → explain the underlying calculation → launch a browser-based research step → display sourced findings → generate a cautious recommendation → assign or record a human-reviewed follow-up. Demonstrate what is real, what is estimated, and what remains unverified.

**Hackathon deadline:** Saturday, November 21, 2026, 5:00 PM EST. Prioritize one complete, reliable workflow over a long feature list.
