import os
from snowflake_client import execute_query


def complete(prompt):
    model = os.getenv("CORTEX_MODEL", "llama3.1-8b")

    rows = execute_query(
        "SELECT AI_COMPLETE(%s, %s)",
        (model, prompt),
    )

    return rows[0][0]


def analyze_anomaly(anomaly, evidence=None):
    prompt = f"""
You are an energy analyst helping Rutgers University.

Anomaly:
{anomaly}

Evidence:
{evidence or "No external evidence collected yet."}

Explain the unusual energy consumption, possible causes,
and recommended human investigation steps.

Rules:
- Never invent measurements or sources.
- Never claim an equipment failure is confirmed.
- Clearly distinguish observations from hypotheses.
- Keep the response concise.
"""
    return complete(prompt)
