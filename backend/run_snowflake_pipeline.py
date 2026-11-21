from pathlib import Path
import os
import sys
import snowflake.connector
from dotenv import load_dotenv

load_dotenv()

root = Path(__file__).resolve().parent.parent
sql_dir = root / "scripts" / "snowflake"

def connect():
    return snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        user=os.getenv("SNOWFLAKE_USER"),
        authenticator="OAUTH_AUTHORIZATION_CODE",
        warehouse="COMPUTE_WH",
        role="ACCOUNTADMIN",
    )

def run_script(cursor, filename):
    path = sql_dir / filename
    print(f"\nRunning {filename}", flush=True)

    sql = path.read_text(encoding="utf-8-sig")
    statements = snowflake.connector.util_text.split_statements(
        __import__("io").StringIO(sql)
    )

    for statement, is_file_transfer in statements:
        if statement.strip() and any(line.strip() and not line.lstrip().startswith('--') for line in statement.splitlines()):
            cursor.execute(statement)
            print("  OK:", statement.strip().splitlines()[0][:100], flush=True)

def main():
    matches = list(root.rglob("Purchased Electricity FY21-FY25.csv"))

    if not matches:
        print("CSV not found inside CampusFix.")
        print("Searching Downloads...")
        matches = list(Path.home().joinpath("Downloads").rglob(
            "Purchased Electricity FY21-FY25.csv"
        ))

    if not matches:
        sys.exit("ERROR: Extract the dataset ZIP into Downloads first.")

    csv_path = matches[0]
    print("Found CSV:", csv_path)

    conn = connect()
    try:
        cur = conn.cursor()
        try:
            run_script(cur, "01_setup.sql")

            # Run the load setup, but not COPY until after PUT.
            load_sql = (sql_dir / "02_load.sql").read_text(encoding="utf-8-sig")
            before_copy = load_sql.split("COPY INTO CAMPUSFIX.RAW.PURCHASED_ELECTRICITY")[0]

            for statement, _ in snowflake.connector.util_text.split_statements(
                __import__("io").StringIO(before_copy)
            ):
                if statement.strip() and any(line.strip() and not line.lstrip().startswith('--') for line in statement.splitlines()):
                    cur.execute(statement)

            print("\nUploading CSV to Snowflake...", flush=True)
            put_path = csv_path.resolve().as_posix()
            cur.execute(
                f"PUT 'file://{put_path}' @CAMPUSFIX.RAW.LOAD_STAGE "
                "AUTO_COMPRESS=TRUE OVERWRITE=TRUE"
            )
            print("Upload result:", cur.fetchall(), flush=True)

            print("\nLoading CSV...", flush=True)
            cur.execute("""
                COPY INTO CAMPUSFIX.RAW.PURCHASED_ELECTRICITY
                FROM @CAMPUSFIX.RAW.LOAD_STAGE
                PATTERN = '.*Purchased Electricity FY21-FY25.*'
                FILE_FORMAT = (FORMAT_NAME = CAMPUSFIX.RAW.CSV_FF)
                ON_ERROR = ABORT_STATEMENT
            """)
            print("COPY result:", cur.fetchall(), flush=True)

            cur.execute("SELECT COUNT(*) FROM CAMPUSFIX.RAW.PURCHASED_ELECTRICITY")
            count = cur.fetchone()[0]
            print("RAW ROWS:", count, flush=True)
            if count != 34419:
                sys.exit(f"STOP: Expected 34419 rows, got {count}")

            run_script(cur, "03_clean.sql")
            run_script(cur, "04_anomalies.sql")
            run_script(cur, "05_validate.sql")

            cur.execute("SELECT COUNT(*) FROM CAMPUSFIX.ANALYTICS.ANOMALIES")
            print("\nANOMALIES:", cur.fetchone()[0], flush=True)

            cur.execute("""
                SELECT ID, BUILDING, CHANGE_PCT, SEVERITY
                FROM CAMPUSFIX.ANALYTICS.ANOMALIES
                ORDER BY CHANGE_PCT DESC
                LIMIT 5
            """)
            for row in cur.fetchall():
                print(row)

            print("\nCAMPUSFIX SNOWFLAKE PIPELINE COMPLETE", flush=True)
        finally:
            cur.close()
    finally:
        conn.close()

if __name__ == "__main__":
    main()
