import os
from decimal import Decimal

from fastapi import APIRouter, HTTPException
from snowflake_client import execute_query

router = APIRouter(prefix="/api")


def to_json(value):
    if isinstance(value, Decimal):
        return float(value)
    return value


def query_dicts(sql, columns, params=None):
    rows = execute_query(sql, params)
    return [
        {name: to_json(value) for name, value in zip(columns, row)}
        for row in rows
    ]


ANOMALY_COLUMNS = [
    "id", "building", "building_id", "campus", "period",
    "metric", "current_value", "baseline_value",
    "change_pct", "severity", "status",
    "data_quality_notes", "explanation"
]

ANOMALY_SQL = """
    SELECT ID, BUILDING, BUILDING_ID, CAMPUS, PERIOD,
           METRIC, CURRENT_VALUE, BASELINE_VALUE,
           CHANGE_PCT, SEVERITY, STATUS,
           DATA_QUALITY_NOTES, EXPLANATION
    FROM CAMPUSFIX.ANALYTICS.ANOMALIES
"""


def get_anomaly(anomaly_id):
    rows = query_dicts(
        ANOMALY_SQL + " WHERE ID = %s",
        ANOMALY_COLUMNS,
        (anomaly_id,)
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return rows[0]


@router.get("/overview")
def overview():
    try:
        rows = execute_query("""
            SELECT
                COUNT(*) AS total,
                COUNT_IF(SEVERITY = 'high') AS high,
                COUNT_IF(SEVERITY = 'medium') AS medium,
                COUNT_IF(SEVERITY = 'low') AS low,
                COUNT(DISTINCT BUILDING_ID) AS buildings,
                ROUND(AVG(CHANGE_PCT), 2) AS avg_change
            FROM CAMPUSFIX.ANALYTICS.ANOMALIES
        """)

        total, high, medium, low, buildings, avg_change = rows[0]

        return {
            "source": "snowflake",
            "total_anomalies": total,
            "high_severity": high,
            "medium_severity": medium,
            "low_severity": low,
            "affected_buildings": buildings,
            "average_change_pct": to_json(avg_change)
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/anomalies/{anomaly_id}")
def anomaly_detail(anomaly_id: str):
    try:
        return get_anomaly(anomaly_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/anomalies/{anomaly_id}/investigate")
def investigate(anomaly_id: str):
    try:
        anomaly = get_anomaly(anomaly_id)

        prompt = f"""
You are CampusFix, an energy analytics assistant for Rutgers University.

Analyze this purchased-electricity anomaly using only the supplied facts.

Building: {anomaly['building']}
Campus: {anomaly['campus']}
Fiscal year: {anomaly['period']}
Current matched electricity usage: {anomaly['current_value']} kWh
Previous matched electricity usage: {anomaly['baseline_value']} kWh
Change: {anomaly['change_pct']}%
Severity: {anomaly['severity']}

Data quality and methodology:
{anomaly['data_quality_notes']}

Provide:
1. A short explanation of what changed.
2. Two or three possible causes to investigate.
3. Three practical follow-up actions.
4. A confidence/limitations statement.

IMPORTANT:
- Do not claim an equipment fault has been confirmed.
- Do not invent maintenance records, weather data, or occupancy data.
- Clearly label potential causes as hypotheses.
- Explain any billing-period or meter-coverage limitations.
- Keep the answer under 250 words.
"""

        model = os.getenv("CORTEX_MODEL", "llama3.1-8b")

        rows = execute_query(
            "SELECT AI_COMPLETE(%s, %s)",
            (model, prompt)
        )

        explanation = rows[0][0]

        return {
            "anomaly_id": anomaly_id,
            "building": anomaly["building"],
            "model": model,
            "status": "completed",
            "explanation": explanation,
            "anomaly": anomaly
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))
