# CampusFix — Snowflake Cortex Trial Blocker (Nov 21, 2026)

## Verified state
- Snowflake SQL worksheet works; query returned "CampusFix SQL is working!".
- `SHOW CORTEX BASE MODELS;` succeeded and returned **127 model entries**. This is **model discovery only**, not inference authorization.
- Legacy `SNOWFLAKE.CORTEX.COMPLETE` failed because newly created accounts are blocked from using legacy functions. **Use `AI_COMPLETE`** instead.
- `SELECT AI_COMPLETE('claude-4-sonnet', 'Reply: CampusFix ready')` or another model fails with: **`AI function _COMPLETE_WITH_PROMPT_HISTORY_LLM is not available for trial accounts.`** Do not waste time trying many model names or changing roles to bypass an account-level restriction.

## Why
Official Snowflake trial documentation says AI features are disabled by default on self-service trials until a credit card is added. The hackathon opening deck advertised a Snowflake trial with Cortex functions, but did **not** include the separate MLH/Snowflake partner slides. The organizers may have a sponsor-specific account or activation path.

## Resolution path — lead only
1. **Ask the organizer/Snowflake mentor first (max 10 minutes):** "We registered for the MT-haCks Snowflake trial. SQL and SHOW CORTEX BASE MODELS work, but AI_COMPLETE returns `_COMPLETE_WITH_PROMPT_HISTORY_LLM is not available for trial accounts`. Is there a sponsor-enabled account, activation link, or credit-card-free way to enable Cortex for the challenge?"
2. If no sponsor path exists and you **voluntarily** choose to use a payment card, Snowflake documentation: Snowsight → **Admin → Billing → Snowflake billing → Payment method → + Credit Card**. Adding a card **does not itself upgrade or end the trial**. Do not select **Upgrade** unless intentionally accepting paid-account terms. Check spending/credits and account settings.
3. Re-run **once**:
```sql
SELECT AI_COMPLETE('claude-4-sonnet', 'Reply with exactly: CampusFix Cortex is working.') AS response;
```
4. If still blocked, record the exact error and proceed without Cortex inference. Do not claim it works.

## Unblocked work
**Snowflake SQL is sufficient to keep the product moving**: create database/schema, ingest Rutgers electricity CSV, calculate transparent candidate anomalies, and query from FastAPI. The hackathon opening deck says demonstrate Snowflake usage with **a query, table, or Cortex call**. For AI prose use Gemini (if working) or a clearly labeled deterministic report template. Keep an `AIProvider` adapter so Cortex can be enabled later.

## Current SQL setup
```sql
CREATE DATABASE IF NOT EXISTS CAMPUSFIX;
CREATE SCHEMA IF NOT EXISTS CAMPUSFIX.RAW;
CREATE SCHEMA IF NOT EXISTS CAMPUSFIX.ANALYTICS;
SELECT CURRENT_ROLE(), CURRENT_WAREHOUSE();
```
Do not use `SNOWFLAKE.CORTEX.COMPLETE` in new code. For permissions **after** trial activation, consult official AI function privileges; trial restriction and role privileges are separate issues.

## Source links
- Snowflake trial restrictions: https://docs.snowflake.com/en/user-guide/admin-trial-account
- AI functions: https://docs.snowflake.com/en/user-guide/snowflake-cortex/aisql
- Cortex Playground: https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-playground
- Legacy function migration: https://docs.snowflake.com/en/user-guide/snowflake-cortex/aisql-migrate-legacy-functions
- Hackathon opening deck: `mt-hacks-2026-opening-ceremony.pptx` (provided by organizers)
