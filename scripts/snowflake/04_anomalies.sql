-- 04_anomalies.sql  |  Year-over-year PURCHASED electricity anomalies (flags for review, not faults)
--
-- METHOD ("matched meter-month" comparison)
--   For each building and each pair of adjacent fiscal years (FY(n-1) -> FY(n)):
--     1. Sum kWh per meter per fiscal month (July=1 ... June=12) after cleaning (usable rows only).
--     2. Keep only (meter, fiscal month) pairs that have kWh > 0 in BOTH years.
--        => a meter added/dropped, or a missing/zero bill, can never look like a consumption spike.
--     3. Sum those matched kWh for the current and baseline year; change_pct = 100*(cur-base)/base.
--     4. A building-pair is COMPARABLE only if:  matched meter-months >= 9,
--        matched kWh covers >= 80% of that building's usable kWh in BOTH years,
--        baseline matched kWh >= 100,000 (ignore tiny loads where % swings are noise),
--        and it is not a utility substation (purchased kWh there depends on cogeneration output).
--   Flag = comparable AND change_pct >= 10 AND increase >= 100,000 kWh  (ASSUMED triage thresholds).
--   Severity (ASSUMED triage heuristic, not statistics): high >= 30%, medium >= 20%, else low (10-20%).
--
-- LIMITS: purchased kWh only (cogeneration output on Busch / Newark is excluded); no weather
-- normalization; billing intervals vary (billed-day change is reported in the notes);
-- a few individual bills may be wrong (per the source notes). A change is a lead, not a cause.

USE WAREHOUSE CAMPUSFIX_WH;
USE DATABASE  CAMPUSFIX;

-- Tunable thresholds in one place (documented in docs/SNOWFLAKE_HANDOFF.md)
-- min matched meter-months = 9 | min coverage = 0.80 | min baseline kWh = 100000
-- min change % = 10 | min increase kWh = 100000 | high >= 30% | medium >= 20%

-- ---------- 1. meter x fiscal-month grain ----------
CREATE OR REPLACE VIEW CAMPUSFIX.ANALYTICS.ELEC_METER_MONTH AS
SELECT building_id, MAX(building_name) AS building_name, MAX(region) AS region, MAX(site_name) AS site_name,
       meter_id, fiscal_year_num, fy_month,
       SUM(kwh)         AS kwh,
       SUM(billed_days) AS billed_days,
       COUNT(*)         AS bill_lines
FROM CAMPUSFIX.ANALYTICS.ELECTRICITY_CLEAN
WHERE is_usable
GROUP BY building_id, meter_id, fiscal_year_num, fy_month;

-- ---------- 2. building x fiscal-year totals (for coverage & provenance) ----------
CREATE OR REPLACE VIEW CAMPUSFIX.ANALYTICS.ELEC_BUILDING_YEAR AS
SELECT building_id, fiscal_year_num,
       SUM(kwh)                    AS total_kwh,
       COUNT(DISTINCT meter_id)    AS meter_count,
       SUM(bill_lines)             AS bill_count
FROM CAMPUSFIX.ANALYTICS.ELEC_METER_MONTH
GROUP BY building_id, fiscal_year_num;

-- ---------- 3. every building x adjacent-year comparison, with comparability reasons ----------
CREATE OR REPLACE VIEW CAMPUSFIX.ANALYTICS.ELEC_YOY AS
WITH matched AS (
  SELECT c.building_id, c.fiscal_year_num,
         MAX(c.building_name) AS building_name, MAX(c.region) AS region, MAX(c.site_name) AS site_name,
         SUM(c.kwh)                               AS matched_current_kwh,
         SUM(p.kwh)                               AS matched_baseline_kwh,
         COUNT(*)                                 AS matched_meter_months,
         COUNT(DISTINCT c.meter_id)               AS matched_meters,
         SUM(CASE WHEN c.billed_days IS NOT NULL AND p.billed_days IS NOT NULL THEN c.billed_days END) AS matched_cur_days,
         SUM(CASE WHEN c.billed_days IS NOT NULL AND p.billed_days IS NOT NULL THEN p.billed_days END) AS matched_base_days
  FROM CAMPUSFIX.ANALYTICS.ELEC_METER_MONTH c
  JOIN CAMPUSFIX.ANALYTICS.ELEC_METER_MONTH p
    ON  p.building_id     = c.building_id
    AND p.meter_id        = c.meter_id
    AND p.fy_month        = c.fy_month
    AND p.fiscal_year_num = c.fiscal_year_num - 1
  WHERE c.kwh > 0 AND p.kwh > 0
  GROUP BY c.building_id, c.fiscal_year_num
)
SELECT
  m.building_id, m.building_name, m.region, m.site_name,
  'FY' || m.fiscal_year_num                                  AS period,
  'FY' || (m.fiscal_year_num - 1)                            AS baseline_period,
  m.matched_current_kwh                                       AS current_kwh,
  m.matched_baseline_kwh                                      AS baseline_kwh,
  100.0 * (m.matched_current_kwh - m.matched_baseline_kwh) / NULLIF(m.matched_baseline_kwh, 0) AS change_pct,
  m.matched_current_kwh - m.matched_baseline_kwh              AS change_kwh,
  m.matched_meter_months, m.matched_meters,
  cy.total_kwh  AS current_total_kwh,  cy.bill_count AS current_bill_count,  cy.meter_count AS current_meter_count,
  bl.total_kwh  AS baseline_total_kwh, bl.bill_count AS baseline_bill_count, bl.meter_count AS baseline_meter_count,
  m.matched_current_kwh  / NULLIF(cy.total_kwh, 0)            AS current_coverage,
  m.matched_baseline_kwh / NULLIF(bl.total_kwh, 0)            AS baseline_coverage,
  m.matched_cur_days, m.matched_base_days,
  100.0 * (m.matched_cur_days - m.matched_base_days) / NULLIF(m.matched_base_days, 0) AS billed_days_change_pct,
  (m.matched_meter_months >= 9
   AND m.matched_current_kwh  / NULLIF(cy.total_kwh, 0) >= 0.80
   AND m.matched_baseline_kwh / NULLIF(bl.total_kwh, 0) >= 0.80
   AND m.matched_baseline_kwh >= 100000
   AND UPPER(m.building_name) NOT LIKE '%SUBSTATION%')           AS is_comparable   -- substations: purchases depend on cogen output
