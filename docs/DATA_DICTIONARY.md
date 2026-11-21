# CampusFix Data Dictionary - Purchased Electricity

Source: `Purchased Electricity FY21-FY25.csv` (Rutgers Office of Climate Action), 34,419 bill lines, 47 columns. Fiscal year = July 1 - June 30 (FY2025 = Jul 2024 - Jun 2025).

## Source facts (verified)
- `Unit of Measure` is `Kwh` on all rows; `Electricity (Kwh)` equals `Usage` on all rows -> `Electricity (Kwh)` is the kWh source (never summed with Usage).
- `Avid Bill Id` is not unique (a bill can span meters); `(Avid Bill Id, Meter Number)` is unique.
- 0 negative kWh; 1,497 zero-kWh rows; 126 rows lack Period Start/End; 3 have end < start.
- `Fiscal Year` always agrees with `Period`. 243 buildings, 1,109 meter numbers, 585 accounts.

## RAW.PURCHASED_ELECTRICITY
All 47 source columns, VARCHAR, names upper-snake-cased in CSV order (e.g. `Electricity (Kwh)` -> `ELECTRICITY_KWH`, `Aux.` -> `AUX`).

## ANALYTICS.ELECTRICITY_CLEAN (one row per bill line)
| Field | Definition |
|---|---|
| bill_id, meter_id | INTERNAL. meter_id = building + account + meter |
| building_id / building_name / building_use | source Building / Building Name / Building Use |
| region, site, site_name | source geography |
| fiscal_year, fiscal_year_num | 'FY2025', 2025 |
| period_month, fy_month | Period date; fiscal month 1=July..12=June |
| period_start/end, billed_days | parsed dates; days inclusive (NULL if unreliable) |
| kwh | purchased kWh (measured, from bill) |
| charges_usd, facility_sqft | parsed, not used in anomaly logic |
| data_quality_flag | e.g. ZERO_KWH, PLACEHOLDER_ZERO_NO_DATES, LONG_BILLING_INTERVAL, COGEN_PLANT_ACCOUNT |
| is_usable | kWh valid, not placeholder, not cogen-plant account |

## Metrics (calculated, not measured)
- **matched kWh**: sum over (meter, fiscal month) pairs with kWh > 0 in both years.
- **change_pct** = 100 * (current - baseline) / baseline on matched kWh.
- **coverage** = matched kWh / building usable kWh for that year.
- **severity**: assumed triage threshold (high >= 30%, medium >= 20%, else low) - not statistical proof.
