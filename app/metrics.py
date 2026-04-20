from __future__ import annotations

import json
import os
from collections import Counter
from pathlib import Path
from statistics import mean

REQUEST_LATENCIES: list[int] = []
REQUEST_COSTS: list[float] = []
REQUEST_TOKENS_IN: list[int] = []
REQUEST_TOKENS_OUT: list[int] = []
ERRORS: Counter[str] = Counter()
TRAFFIC: int = 0
QUALITY_SCORES: list[float] = []

_METRICS_PATH = Path(os.getenv("METRICS_PATH", "data/metrics.json"))


def _load() -> None:
    global TRAFFIC
    if not _METRICS_PATH.exists():
        return
    try:
        d = json.loads(_METRICS_PATH.read_text())
        TRAFFIC = d.get("traffic", 0)
        REQUEST_LATENCIES.extend(d.get("latencies", []))
        REQUEST_COSTS.extend(d.get("costs", []))
        REQUEST_TOKENS_IN.extend(d.get("tokens_in", []))
        REQUEST_TOKENS_OUT.extend(d.get("tokens_out", []))
        ERRORS.update(d.get("errors", {}))
        QUALITY_SCORES.extend(d.get("quality_scores", []))
    except Exception:
        pass


def _save() -> None:
    _METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _METRICS_PATH.write_text(json.dumps({
        "traffic": TRAFFIC,
        "latencies": REQUEST_LATENCIES,
        "costs": REQUEST_COSTS,
        "tokens_in": REQUEST_TOKENS_IN,
        "tokens_out": REQUEST_TOKENS_OUT,
        "errors": dict(ERRORS),
        "quality_scores": QUALITY_SCORES,
    }))


# Load persisted metrics on import
_load()


def record_request(latency_ms: int, cost_usd: float, tokens_in: int, tokens_out: int, quality_score: float) -> None:
    global TRAFFIC
    TRAFFIC += 1
    REQUEST_LATENCIES.append(latency_ms)
    REQUEST_COSTS.append(cost_usd)
    REQUEST_TOKENS_IN.append(tokens_in)
    REQUEST_TOKENS_OUT.append(tokens_out)
    QUALITY_SCORES.append(quality_score)
    _save()


def record_error(error_type: str) -> None:
    ERRORS[error_type] += 1
    _save()


def percentile(values: list[int], p: int) -> float:
    if not values:
        return 0.0
    items = sorted(values)
    idx = max(0, min(len(items) - 1, round((p / 100) * len(items) + 0.5) - 1))
    return float(items[idx])


def snapshot() -> dict:
    return {
        "traffic": TRAFFIC,
        "latency_p50": percentile(REQUEST_LATENCIES, 50),
        "latency_p95": percentile(REQUEST_LATENCIES, 95),
        "latency_p99": percentile(REQUEST_LATENCIES, 99),
        "avg_cost_usd": round(mean(REQUEST_COSTS), 4) if REQUEST_COSTS else 0.0,
        "total_cost_usd": round(sum(REQUEST_COSTS), 4),
        "tokens_in_total": sum(REQUEST_TOKENS_IN),
        "tokens_out_total": sum(REQUEST_TOKENS_OUT),
        "error_breakdown": dict(ERRORS),
        "quality_avg": round(mean(QUALITY_SCORES), 4) if QUALITY_SCORES else 0.0,
    }
