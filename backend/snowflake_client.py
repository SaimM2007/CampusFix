import os
import snowflake.connector
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    return snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        user=os.getenv("SNOWFLAKE_USER"),
        authenticator="OAUTH_AUTHORIZATION_CODE",
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
    )


def execute_query(query, params=None):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        try:
            cursor.execute(query, params)
            if cursor.description:
                return cursor.fetchall()
            return []
        finally:
            cursor.close()
    finally:
        conn.close()
