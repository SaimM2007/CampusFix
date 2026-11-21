# CampusFix

### AI-Powered Campus Energy Anomaly Detection & Investigation

**MT-haCks 2026 | Climate & Sustainability**

CampusFix helps university facilities and sustainability teams identify unusual electricity consumption, investigate potential causes, and make evidence-informed decisions.

By combining **Snowflake, Snowflake Cortex, Browserbase, Google Gemini, and FastAPI**, CampusFix turns thousands of utility records into prioritized anomalies and AI-assisted investigations.

Rather than simply flagging unusual energy usage, CampusFix helps answer the next question: **What should we investigate, and what evidence do we have?**

---

## The Problem

Universities operate hundreds of buildings and electricity meters, producing thousands of utility records every year.

Identifying unusual consumption patterns manually is difficult. Changes in billing periods, missing records, or newly installed meters can make electricity usage appear to increase or decrease even when the underlying building operations have not changed.

Even when a legitimate anomaly is detected, facilities teams must still investigate its possible causes.

CampusFix addresses three challenges:

1. **Detection:** Finding meaningful electricity changes across large datasets.
2. **Data quality:** Avoiding misleading comparisons caused by incomplete billing or meter changes.
3. **Investigation:** Gathering relevant information to help facilities teams determine what to examine next.

## Our Solution

CampusFix provides a web-based energy investigation platform built around five stages:

| Stage | Description |
|---|---|
| Detect | Snowflake SQL identifies and prioritizes unusual electricity consumption changes. |
| Investigate | Snowflake Cortex provides AI-assisted analysis of flagged anomalies. |
| Research | Browserbase visits relevant public websites, while Gemini analyzes webpage screenshots. |
| Recommend | The application presents possible explanations and suggested diagnostic checks. |
| Human Review | Facilities staff evaluate the evidence and determine appropriate next steps. |

CampusFix is designed to support human decision-making, not replace it. An anomaly is a reason to investigate, not proof of an equipment fault.

---

## Dataset and Results

CampusFix analyzes real Rutgers University purchased-electricity records covering fiscal years 2021–2025.

### Dataset Overview

| Metric | Value |
|---|---:|
| Electricity records | 34,419 |
| Fiscal years | FY2021–FY2025 |
| Buildings in source data | 243 |
| Distinct meter numbers in source data | 1,109 |
| Prioritized anomalies | 15 |
| Buildings with flagged anomalies | 14 |

The current anomaly results include:

- 4 high-severity anomalies
- 5 medium-severity anomalies
- 6 low-severity anomalies

The application prioritizes the 15 qualifying anomalies with the largest absolute increases in purchased electricity.

These results are based on historical purchased-electricity data, not total campus energy consumption.

### Real Example: Express Newark

One of the most significant percentage increases in our prioritized results occurred at **Hahne and Company — Express Newark**, on Rutgers–Newark's campus.

| Metric | Value |
|---|---:|
| Comparison | FY2024 → FY2025 |
| Baseline consumption | 277,080 kWh |
| Current consumption | 516,984 kWh |
| Absolute increase | +239,904 kWh |
| Percentage increase | +86.58% |
| Severity | High |

CampusFix identifies this change and allows an analyst to initiate an AI-assisted investigation.

