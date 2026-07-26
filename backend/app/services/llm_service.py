"""
LLM Service - The only place where the LLM is initialized.
Provider priority: Groq (free) → Gemini → None.
Provides a provider abstraction so switching models
requires changes in this file only.
"""
import logging
import json
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self._llm = None
        self._provider = None
        self._initialize()

    def _initialize(self):
        """Initialize the LLM provider. Tries Groq first, then Gemini."""

        # ── Try Groq (free tier, very fast) ──────────────────────────
        if settings.GROQ_API_KEY:
            try:
                from langchain_groq import ChatGroq
                self._llm = ChatGroq(
                    model=settings.GROQ_MODEL,
                    api_key=settings.GROQ_API_KEY,
                    temperature=0.3,
                )
                self._provider = "groq"
                logger.info(f"LLM initialized: Groq ({settings.GROQ_MODEL})")
                return
            except Exception as e:
                logger.warning(f"Groq initialization failed: {e}")

        # ── Try Gemini (fallback) ────────────────────────────────────
        if settings.GEMINI_API_KEY:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self._llm = ChatGoogleGenerativeAI(
                    model=settings.GEMINI_MODEL,
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.3,
                    convert_system_message_to_human=True,
                )
                self._provider = "gemini"
                logger.info(f"LLM initialized: Gemini ({settings.GEMINI_MODEL})")
                return
            except Exception as e:
                logger.warning(f"Gemini initialization failed: {e}")

        logger.error(
            "No LLM provider available! "
            "Set GROQ_API_KEY (free: console.groq.com) or GEMINI_API_KEY."
        )

    def get_llm(self):
        """Return the raw LLM instance for use with agents."""
        return self._llm

    @property
    def provider(self) -> Optional[str]:
        return self._provider

    def invoke(self, messages: list) -> str:
        """Invoke the LLM and return the response as a string."""
        if not self._llm:
            return "LLM not available. Please configure GROQ_API_KEY or GEMINI_API_KEY."
        try:
            response = self._llm.invoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"LLM invocation failed: {e}")
            return f"Error: Unable to get AI response. {str(e)}"

    def invoke_json(self, messages: list) -> Optional[dict]:
        """Invoke the LLM and attempt to parse the response as JSON."""
        raw = self.invoke(messages)
        try:
            # Strip markdown code fences if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                # Remove first and last lines (``` markers)
                cleaned = "\n".join(lines[1:-1])
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            try:
                start = raw.find("{")
                end = raw.rfind("}") + 1
                if start >= 0 and end > start:
                    return json.loads(raw[start:end])
            except json.JSONDecodeError:
                pass
            logger.warning(f"Failed to parse LLM response as JSON: {raw[:200]}")
            return None


# Singleton instance
llm_service = LLMService()
