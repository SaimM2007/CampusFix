-- 05_validate.sql  |  Sanity checks. Expected values below come from running the same logic on the real CSV.

USE WAREHOUSE CAMPUSFIX_WH;
USE DATABASE  CAMPUSFIX;

-- 1. Raw load: expect 34419 rows, 33628 distinct bill ids, 243 buildings, 1109 distinct meter numbers
SELECT COUNT(*) AS raw_rows, COUNT(DISTINCT AVID_BILL_ID) AS distinct_bill_ids,
       COUNT(DISTINCT BUILDING) AS buildings, COUNT(DISTINCT METER_NUMBER) AS meter_numbers
FROM CAMPUSFIX.RAW.PURCHASED_ELECTRICITY;

-- 2. kWh source check: ELECTRICITY_KWH = USAGE on every row, unit is always Kwh (expect 0 and 1 unit)
SELECT COUNT_IF(ELECTRICITY_KWH <> USAGE) AS kwh_usage_disagree, COUNT(DISTINCT UNIT_OF_MEASURE) AS units
FROM CAMPUSFIX.RAW.PURCHASED_ELECTRICITY;

-- 3. Grain: (bill id, meter) should be unique (expect 0 duplicates)
SELECT COUNT(*) - COUNT(DISTINCT AVID_BILL_ID || '|' || METER_NUMBER) AS dup_bill_meter_rows
FROM CAMPUSFIX.RAW.PURCHASED_ELECTRICITY;

-- 4. Clean view quality profile: null/negative/zero kWh, unparseable dates, flags
SELECT COUNT(*) AS rows_total,
       COUNT_IF(kwh IS NULL) AS null_kwh, COUNT_IF(kwh < 0) AS negative_kwh, COUNT_IF(kwh = 0) AS zero_kwh,
       COUNT_IF(period_start IS NULL) AS no_period_dates,
       COUNT_IF(is_usable) AS usable_rows, COUNT_IF(data_quality_flag IS NOT NULL) AS flagged_rows
FROM CAMPUSFIX.ANALYTICS.ELECTRICITY_CLEAN;

-- 5. Total purchased kWh by fiscal year and region (purchased only!)
SELECT fiscal_year, region, COUNT(*) AS bill_lines, ROUND(SUM(kwh)) AS purchased_kwh
FROM CAMPUSFIX.ANALYTICS.ELECTRICITY_CLEAN WHERE is_usable
GROUP BY fiscal_year, region ORDER BY fiscal_year, region;

-- 6. Coverage: meters and months per building-year (look for partial years)
SELECT building_id, fiscal_year_num, meter_count, bill_count, ROUND(total_kwh) AS total_kwh
FROM CAMPUSFIX.ANALYTICS.ELEC_BUILDING_YEAR ORDER BY total_kwh DESC LIMIT 20;

-- 7. How many building-year comparisons are comparable vs not
SELECT period, COUNT(*) AS compared, COUNT_IF(is_comparable) AS comparable
FROM CAMPUSFIX.ANALYTICS.ELEC_YOY GROUP BY period ORDER BY period;

-- 8. THE RESULT: anomalies (expect 15 rows; unique, non-null IDs)
SELECT * FROM CAMPUSFIX.ANALYTICS.ANOMALIES ORDER BY CHANGE_PCT DESC;
SELECT COUNT(*) AS n, COUNT(DISTINCT ID) AS distinct_ids FROM CAMPUSFIX.ANALYTICS.ANOMALIES;

-- 9. Overview
SELECT * FROM CAMPUSFIX.ANALYTICS.OVERVIEW;

-- 10. SOURCE VERIFICATION: pull the underlying bills for one flagged row (swap the building id / FY).
--     Example: Life Sciences 2 (building 7250), FY2023 vs FY2022. Check the monthly kWh by meter by eye.
SELECT building_name, meter_id, fiscal_year, fy_month, period_start, period_end, billed_days, kwh, data_quality_flag
FROM CAMPUSFIX.ANALYTICS.ELECTRICITY_CLEAN
WHERE building_id = '7250' AND fiscal_year IN ('FY2022','FY2023') AND is_usable
ORDER BY meter_id, fiscal_year, fy_month;
