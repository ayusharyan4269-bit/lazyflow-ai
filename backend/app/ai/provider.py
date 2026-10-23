"""LazyFlow AI - AI Provider abstraction.

Supports Ollama as the primary local inference runtime.
The provider interface is designed to be replaceable.
"""

import json
import logging
import re
from typing import Optional

import httpx

from app.ai.prompts import (
    TASK_EXTRACTION_SYSTEM, TASK_EXTRACTION_USER,
    SUMMARIZE_SYSTEM, SUMMARIZE_USER,
    FOLLOWUP_SYSTEM, FOLLOWUP_USER,
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIProviderError(Exception):
    """Raised when the AI provider encounters an error."""
    pass


class AIProvider:
    """Abstract base for AI providers."""

    async def check_status(self) -> dict:
        raise NotImplementedError

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError


class OllamaProvider(AIProvider):
    """Ollama local inference provider."""

    def __init__(
        self,
        base_url: str = None,
        model: str = None,
        timeout: int = None,
        max_tokens: int = None,
    ):
        self.base_url = (base_url or settings.ai_base_url).rstrip("/")
        self.model = model or settings.ai_model
        self.timeout = timeout or settings.ai_request_timeout
        self.max_tokens = max_tokens or settings.ai_max_tokens

    async def check_status(self) -> dict:
        """Check if Ollama is running and the model is available."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                # Check Ollama is running
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code != 200:
                    return {
                        "available": False,
                        "message": f"Ollama returned status {resp.status_code}. Is Ollama running?",
                    }

                # Check model is installed
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                # Normalize model names (ollama may add :latest)
                model_base = self.model.split(":")[0]
                found = any(
                    m.startswith(model_base) for m in models
                )
                if not found:
                    return {
                        "available": False,
                        "message": (
                            f"Model '{self.model}' is not installed. "
                            f"Run: ollama pull {self.model}\n"
                            f"Available models: {', '.join(models) if models else 'none'}"
                        ),
                    }

                return {
                    "available": True,
                    "message": f"Model '{self.model}' is ready for inference.",
                }

        except httpx.ConnectError:
            return {
                "available": False,
                "message": (
                    "Cannot connect to Ollama. Please ensure Ollama is installed and running.\n"
                    "Install: https://ollama.ai\n"
                    "Start: Run 'ollama serve' in a terminal."
                ),
            }
        except httpx.TimeoutException:
            return {
                "available": False,
                "message": "Connection to Ollama timed out. The service may be starting up.",
            }
        except Exception as e:
            return {
                "available": False,
                "message": f"Unexpected error checking Ollama: {str(e)[:200]}",
            }

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a response from the Ollama model."""
        try:
            # Use granular timeouts: fast connect, generous read for model loading + generation
            timeout = httpx.Timeout(connect=15.0, read=float(self.timeout), write=30.0, pool=15.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "stream": False,
                        "options": {
                            "num_predict": self.max_tokens,
                            "temperature": 0.3,
                        },
                    },
                )

                if resp.status_code != 200:
                    error_text = resp.text[:300]
                    raise AIProviderError(
                        f"Ollama returned status {resp.status_code}: {error_text}"
                    )

                data = resp.json()
                content = data.get("message", {}).get("content", "")
                if not content or not content.strip():
                    raise AIProviderError("Model returned empty response.")
                return content.strip()

        except httpx.ConnectError:
            raise AIProviderError(
                "Cannot connect to Ollama. Ensure it is running with 'ollama serve'."
            )
        except httpx.TimeoutException:
            raise AIProviderError(
                f"Model inference timed out after {self.timeout}s. "
                "This often happens on the first request when the model is loading into memory. "
                "Try again — subsequent requests are usually much faster. "
                "You can increase the timeout with the LAZYFLOW_AI_REQUEST_TIMEOUT environment variable."
            )
        except AIProviderError:
            raise
        except Exception as e:
            raise AIProviderError(f"Inference error: {str(e)[:300]}")


