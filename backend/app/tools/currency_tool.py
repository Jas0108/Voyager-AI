"""
Currency Tool - Used by Budget Agent.
Converts currencies using ExchangeRate API.
"""
import httpx
import logging
from langchain.tools import tool
from app.config import settings

logger = logging.getLogger(__name__)

EXCHANGERATE_BASE = "https://v6.exchangerate-api.com/v6"


@tool
def convert_currency(query_json: str) -> dict:
    """
    Convert an amount from one currency to another using live exchange rates.
    Input JSON: {"amount": 100, "from_currency": "JPY", "to_currency": "USD"}
    Returns: {"converted_amount": float, "rate": float, "from": str, "to": str}
    """
    import json
    logger.info(f"[currency_tool] Converting currency: {query_json}")

    try:
        params = json.loads(query_json)
        amount = float(params.get("amount", 0))
        from_currency = params.get("from_currency", "USD").upper()
        to_currency = params.get("to_currency", "USD").upper()
    except Exception as e:
        return {"error": f"Invalid JSON input: {str(e)}"}

    if from_currency == to_currency:
        return {
            "amount": amount,
            "converted_amount": amount,
            "rate": 1.0,
            "from": from_currency,
            "to": to_currency,
        }

    if not settings.EXCHANGERATE_API_KEY:
        return {
            "error": "ExchangeRate API key not configured",
            "note": "Configure EXCHANGERATE_API_KEY for real currency conversion",
            "amount": amount,
            "from": from_currency,
            "to": to_currency,
        }

    try:
        response = httpx.get(
            f"{EXCHANGERATE_BASE}/{settings.EXCHANGERATE_API_KEY}/pair/{from_currency}/{to_currency}/{amount}",
            timeout=10.0,
        )
        data = response.json()
        if data.get("result") == "success":
            return {
                "amount": amount,
                "converted_amount": round(data["conversion_result"], 2),
                "rate": data["conversion_rate"],
                "from": from_currency,
                "to": to_currency,
            }
        return {"error": data.get("error-type", "Conversion failed"), "from": from_currency, "to": to_currency}

    except Exception as e:
        logger.error(f"[currency_tool] Error: {e}")
        return {"error": str(e), "from": from_currency, "to": to_currency}
