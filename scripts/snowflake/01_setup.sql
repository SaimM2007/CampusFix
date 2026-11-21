-- 01_setup.sql  |  CampusFix: idempotent database / schema / warehouse setup
-- Run in a Snowsight worksheet with a role allowed to create these objects.
-- (If the lead already created them, every statement here is a harmless no-op.)

CREATE DATABASE IF NOT EXISTS CAMPUSFIX;
CREATE SCHEMA   IF NOT EXISTS CAMPUSFIX.RAW;
CREATE SCHEMA   IF NOT EXISTS CAMPUSFIX.ANALYTICS;

CREATE WAREHOUSE IF NOT EXISTS CAMPUSFIX_WH
  WAREHOUSE_SIZE      = 'XSMALL'
  AUTO_SUSPEND        = 60
  AUTO_RESUME         = TRUE
  INITIALLY_SUSPENDED = TRUE;

USE WAREHOUSE CAMPUSFIX_WH;
USE DATABASE  CAMPUSFIX;
