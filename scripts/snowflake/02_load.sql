-- 02_load.sql  |  Load the raw purchased-electricity CSV (all 47 columns as VARCHAR)
--
-- WHY we create the table ourselves: the Snowsight wizard renames/infers columns and can
-- silently drop rows on date/number inference. A fixed all-VARCHAR table with known names
-- means 03_clean.sql works unchanged. Column ORDER matches the CSV header exactly.
--
-- Expected result: 34,419 data rows (34,420 lines incl. header).

USE WAREHOUSE CAMPUSFIX_WH;
USE DATABASE  CAMPUSFIX;

-- CREATE OR REPLACE => re-running this file can never double-load the data.
CREATE OR REPLACE TABLE CAMPUSFIX.RAW.PURCHASED_ELECTRICITY (
  ACCOUNT_ACTIVE_INDICATOR            VARCHAR,
  AVID_BILL_ID                        VARCHAR,
  ACCOUNT_NUMBER                      VARCHAR,
  BUILDING                            VARCHAR,
  CUSTOMER_FACILITY_ID                VARCHAR,
  BUILDING_NAME                       VARCHAR,
  BUILDING_ALIAS                      VARCHAR,
  ADDRESS_1                           VARCHAR,
  ZIP_CODE                            VARCHAR,
  AUX                                 VARCHAR,
  CITY                                VARCHAR,
  REGION                              VARCHAR,
  SITE                                VARCHAR,
  SITE_NAME                           VARCHAR,
  COGEN                               VARCHAR,
  COMMODITY                           VARCHAR,
  PERIOD                              VARCHAR,
  FISCAL_YEAR                         VARCHAR,
  BILL_DATE                           VARCHAR,
  PERIOD_START                        VARCHAR,
  PERIOD_END                          VARCHAR,
  DUE_DATE                            VARCHAR,
  STATEMENT_DATE                      VARCHAR,
  VENDOR_NAME                         VARCHAR,
  UNIT_OF_MEASURE                     VARCHAR,
  USAGE                               VARCHAR,
  ELECTRICITY_KWH                     VARCHAR,
  ON_CAMPUS_STATIONARY_SOURCES_MMBTU  VARCHAR,
  CHARGES                             VARCHAR,
  EXTERIOR_GSF                        VARCHAR,
  FACILITY_SQUARE_FOOTAGE             VARCHAR,
  CHECK_OF_USAGE_PER_SQUARE_FOOT      VARCHAR,
  USAGE_PER_SQUARE_FOOT               VARCHAR,
  COST_PER_SQUARE_FOOT                VARCHAR,
  ASSIGNABLE_COMMON_NSF               VARCHAR,
  ASSIGNABLE_NSF                      VARCHAR,
  BUILDING_STATUS                     VARCHAR,
  OWNERSHIP_STATUS                    VARCHAR,
  BUILDING_USE                        VARCHAR,
  DATE_BUILT                          VARCHAR,
  DATE_OF_ACQUISITION                 VARCHAR,
  DEMOLITION_DATE                     VARCHAR,
  HISTORIC_PROP_ID                    VARCHAR,
  COMMENTS                            VARCHAR,
  FACILITY_NAME                       VARCHAR,
  METER_LOCATION                      VARCHAR,
  METER_NUMBER                        VARCHAR
);

-- ============================ OPTION A (recommended): stage + COPY ============================
CREATE STAGE IF NOT EXISTS CAMPUSFIX.RAW.LOAD_STAGE;

CREATE OR REPLACE FILE FORMAT CAMPUSFIX.RAW.CSV_FF
  TYPE = CSV
  SKIP_HEADER = 1                          -- also skips the UTF-8 BOM that sits in the header line
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  NULL_IF = ('')
  EMPTY_FIELD_AS_NULL = TRUE
  ENCODING = 'UTF8';

-- MANUAL UI STEP (Snowsight): Data > Databases > CAMPUSFIX > RAW > Stages > LOAD_STAGE
--   click "+ Files" and upload  "Purchased Electricity FY21-FY25.csv"
-- (CLI alternative in SnowSQL:  PUT 'file://C:/.../Purchased Electricity FY21-FY25.csv' @CAMPUSFIX.RAW.LOAD_STAGE AUTO_COMPRESS=TRUE;)

COPY INTO CAMPUSFIX.RAW.PURCHASED_ELECTRICITY
FROM @CAMPUSFIX.RAW.LOAD_STAGE
PATTERN = '.*Purchased Electricity FY21-FY25.*'
FILE_FORMAT = (FORMAT_NAME = CAMPUSFIX.RAW.CSV_FF)
ON_ERROR = ABORT_STATEMENT;
-- Keep only ONE copy of the file in the stage (LIST @CAMPUSFIX.RAW.LOAD_STAGE; to check) so it is not loaded twice.

-- ============================ OPTION B: Snowsight wizard ============================
-- Skip the CREATE TABLE above's COPY step; instead: Data > Add Data > Load data into a table >
-- pick CAMPUSFIX.RAW.PURCHASED_ELECTRICITY (EXISTING table) > upload CSV > set "Skip first line"
-- (header) = 1 and map columns by position. Do NOT let it create a new table.

-- ============================ Verify ============================
SELECT COUNT(*) AS ROW_COUNT FROM CAMPUSFIX.RAW.PURCHASED_ELECTRICITY;   -- expect 34419
SELECT * FROM CAMPUSFIX.RAW.PURCHASED_ELECTRICITY LIMIT 5;
