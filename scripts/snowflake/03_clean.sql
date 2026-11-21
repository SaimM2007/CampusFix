-- 03_clean.sql  |  CAMPUSFIX.ANALYTICS.ELECTRICITY_CLEAN
-- One row per source bill line (Avid Bill Id + meter). Raw data is never modified.
--
-- Profiling facts this view is built on (checked on the real CSV, 34,419 rows):
--   * Unit of Measure is 'Kwh' on every row, and ELECTRICITY_KWH = USAGE on every row,
--     so ELECTRICITY_KWH is the kWh source (we never add both).
--   * AVID_BILL_ID is NOT unique (one bill can cover several meters), but
--     (AVID_BILL_ID, METER_NUMBER) is. There are no exact duplicate rows.
--   * 0 negative kWh; 1,497 zero-kWh rows (many are placeholder rows with no billing dates).
--   * FISCAL_YEAR always agrees with PERIOD (July-June fiscal year).
--   * 126 rows have no PERIOD_START/END; 3 have end < start.
--   * 63 rows are Building 7261 "Power Plant/Cogeneration" (COGEN <> 'Non cogen'):
--     purchases there depend on the cogen plant's own output, so they are excluded from anomaly detection.
-- meter_id and bill_id are INTERNAL. Do not expose them in the API/UI.

USE WAREHOUSE CAMPUSFIX_WH;
USE DATABASE  CAMPUSFIX;

CREATE OR REPLACE VIEW CAMPUSFIX.ANALYTICS.ELECTRICITY_CLEAN AS
WITH parsed AS (
  SELECT
    TRIM(AVID_BILL_ID)                                         AS bill_id,
    TRIM(BUILDING)                                             AS building_id,
    TRIM(BUILDING_NAME)                                        AS building_name,
    TRIM(BUILDING_USE)                                         AS building_use,
    TRIM(REGION)                                               AS region,
    TRIM(SITE)                                                 AS site,
    TRIM(SITE_NAME)                                            AS site_name,
    TRIM(COGEN)                                                AS cogen_flag,
    TRIM(BUILDING) || '|' || COALESCE(TRIM(ACCOUNT_NUMBER),'') || '|' || COALESCE(TRIM(METER_NUMBER),'')
                                                               AS meter_id,
    TRIM(FISCAL_YEAR)                                          AS fiscal_year,
    TRY_TO_NUMBER(SUBSTR(TRIM(FISCAL_YEAR), 3))                AS fiscal_year_num,
    TRIM(PERIOD)                                               AS period_label,
    TRY_TO_DATE(TRIM(PERIOD),       'MM/DD/YYYY')              AS period_month,
    TRY_TO_DATE(TRIM(PERIOD_START), 'MM/DD/YYYY')              AS period_start,
    TRY_TO_DATE(TRIM(PERIOD_END),   'MM/DD/YYYY')              AS period_end,
    TRY_TO_DOUBLE(REPLACE(TRIM(ELECTRICITY_KWH), ',', ''))     AS kwh,
    TRY_TO_DOUBLE(REPLACE(REPLACE(TRIM(CHARGES), '$', ''), ',', '')) AS charges_usd,
    TRY_TO_DOUBLE(REPLACE(TRIM(FACILITY_SQUARE_FOOTAGE), ',', '')) AS facility_sqft
  FROM CAMPUSFIX.RAW.PURCHASED_ELECTRICITY
  WHERE UPPER(TRIM(UNIT_OF_MEASURE)) = 'KWH'          -- verified: all rows
),
derived AS (
  SELECT
    p.*,
    -- fiscal month index: 1 = July ... 12 = June
    MOD(MONTH(period_month) - 7 + 12, 12) + 1              AS fy_month,
    CASE WHEN period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start
         THEN DATEDIFF('day', period_start, period_end) + 1 END AS billed_days
  FROM parsed p
)
SELECT
  bill_id, building_id, building_name, building_use,
  region, site, site_name, cogen_flag,
  meter_id,
  fiscal_year, fiscal_year_num, period_label, period_month, fy_month,
  period_start, period_end, billed_days,
  kwh, charges_usd, facility_sqft,
  -- Reason(s) a record is questionable (NULL = clean)
  NULLIF(TRIM(
       CASE WHEN kwh IS NULL                                      THEN 'KWH_UNPARSEABLE; ' ELSE '' END
    || CASE WHEN kwh < 0                                          THEN 'NEGATIVE_KWH; ' ELSE '' END
    || CASE WHEN kwh = 0 AND period_start IS NULL                 THEN 'PLACEHOLDER_ZERO_NO_DATES; '
            WHEN kwh = 0                                          THEN 'ZERO_KWH; ' ELSE '' END
    || CASE WHEN period_month IS NULL                             THEN 'PERIOD_UNPARSEABLE; ' ELSE '' END
    || CASE WHEN period_start IS NOT NULL AND period_end IS NOT NULL
             AND period_end < period_start                        THEN 'END_BEFORE_START; ' ELSE '' END
    || CASE WHEN billed_days > 45                                 THEN 'LONG_BILLING_INTERVAL; '
            WHEN billed_days < 20                                 THEN 'SHORT_BILLING_INTERVAL; ' ELSE '' END
    || CASE WHEN cogen_flag <> 'Non cogen'                        THEN 'COGEN_PLANT_ACCOUNT; ' ELSE '' END
  ), '') AS data_quality_flag,
  -- Rows allowed into the anomaly analysis
  (kwh IS NOT NULL AND kwh >= 0
   AND period_month IS NOT NULL AND fiscal_year_num IS NOT NULL
   AND NOT (kwh = 0 AND period_start IS NULL)                     -- placeholder rows
   AND cogen_flag = 'Non cogen')                                   AS is_usable
FROM derived;