def get_provider() -> AIProvider:
    """Factory function to get the configured AI provider."""
    provider_name = settings.ai_provider.lower()
    if provider_name == "ollama":
        return OllamaProvider()
    else:
        raise ValueError(f"Unknown AI provider: {provider_name}. Supported: ollama")


def _extract_json_from_response(text: str) -> Optional[dict]:
    """Attempt to extract valid JSON from a model response.

    Models sometimes wrap JSON in markdown code fences or add explanatory text.
    This function tries multiple strategies to find the JSON.
    """
    # Strategy 1: Try direct parse
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Look for JSON in code fences
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: Find first { ... } block
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    return None


def validate_extracted_tasks(data: dict) -> dict:
    """Validate and sanitize model output for task extraction.

    Enforces schema, normalizes priorities, truncates fields,
    and rejects malformed records.
    """
    validated_tasks = []
    tasks_raw = data.get("tasks", [])

    if not isinstance(tasks_raw, list):
        tasks_raw = []

    for t in tasks_raw:
        if not isinstance(t, dict):
            continue

        title = t.get("title", "")
        if not isinstance(title, str) or not title.strip():
            continue

        title = title.strip()[:200]

        # Normalize priority
        priority = str(t.get("priority", "medium")).lower().strip()
        if priority not in ("high", "medium", "low"):
            priority = "medium"

        # Sanitize due_date — preserve original text, don't invent
        due_date = t.get("due_date")
        if due_date is not None:
            due_date = str(due_date).strip()[:50]
            if not due_date:
                due_date = None

        validated_tasks.append({
            "title": title,
            "description": str(t.get("description", ""))[:1000] if t.get("description") else None,
            "priority": priority,
            "due_date": due_date,
            "category": str(t.get("category", ""))[:50] if t.get("category") else None,
            "source_context": str(t.get("source_context", ""))[:500] if t.get("source_context") else None,
        })

    # Validate key_info
    key_info = data.get("key_info", [])
    if not isinstance(key_info, list):
        key_info = []
    key_info = [str(k)[:300] for k in key_info if isinstance(k, str) and k.strip()][:20]

    return {"tasks": validated_tasks, "key_info": key_info}


async def extract_tasks(content: str, max_retries: int = 1) -> dict:
    """Extract tasks from text using the AI provider.

    Returns validated dict with 'tasks' and 'key_info'.
    Retries once if JSON parsing fails.
    """
    provider = get_provider()
    user_prompt = TASK_EXTRACTION_USER.format(content=content[:settings.max_input_length])

    last_error = None
    for attempt in range(1 + max_retries):
        try:
            raw_response = await provider.generate(TASK_EXTRACTION_SYSTEM, user_prompt)
            parsed = _extract_json_from_response(raw_response)
            if parsed is None:
                last_error = "Model did not return valid JSON."
                logger.warning(f"JSON parse failed (attempt {attempt + 1}): {raw_response[:200]}")
                continue
            return validate_extracted_tasks(parsed)
        except AIProviderError:
            raise
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Task extraction attempt {attempt + 1} failed: {e}")

    raise AIProviderError(f"Failed to extract tasks after {1 + max_retries} attempts: {last_error}")


async def summarize_text(content: str, style: str = "key_points") -> str:
    """Summarize text using the AI provider."""
    provider = get_provider()
    user_prompt = SUMMARIZE_USER.format(
        content=content[:settings.max_input_length],
        style=style,
    )
    return await provider.generate(SUMMARIZE_SYSTEM, user_prompt)


async def draft_followup(context: str, task_title: str = None, tone: str = "professional") -> str:
    """Draft a follow-up message using the AI provider."""
    provider = get_provider()
    task_line = f"Related task: {task_title}" if task_title else ""
    user_prompt = FOLLOWUP_USER.format(
        context=context[:10000],
        tone=tone,
        task_line=task_line,
    )
    return await provider.generate(FOLLOWUP_SYSTEM, user_prompt)
