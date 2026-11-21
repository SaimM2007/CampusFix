# CampusFix - Snowflake Handoff

**Scope:** PURCHASED electricity only (Rutgers FY21-FY25). This is **not total campus energy**: electricity produced by the Busch and Newark cogeneration plants is excluded. Flags are leads for human review, never proof of a fault.

## Run order (Snowsight worksheet, authorized role)
1. `scripts/snowflake/01_setup.sql` - DB, schemas, warehouse.
2. `scripts/snowflake/02_load.sql` - creates `CAMPUSFIX.RAW.PURCHASED_ELECTRICITY` (47 VARCHAR cols), stage, file format.
   **Manual UI step:** Data > Databases > CAMPUSFIX > RAW > Stages > LOAD_STAGE > `+ Files` > upload `Purchased Electricity FY21-FY25.csv`, then run the `COPY INTO`. Expect **34,419 rows**.
3. `03_clean.sql` -> `ANALYTICS.ELECTRICITY_CLEAN`
4. `04_anomalies.sql` -> `ELEC_METER_MONTH`, `ELEC_BUILDING_YEAR`, `ELEC_YOY`, **`ANOMALIES`**, **`OVERVIEW`**
5. `05_validate.sql` - checks (expected numbers in comments).

All scripts are re-runnable (`CREATE OR REPLACE` / `IF NOT EXISTS`); re-running `02_load.sql` rebuilds the table so the data can't be double-loaded.

## Method (matched meter-month YoY)
For each building and adjacent FY pair: sum kWh per meter per fiscal month, keep only (meter, month) pairs with kWh > 0 in **both** years, compare totals. Missing meters/bills therefore can't look like spikes.
- Comparable if: >= 9 matched meter-months, matched kWh >= 80% of the building's usable kWh in both years, baseline >= 100,000 kWh, not a substation (purchases there depend on cogen output).
- Flag if: change >= 10% **and** increase >= 100,000 kWh. Top 15 by kWh increase across FY2022-FY2025.
- Severity (**assumed triage thresholds, not statistics**): high >= 30%, medium >= 20%, else low.
- The Newark Power Plant/Cogeneration account (bldg 7261, 63 rows) is excluded entirely.

## Contract: `CAMPUSFIX.ANALYTICS.ANOMALIES` (15 rows)
`ID, BUILDING, BUILDING_ID, CAMPUS, PERIOD, METRIC, CURRENT_VALUE, BASELINE_VALUE, CHANGE_PCT, SEVERITY, STATUS, DATA_QUALITY_NOTES, EXPLANATION (NULL)` plus `CURRENT_BILL_COUNT, BASELINE_BILL_COUNT, CURRENT_METER_COUNT, BASELINE_METER_COUNT, REGION, SITE, CHANGE_KWH, METHODOLOGY`.
- `ID` = `electricity-<building_id>-<fy>` (deterministic). `PERIOD` is the *current* FY; baseline is the prior FY. The same building can appear for different FYs.
- `CURRENT_VALUE`/`BASELINE_VALUE` are **matched** kWh (comparable meter-months only), not whole-building totals.
- No account or meter numbers are exposed in the ANOMALIES / OVERVIEW views (`meter_id` exists only in internal views).

Real sample (top 5 by CHANGE_PCT):

| ID | Building | PERIOD | current kWh | baseline kWh | % | sev |
|---|---|---|---|---|---|---|
| electricity-8734-fy2025 | Hahne and Company HAH - Express Newark | FY2025 | 516,984 | 277,080 | 86.58 | high |
| electricity-7250-fy2023 | Life Sciences 2 - LS2 | FY2023 | 3,793,200 | 2,115,300 | 79.32 | high |
| electricity-7592-fy2022 | Food Innovation Center FIC - North | FY2022 | 824,607 | 571,111 | 44.39 | high |
| electricity-3158-fy2022 | Civic Square & Parking Deck | FY2022 | 4,752,088 | 3,432,252 | 38.45 | high |
| electricity-3168-fy2023 | Public Safety Building & Parking Deck | FY2023 | 2,915,140 | 2,243,532 | 29.94 | medium |

## Known limitations
- Purchased only; cogeneration excluded; no weather normalization; billing intervals vary (billed-day change is in `DATA_QUALITY_NOTES`).
- Source notes warn a few individual bills may be wrong. Only ~54-72 of ~215-226 buildings pass the comparability filter per year (many have changing meter coverage) - by design.
- Natural gas is not included.

## Testing honesty
The SQL was **tested by transpiling to DuckDB and running on the real CSV** (not on a live Snowflake account). All 15 ANOMALIES rows were independently recomputed from the raw CSV with pandas and matched exactly. Please run `05_validate.sql` in Snowflake and compare to the expected numbers.
