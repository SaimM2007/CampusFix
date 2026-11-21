from api_routes import router
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from snowflake_client import execute_query
from cortex import complete

app = FastAPI(title="CampusFix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CampusFix"}


@app.get("/api/snowflake-test")
def snowflake_test():
    try:
        rows = execute_query("SELECT CURRENT_USER(), CURRENT_VERSION()")
        return {
            "status": "connected",
            "user": rows[0][0],
            "version": rows[0][1],
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.get("/api/cortex-test")
def cortex_test():
    try:
        response = complete(
            "Reply with exactly: CampusFix Cortex is working."
        )
        return {"status": "ok", "response": response}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))




@app.get("/api/anomalies")
def anomalies():
    try:
        rows = execute_query("""
            SELECT ID, BUILDING, BUILDING_ID, CAMPUS, PERIOD,
                   METRIC, CURRENT_VALUE, BASELINE_VALUE,
                   CHANGE_PCT, SEVERITY, STATUS,
                   DATA_QUALITY_NOTES, EXPLANATION
            FROM CAMPUSFIX.ANALYTICS.ANOMALIES
            ORDER BY CHANGE_PCT DESC
        """)

        columns = [
            "id", "building", "building_id", "campus", "period",
            "metric", "current_value", "baseline_value",
            "change_pct", "severity", "status",
            "data_quality_notes", "explanation"
        ]

        return {
            "source": "snowflake",
            "anomalies": [
                dict(zip(columns, row))
                for row in rows
            ]
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


app.include_router(router)
