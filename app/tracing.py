"""
app/tracing.py  —  Member B: Langfuse SDK Configuration
=========================================================
Responsibilities of this file (Đoàn Nam Sơn):
  1. Import and re-export `observe` + `langfuse_context` so the rest of
     the app has a single, safe import point.
  2. Explicitly initialise a Langfuse client on module load so that:
       - Misconfigured keys fail fast (at startup, not mid-request).
       - The `auth_check()` result is logged and visible in the startup log.
       - A `flush()` helper is available for graceful shutdown.
  3. Provide a no-op fallback so the app still runs in environments where
     the Langfuse package is not installed or keys are absent.

Environment variables consumed (set in .env):
  LANGFUSE_PUBLIC_KEY   pk-lf-xxxxxxxx…
  LANGFUSE_SECRET_KEY   sk-lf-xxxxxxxx…
  LANGFUSE_HOST         https://cloud.langfuse.com   (default)
"""
from __future__ import annotations

import logging
import os
from typing import Any
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)
logger.info("TRACING FILE LOADED")
# ---------------------------------------------------------------------------
# Attempt real SDK import
# ---------------------------------------------------------------------------

try:
    from langfuse import Langfuse
    from langfuse.decorators import observe, langfuse_context

    _KEYS_PRESENT = bool(
        os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY")
    )
    if _KEYS_PRESENT:
        # Explicit client — reads env vars automatically.
        # Creating it here (not lazily) means a wrong key surfaces at startup.
        _client = Langfuse(
            public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
            secret_key=os.environ["LANGFUSE_SECRET_KEY"],
            host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
        )

        

        # --- Auth check -------------------------------------------------------
        # Verifies network reachability + key validity.
        # Logs a WARNING (not an exception) so a bad key doesn't crash the app
        # on startup — it degrades gracefully to no-op tracing.
        try:
            ok = _client.auth_check()
            if ok:
                logger.info(
                    "Langfuse connection verified. "
                    "Host=%s  Project visible in Langfuse UI.",
                    os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
                )
            else:
                logger.warning(
                    "Langfuse auth_check returned False. "
                    "Traces will NOT appear in the UI. "
                    "Double-check LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY."
                )
        except Exception as exc:
            logger.warning("Langfuse auth_check failed: %s", exc)

    else:
        _client = None
        logger.warning(
            "LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY is not set. "
            "Tracing is DISABLED. Set them in .env to enable."
        )

    _SDK_AVAILABLE = True
    print("Không lỗi import")

except ImportError as e:
    # Package not installed — provide stubs so app still imports cleanly.
    print("Có lỗi import")
    _SDK_AVAILABLE = False
    _client = None
    def observe(*args: Any, **kwargs: Any):  # type: ignore[misc]
        """No-op decorator used when langfuse package is absent."""
        def decorator(func: Any) -> Any:
            return func
        return decorator

    class _DummyContext:  # noqa: D101
        def update_current_trace(self, **kwargs: Any) -> None:
            return None

        def update_current_observation(self, **kwargs: Any) -> None:
            return None

        def flush(self) -> None:
            return None

    langfuse_context = _DummyContext()  # type: ignore[assignment]
    logger.warning("langfuse package not installed. Tracing disabled.")
    


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def tracing_enabled() -> bool:
    """Return True when the SDK is installed AND keys are configured."""
    return _SDK_AVAILABLE and bool(
        os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY")
    )


def flush() -> None:
    """
    Force-flush all pending traces to the Langfuse backend.

    Call this:
      - In the FastAPI @app.on_event("shutdown") handler.
      - After any test suite that sends traces synchronously.

    Without a flush, traces buffered in memory may be lost when
    uvicorn --reload kills the worker process between requests.
    """
    if _client is not None:
        try:
            _client.flush()
            logger.debug("Langfuse flush completed.")
        except Exception as exc:
            logger.warning("Langfuse flush error: %s", exc)
    elif tracing_enabled():
        # Fallback: flush via the decorator context (works without explicit client)
        try:
            langfuse_context.flush()
        except Exception:
            pass