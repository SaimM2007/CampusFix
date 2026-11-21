# Developer packet — Snowflake + Rutgers datasets

## Goal
Real data in Snowflake and reproducible SQL for anomaly review. **No AI-generated meter readings.**

## Setup (Snowflake SQL Worksheet)
Run sequentially:
```sql
SELECT CURRENT_VERSION(), CURRENT_ROLE(), CURRENT_WAREHOUSE();
CREATE WAREHOUSE IF NOT EXISTS CAMPUSFIX_WH WAREHOUSE_SIZE='XSMALL' AUTO_SUSPEND=60 AUTO_RESUME=TRUE INITIALLY_SUSPENDED=TRUE;
USE WAREHOUSE CAMPUSFIX_WH;
CREATE DATABASE IF NOT EXISTS CAMPUSFIX;
CREATE SCHEMA IF NOT EXISTS CAMPUSFIX.PUBLIC;
USE DATABASE CAMPUSFIX;
USE SCHEMA PUBLIC;
SELECT 'CampusFix SQL works' AS status, 21+25 AS result;
SHOW CORTEX BASE MODELS;
```
If insufficient privileges, use an existing warehouse and database. X-Small compute costs credits while running.

## Data
Unzip `2026 Hackathon Datasets.zip`; use `Purchased Electricity FY21-FY25.csv`, `Purchased Electricity Notes.txt`, and `Rutgers_Campus_Mapping For Purchased Utility Datasets.xlsx`. Use Python pandas to inspect actual headers/dtypes/row count before making SQL tables. Do not guess identifiers. Load raw rows through Snowflake UI table import or Python connector; preserve source file, original column names, and raw values. Store decoder in mapping table. Gas optional phase 2.

## Required transformations
- Normalize bill start/end dates, fiscal year, meter ID, site, purchased kWh, charges, building metadata.
- Identify duplicates using bill IDs plus meter/date; flag credits, negatives, nulls, overlapping periods, implausible bill lengths.
- Aggregate by meter/year **only for comparable coverage**. Compare matching periods where possible. Do not blindly label missing records as zero.
- Compute YoY = 100*(current-prior)/prior only when prior >0 and coverage comparable.
- Candidate reason example: YoY >30% AND adequate comparable coverage; threshold is assumed heuristic, not equipment fault proof.
- Site totals should not be presented as full campus power; cogeneration excluded.

## Deliverables
1. `scripts/load_data.py` (or documented Snowflake import instructions)
2. `sql/schema.sql`, `sql/analytics.sql`
3. `docs/data_dictionary.md` listing real column names, caveats, counts, and 2–3 candidate examples with source rows
4. Backend-accessible query output conforming to `00_START_HERE.md` contract

## Acceptance test
A SELECT returns actual rows; a candidate links back to its measured bills; anomalies remain explainable when LLM is disabled.