FROM matched m
JOIN CAMPUSFIX.ANALYTICS.ELEC_BUILDING_YEAR cy ON cy.building_id = m.building_id AND cy.fiscal_year_num = m.fiscal_year_num
JOIN CAMPUSFIX.ANALYTICS.ELEC_BUILDING_YEAR bl ON bl.building_id = m.building_id AND bl.fiscal_year_num = m.fiscal_year_num - 1;

-- ---------- 4. ANOMALIES: API contract (all adjacent FY pairs FY22..FY25, top 15 by kWh increase) ----------
CREATE OR REPLACE VIEW CAMPUSFIX.ANALYTICS.ANOMALIES AS
SELECT
  'electricity-' || building_id || '-' || LOWER(period)                       AS ID,
  building_name                                                               AS BUILDING,
  building_id                                                                 AS BUILDING_ID,
  region || ' - ' || site_name                                                AS CAMPUS,
  period                                                                      AS PERIOD,
  'purchased_electricity_kwh'                                                 AS METRIC,
  CAST(current_kwh  AS FLOAT)                                                 AS CURRENT_VALUE,
  CAST(baseline_kwh AS FLOAT)                                                 AS BASELINE_VALUE,
  CAST(ROUND(change_pct, 2) AS FLOAT)                                         AS CHANGE_PCT,
  CASE WHEN change_pct >= 30 THEN 'high' WHEN change_pct >= 20 THEN 'medium' ELSE 'low' END AS SEVERITY,
  'new'                                                                       AS STATUS,
  'Purchased electricity only (excludes Busch/Newark cogeneration output). Compared '
    || matched_meters || ' meter(s) / ' || matched_meter_months || ' matched meter-months, '
    || baseline_period || ' vs ' || period || '; meters or months missing in either year are excluded. '
    || 'Matched kWh = ' || ROUND(100*current_coverage) || '% (current) / ' || ROUND(100*baseline_coverage)
    || '% (baseline) of building purchased kWh. Billed days changed ' || COALESCE(TO_VARCHAR(ROUND(billed_days_change_pct, 1)) || '%', 'n/a')
    || '. No weather normalization. Severity is an assumed triage threshold, not a fault diagnosis.' AS DATA_QUALITY_NOTES,
  CAST(NULL AS VARCHAR)                                                       AS EXPLANATION,
  -- optional fields
  current_bill_count   AS CURRENT_BILL_COUNT,
  baseline_bill_count  AS BASELINE_BILL_COUNT,
  current_meter_count  AS CURRENT_METER_COUNT,
  baseline_meter_count AS BASELINE_METER_COUNT,
  region               AS REGION,
  site_name            AS SITE,
  CAST(change_kwh AS FLOAT) AS CHANGE_KWH,
  'Matched meter-month YoY; thresholds: >=10% and >=100,000 kWh increase; coverage >=80%; high>=30%, medium>=20% (assumed triage)' AS METHODOLOGY
FROM CAMPUSFIX.ANALYTICS.ELEC_YOY
WHERE is_comparable
  AND change_pct >= 10
  AND change_kwh >= 100000
QUALIFY ROW_NUMBER() OVER (ORDER BY change_kwh DESC) <= 15;
-- PERIOD is the 'current' FY of each comparison (baseline = previous FY). Same building can appear for different FYs.

-- ---------- 5. OVERVIEW (scope: purchased electricity, latest FY vs prior FY) ----------
CREATE OR REPLACE VIEW CAMPUSFIX.ANALYTICS.OVERVIEW AS
SELECT
  MAX(period)                                                        AS PERIOD,
  MAX(baseline_period)                                               AS BASELINE_PERIOD,
  COUNT_IF(is_comparable)                                            AS COMPARABLE_BUILDINGS,
  (SELECT COUNT(*) FROM CAMPUSFIX.ANALYTICS.ANOMALIES)               AS FLAGGED_ANOMALIES,
  SUM(CASE WHEN is_comparable THEN current_kwh  END)                 AS COMPARABLE_PURCHASED_KWH_CURRENT_FY,
  SUM(CASE WHEN is_comparable THEN baseline_kwh END)                 AS COMPARABLE_PURCHASED_KWH_BASELINE_FY,
  100.0 * (SUM(CASE WHEN is_comparable THEN current_kwh END) - SUM(CASE WHEN is_comparable THEN baseline_kwh END))
        / NULLIF(SUM(CASE WHEN is_comparable THEN baseline_kwh END), 0) AS COMPARABLE_PURCHASED_KWH_CHANGE_PCT,
  'Matched-meter purchased electricity for comparable buildings only; NOT total campus energy (cogeneration output excluded).' AS SCOPE_NOTE
FROM CAMPUSFIX.ANALYTICS.ELEC_YOY
WHERE period = (SELECT MAX(period) FROM CAMPUSFIX.ANALYTICS.ELEC_YOY);
