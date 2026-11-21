# Developer packet — FastAPI, Cortex and optional Gemini

## Goal
Connect Snowflake measured records, Browserbase evidence, and human approval into an auditable investigation. Cortex writes structured prose; SQL calculates numbers. Optional Gemini reads sample bill images, not generic chat.

## Setup
```bash
python -m venv .venv
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn snowflake-connector-python python-dotenv pydantic pandas
uvicorn app.main:app --reload
```
Keep Snowflake credentials in `.env` ignored by git; use `.env.example` placeholders only. Do not use Snowflake account admin credentials in public deployed service.

## Cortex quick test
In Snowflake Snowsight SQL Worksheet, choose warehouse, then:
```sql
SHOW CORTEX BASE MODELS;
SELECT AI_COMPLETE('llama3.1-8b', 'Reply: CampusFix ready') AS answer;
```
If model unavailable, choose an available model from SHOW results or AI & ML → AI Studio → Cortex Playground. `AI_COMPLETE` is preferred over legacy `SNOWFLAKE.CORTEX.COMPLETE`. CURRENT STATUS (Nov 21): `SHOW CORTEX BASE MODELS` works but `AI_COMPLETE` fails with `_COMPLETE_WITH_PROMPT_HISTORY_LLM is not available for trial accounts`. This is an account-level trial restriction, not a model-name or SQL-syntax issue. See `05_CORTEX_TRIAL_FIX.md`. REST endpoint requires separate auth and role permissions; SQL success does not prove REST works. If trial blocks AI, use a clearly labeled fallback report, not fake Cortex results.

## API endpoints
Implement exactly the JSON contracts in `00_START_HERE.md`. CORS allow localhost frontend. Store investigation state in SQLite if fastest, but source measurements and aggregate candidates must originate in Snowflake. Avoid runtime schema migrations.

## Report prompt
Input only trusted structured numbers from SQL and source URLs/evidence from browser. Return JSON: facts (with record IDs), hypotheses (explicitly unconfirmed), missing evidence, data-quality warnings, recommended manual checks, next actions. Never say HVAC broken or quantify savings without evidence. Human must approve action.

## Gemini optional
Accept image of a **synthetic/sample** utility bill or facilities note. Extract meter, period, kWh, charges, document type as structured JSON; compare to Snowflake record and show mismatches. Reject uncertain fields or mark them null. No private account identifiers or sensitive documents to free tier. Keep API key backend only. If time runs out, omit.

## Deliverables
`backend/app/main.py`, config and Snowflake query module, investigation state storage, Cortex module, Browserbase JSON ingestion, optional Gemini endpoint, sample API responses, README and error handling. End-to-end test: case → measured bill records → browser evidence → Cortex report → human approval → export.