Using Browserbase, our research agent visited the [Express Newark website](https://expressnewark.org/). Gemini analyzed the webpage screenshot and identified relevant contextual information about the Rutgers–Newark arts initiative.

However, the public source did not establish why electricity consumption increased.

This distinction is central to CampusFix: **external research provides context, not automatically verified explanations.**

---

## Technical Architecture

CampusFix consists of a frontend dashboard, a FastAPI backend, and two complementary AI systems.

```text
                       CAMPUSFIX
                    Web Dashboard
                          |
                          v
                    FastAPI Backend
                          |
             +------------+------------+
             |                         |
             v                         v
          SNOWFLAKE                 BROWSERBASE
       Electricity Data             Cloud Browser
       Anomaly Detection                 |
             |                           v
             v                       GOOGLE GEMINI
       SNOWFLAKE CORTEX           Screenshot Analysis
       AI Investigation                   |
             |                           |
             +------------+--------------+
                          |
                          v
                 Investigation Results
               Data, AI Analysis, Sources
                and Suggested Next Steps
```

### Technology Stack

| Technology | Role |
|---|---|
| Snowflake | Stores and processes historical electricity data using SQL. |
| Snowflake Cortex | Provides AI-assisted interpretation of detected anomalies. |
| Browserbase | Runs cloud browser sessions to research relevant public websites. |
| Google Gemini | Generates research queries and analyzes webpage screenshots. |
| FastAPI | Exposes REST endpoints and coordinates the data and AI services. |
| Web frontend | Displays energy metrics, anomalies, building information, and investigations. |

### Why Two AI Systems?

Snowflake Cortex and Browserbase/Gemini address different parts of the investigation.

**Snowflake Cortex** works with the internal electricity data. It helps interpret changes in consumption and identify potential explanations or follow-up questions.

**Browserbase + Gemini** gathers external public context. Browserbase navigates websites and captures screenshots, while Gemini interprets their contents.

Together, they allow an analyst to consider both the measured electricity data and relevant publicly available information.

---

## Anomaly Detection Methodology

A major part of CampusFix is its SQL-based data processing and anomaly detection pipeline.

A simple comparison of annual electricity totals can be misleading. For example, a building may appear to use more electricity because an additional meter was included, or less because a billing period is missing.

CampusFix reduces these problems using **matched meter-month comparisons**.

### 1. Raw Data Ingestion

The original Rutgers purchased-electricity dataset is loaded into Snowflake.

The raw table preserves all 47 source columns as text to avoid unintended changes during CSV import.

The original data remains separate from the analytical views.

### 2. Data Cleaning

The `ELECTRICITY_CLEAN` view parses and standardizes fields such as:

- Building identifiers
- Electricity consumption in kWh
- Fiscal years and months
- Meter identifiers
- Billing dates and billed days
- Electricity charges
- Building metadata

It also identifies data-quality issues, including:

- Zero or unparseable electricity readings
- Missing or invalid billing dates
- Unusually short or long billing intervals
- Placeholder records
- Cogeneration plant accounts

Questionable records are flagged, and records that fail the usability requirements are excluded from anomaly comparisons.

### 3. Matched Meter-Month Comparisons

For each building, CampusFix compares adjacent fiscal years using the same meter and fiscal month.

For example:

| Meter | Month | FY2024 | FY2025 | Included? |
|---|---|---:|---:|---|
| A | July | 410 | 395 | Yes |
| A | August | 380 | Missing | No |
| A | September | 360 | 372 | Yes |
| A | October | 0 | 340 | No |
| A | November | 390 | 415 | Yes |

*Illustrative example, not actual building readings.*

Only meter-month pairs with positive electricity consumption in both years are compared.

This prevents unmatched or missing records from directly creating artificial increases or decreases in the matched totals.

### 4. Comparability Requirements

A building-year comparison must satisfy all of the following:

- At least **9 matched meter-months**
- Matched electricity consumption representing at least **80% of usable purchased kWh in both years**
- At least **100,000 kWh** of matched baseline consumption
- Exclusion of utility substations from comparable results

Cogeneration plant accounts are also excluded from anomaly detection.

These requirements help ensure that comparisons are based on sufficiently complete and consistent data.

### 5. Anomaly Thresholds

A comparable building-year pair is flagged when:

- Purchased electricity increases by at least **10%**
- The absolute increase is at least **100,000 kWh**

Severity is assigned as follows:

| Severity | Electricity Increase |
|---|---|
| High | 30% or greater |
| Medium | 20% to less than 30% |
| Low | 10% to less than 20% |

These are configurable **triage heuristics**, not statistically validated fault probabilities.

The final anomalies view returns the top 15 qualifying increases ranked by absolute kWh increase.

### 6. Validation

The Snowflake pipeline includes SQL checks for:

- Raw row counts
- Unique bill/meter combinations
- Electricity unit consistency
- Data-quality flags
- Building-year coverage
- Comparable versus non-comparable comparisons
- Unique anomaly identifiers
- Underlying source records

This makes the detection methodology transparent and reproducible.

---

## AI-Assisted Investigations

### Snowflake Cortex

When an analyst selects an anomaly, the backend can invoke Snowflake Cortex to generate an AI-assisted investigation.

The analysis uses anomaly information to help the analyst understand the flagged change and consider potential explanations.

These explanations are hypotheses and require additional evidence before being treated as conclusions.

### Browserbase + Gemini Research

CampusFix also supports external research through Browserbase and Gemini.

The research pipeline:

1. Generates targeted research queries.
2. Starts a Browserbase cloud browser session.
3. Navigates relevant public websites.
4. Captures webpage screenshots.
5. Uses Gemini to interpret the visual content.
6. Returns source URLs, excerpts, and AI-generated contextual findings.

Research results include the original source links so users can inspect the evidence themselves.

### Suggested Diagnostic Actions

Depending on the anomaly, possible follow-up checks may include:

- Reviewing HVAC operating schedules
- Verifying electricity meter readings
- Comparing billing periods
- Investigating changes in occupancy or building operations
- Checking whether equipment usage changed
- Consulting facilities personnel

These are suggested investigative steps, not confirmed solutions or automatically generated maintenance work orders.

---

## Application Features

### Dashboard

Provides an overview of electricity anomalies, severity distribution, and building-level energy changes.

### Anomalies

Displays prioritized electricity anomalies and allows users to examine individual records.

### Investigations

Provides detailed information about a selected anomaly and access to AI-assisted analysis and public-web research.

### Buildings

Organizes electricity anomaly information by building.

### Reports

Provides a reporting view for summarizing anomaly findings.

The application is designed to help users move from a high-level overview to a specific building investigation.

---

## Backend API

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/overview` | Summary metrics |
| GET | `/api/anomalies` | List of prioritized anomalies |
| GET | `/api/anomalies/{anomaly_id}` | Details for one anomaly |
| POST | `/api/anomalies/{anomaly_id}/investigate` | Snowflake Cortex investigation |
| POST | `/api/anomalies/{anomaly_id}/research` | Browserbase and Gemini research |

Example anomaly identifier:

```text
electricity-8734-fy2025
```

Example requests:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/overview
curl http://localhost:8000/api/anomalies
```

Run a Cortex investigation:

```bash
curl -X POST \
  http://localhost:8000/api/anomalies/electricity-8734-fy2025/investigate
```

Run Browserbase research:

```bash
curl -X POST \
  http://localhost:8000/api/anomalies/electricity-8734-fy2025/research
```

Research requests may take longer because they involve cloud browser navigation and AI analysis.

---

## Running Locally

### Prerequisites

- Python 3.10 or newer
- Node.js and npm for the frontend
- Snowflake account with appropriate permissions
- Browserbase API credentials
- Google Gemini API credentials
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/SaimM2007/CampusFix.git
cd CampusFix
```

### 2. Configure Snowflake

Run the Snowflake SQL setup and data pipeline scripts in numerical order:

```text
01_setup.sql
02_load.sql
03_clean.sql
04_anomalies.sql
05_validate.sql
```

The scripts create the database, schema, warehouse, raw data table, analytical views, and validation queries.

During the loading step, upload the Rutgers purchased-electricity CSV to the configured Snowflake stage.

The source CSV must be available separately if it is not included in the repository.

### 3. Configure the Backend

```bash
cd backend

python -m venv .venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the backend's environment variables using the repository's existing configuration.

Required services include:

- Snowflake account and authentication
- Snowflake database and warehouse access
- Browserbase API key and project configuration
- Gemini API key

**Never commit credentials, `.env` files, private keys, or tokens to GitHub.**

### 4. Start the Backend

From the backend directory, start the FastAPI application using the repository's configured application entry point.

For example, if the ASGI application is defined as `app` in `main.py`:

```bash
uvicorn main:app --reload
```

The local API is available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Start the Frontend

In a second terminal, run these commands from the repository root:

```bash
cd frontend
npm ci
```

Create `frontend/.env.local` (or update the existing file) with this public API address:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start Next.js with `npm run dev` and open [http://localhost:3000](http://localhost:3000). The backend allows this exact browser origin. Restart Next.js after editing the environment file.

If the dashboard reports a connection error, open [API health](http://127.0.0.1:8000/api/health) first. Then check [the overview endpoint](http://127.0.0.1:8000/api/overview), which also requires a working Snowflake connection. Keep Snowflake, Browserbase and Gemini credentials in the backend environment.

### 6. Test the Application

1. Open the frontend dashboard.
2. Confirm the overview and anomaly data load.
3. Select the Express Newark anomaly.
4. Run the Snowflake Cortex investigation.
5. Run the Browserbase/Gemini research.
6. Review the returned AI findings and source links.

Both the backend and frontend must be running for local end-to-end functionality.

---

## Limitations and Responsible AI

CampusFix is an investigation-support prototype, not a fault-diagnosis or automated maintenance system.

Current limitations include:

**Purchased electricity only.** The current analysis does not represent total campus energy consumption. Cogeneration output is not included.

**Historical data.** The dataset covers FY2021–FY2025 rather than live electricity-meter feeds.

**No weather normalization.** Temperature, seasonal conditions, and degree-day adjustments are not incorporated into the current anomaly comparisons.

**Billing differences.** Matched meter-month comparisons reduce some data-quality problems, but different billing durations and inaccurate source records can still affect results.

**Heuristic thresholds.** Severity categories are prioritization rules, not statistical confidence scores.

**External research limitations.** Public websites may provide useful context without explaining the actual cause of an anomaly.

**AI uncertainty.** Cortex and Gemini outputs can be incomplete or incorrect. Their explanations should be treated as hypotheses and verified by a human.

CampusFix does not automatically submit work orders or claim verified energy savings.

---

## Future Roadmap

### Weather-Normalized Analysis

Incorporate historical weather data and heating/cooling degree days to better distinguish operational changes from weather-driven demand.

### Live Utility Integrations

Connect directly to building-management systems, smart meters, or utility APIs for more timely anomaly detection.

### Additional Utilities

Extend the platform to natural gas, water, and other campus utility datasets.

### Investigation Management

Introduce persistent investigation histories, notes, assignment workflows, and work-order integrations.

### Real-World Evaluation

Collaborate with university facilities and sustainability professionals to evaluate detection quality, investigation usefulness, and operational impact.

---

## Project Impact

CampusFix demonstrates how data engineering, cloud AI, and browser automation can work together to support campus sustainability.

Its primary contributions are:

1. **Reproducible data processing:** A transparent Snowflake SQL pipeline that handles billing and meter comparability.
2. **Prioritized anomaly detection:** Identifies substantial electricity changes worth reviewing.
3. **AI-assisted investigation:** Combines internal anomaly analysis with external public-web context.
4. **Human-centered decision support:** Presents evidence and hypotheses without claiming unverified causes.

The long-term goal is to help facilities teams spend less time searching through utility records and more time investigating opportunities to improve campus energy operations.

---

## Hackathon

Built for **MT-haCks 2026 — Climate & Sustainability**.

**GitHub:** https://github.com/SaimM2007/CampusFix

**Demo video:** To be added.

**Live application:** To be added if deployed.

---

## License

MIT License, if included in the repository.

---

**CampusFix — From campus energy anomalies to actionable investigations.**
