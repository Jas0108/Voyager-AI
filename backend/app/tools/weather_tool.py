"""
Weather Tool - Used by Planning Agent.
Wraps OpenWeatherMap via WeatherService.
"""
import logging
from langchain.tools import tool
from app.services.weather_service import weather_service
from app.utils.async_utils import run_sync

logger = logging.getLogger(__name__)


@tool
def get_weather(destination: str) -> dict:
    """
    Get current weather and 2-day forecast for a destination.
    Use this to make weather-aware itinerary decisions.
    Input: destination name (e.g., 'Tokyo', 'Kyoto')
    """
    logger.info(f"[weather_tool] Fetching weather for: {destination}")
    try:
        current = run_sync(weather_service.get_current_weather(destination))
        forecast = run_sync(weather_service.get_forecast(destination))
        return {"current": current, "forecast": forecast}
    except Exception as e:
        logger.error(f"[weather_tool] Error: {e}")
        return {"error": str(e), "destination": destination}
