"""
Weather Service - Encapsulates OpenWeatherMap HTTP calls.
"""
import httpx
import logging
from app.config import settings

logger = logging.getLogger(__name__)

WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"


class WeatherService:
    async def get_current_weather(self, destination: str) -> dict:
        if not settings.OPENWEATHER_API_KEY:
            return {"error": "Weather API key not configured", "destination": destination}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{WEATHER_BASE_URL}/weather",
                    params={
                        "q": destination,
                        "appid": settings.OPENWEATHER_API_KEY,
                        "units": "metric",
                    },
                )
                data = response.json()
                if response.status_code != 200:
                    return {"error": data.get("message", "Weather unavailable"), "destination": destination}
                return {
                    "destination": destination,
                    "temperature": data["main"]["temp"],
                    "feels_like": data["main"]["feels_like"],
                    "humidity": data["main"]["humidity"],
                    "description": data["weather"][0]["description"],
                    "icon": data["weather"][0]["icon"],
                    "wind_speed": data["wind"]["speed"],
                }
        except Exception as e:
            logger.error(f"Weather API failed for {destination}: {e}")
            return {"error": str(e), "destination": destination}

    async def get_forecast(self, destination: str) -> dict:
        if not settings.OPENWEATHER_API_KEY:
            return {"error": "Weather API key not configured"}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{WEATHER_BASE_URL}/forecast",
                    params={
                        "q": destination,
                        "appid": settings.OPENWEATHER_API_KEY,
                        "units": "metric",
                        "cnt": 16,  # 2-day forecast in 3h intervals
                    },
                )
                data = response.json()
                if response.status_code != 200:
                    return {"error": data.get("message", "Forecast unavailable")}
                forecasts = []
                for item in data.get("list", []):
                    forecasts.append({
                        "datetime": item["dt_txt"],
                        "temp": item["main"]["temp"],
                        "description": item["weather"][0]["description"],
                        "rain": item.get("rain", {}).get("3h", 0),
                    })
                return {"destination": destination, "forecast": forecasts}
        except Exception as e:
            logger.error(f"Forecast API failed: {e}")
            return {"error": str(e)}


weather_service = WeatherService()
