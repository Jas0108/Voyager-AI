"""
Budget Tool - Used by Budget Agent.
Pure Python budget calculator - no external API needed.
"""
import logging
from langchain.tools import tool
from datetime import date, datetime

logger = logging.getLogger(__name__)


@tool
def calculate_budget(query_json: str) -> dict:
    """
    Calculate budget metrics for a trip.
    Input JSON:
    {
        "total_budget": 2000.0,
        "total_spent": 450.0,
        "start_date": "2025-01-10",
        "end_date": "2025-01-15",
        "today": "2025-01-12"
    }
    Returns remaining budget, daily allowance, days left, and spending forecast.
    """
    import json
    logger.info(f"[budget_tool] Calculating budget: {query_json}")

    try:
        params = json.loads(query_json)
        total_budget = float(params.get("total_budget", 0))
        total_spent = float(params.get("total_spent", 0))
        start_date_str = params.get("start_date")
        end_date_str = params.get("end_date")
        today_str = params.get("today", date.today().isoformat())
    except Exception as e:
        return {"error": f"Invalid JSON input: {str(e)}"}

    remaining_budget = total_budget - total_spent

    # Calculate days
    try:
        start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        today = datetime.strptime(today_str, "%Y-%m-%d").date()
        total_days = max((end - start).days, 1)
        days_elapsed = max((today - start).days, 0)
        days_remaining = max((end - today).days, 0)
    except Exception as e:
        return {"error": f"Invalid date format: {str(e)}"}

    # Budget calculations
    daily_spent_avg = total_spent / max(days_elapsed, 1)
    daily_allowance_remaining = remaining_budget / max(days_remaining, 1) if days_remaining > 0 else 0
    projected_total_spend = daily_spent_avg * total_days

    status = "on_track"
    if projected_total_spend > total_budget:
        status = "over_budget"
    elif projected_total_spend > total_budget * 0.9:
        status = "near_limit"

    return {
        "total_budget": total_budget,
        "total_spent": total_spent,
        "remaining_budget": round(remaining_budget, 2),
        "days_total": total_days,
        "days_elapsed": days_elapsed,
        "days_remaining": days_remaining,
        "daily_spent_avg": round(daily_spent_avg, 2),
        "daily_allowance_remaining": round(daily_allowance_remaining, 2),
        "projected_total_spend": round(projected_total_spend, 2),
        "budget_status": status,
        "percentage_used": round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0,
    }
