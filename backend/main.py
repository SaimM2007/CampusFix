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


@app.get("/api/overview")
def overview():
    return {
        "source": "demo",
        "total_anomalies": 0,
        "high_severity": 0,
        "total_buildings": 0,
    }


@app.get("/api/anomalies")
def anomalies():
    return {
        "source": "demo",
        "anomalies": [],
    }
