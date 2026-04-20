"""
app/agent.py  —  Member B: @observe() Decorators & Trace Enrichment
====================================================================
Healthcare context: every message may contain patient CCCD, phone numbers,
or full names (e.g. "Nguyễn Văn A, CCCD 012345678").
ALL inputs/outputs written to Langfuse MUST be scrubbed first.

Trace structure produced in Langfuse waterfall:
  agent.run          <- root SPAN  (total pipeline latency)
  |-- rag.retrieve   <- child SPAN (RAG latency -- catches rag_slow incident)
  `-- llm.generate   <- child GENERATION (token bars, cost column in UI)

Tags attached to every trace (filterable in Langfuse UI):
  lab | feature:<n> | model:<n> | env:<dev|prod> | domain:healthcare
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass

from . import metrics
from .mock_llm import FakeLLM, FakeResponse
from .mock_rag import retrieve
from .pii import hash_user_id, summarize_text
from .tracing import flush, langfuse_context, observe


# ---------------------------------------------------------------------------
# Healthcare feature classifier
# ---------------------------------------------------------------------------

_FEATURE_TAGS: dict[str, str] = {
    "appointment": "feature:appointment",
    "medication":  "feature:medication",
    "lab_test":    "feature:lab_test",
    "qa":          "feature:qa",
    "summary":     "feature:summary",
}

def _feature_tag(feature: str) -> str:
    return _FEATURE_TAGS.get(feature, f"feature:{feature}")


# ---------------------------------------------------------------------------
# Result schema
# ---------------------------------------------------------------------------

@dataclass
class AgentResult:
    answer: str
    latency_ms: int
    tokens_in: int
    tokens_out: int
    cost_usd: float
    quality_score: float


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class LabAgent:
    def __init__(self, model: str = "claude-sonnet-4-5") -> None:
        self.model = model
        self.llm = FakeLLM(model=model)

    @observe(name="agent.run")
    def run(
        self,
        user_id: str,
        feature: str,
        session_id: str,
        message: str,
    ) -> AgentResult:
        started = time.perf_counter()

        docs     = self._retrieve_docs(message)
        prompt   = f"Feature={feature}\nDocs={docs}\nQuestion={message}"
        response = self._generate_response(prompt)

        quality_score = self._heuristic_quality(message, response.text, docs)
        latency_ms    = int((time.perf_counter() - started) * 1000)
        cost_usd      = self._estimate_cost(
            response.usage.input_tokens, response.usage.output_tokens
        )

        # Enrich ROOT TRACE
        langfuse_context.update_current_trace(
            name=f"healthcare/{feature}",
            user_id=hash_user_id(user_id),      # hashed -- never raw PII
            session_id=session_id,
            tags=[
                "lab",
                "domain:healthcare",
                _feature_tag(feature),
                f"model:{self.model}",
                f"env:{os.getenv('APP_ENV', 'dev')}",
            ],
            metadata={
                "latency_ms":    latency_ms,
                "cost_usd":      cost_usd,
                "quality_score": quality_score,
                "doc_count":     len(docs),
                "feature":       feature,
            },
            input=summarize_text(message),      # PII scrubbed
            output=summarize_text(response.text),
        )

        # Enrich ROOT OBSERVATION (agent.run span)
        langfuse_context.update_current_observation(
            metadata={
                "doc_count":      len(docs),
                "query_preview":  summarize_text(message),
                "answer_preview": summarize_text(response.text),
                "quality_score":  quality_score,
            },
            usage_details={
                "input":  response.usage.input_tokens,
                "output": response.usage.output_tokens,
            },
        )

        metrics.record_request(
            latency_ms=latency_ms,
            cost_usd=cost_usd,
            tokens_in=response.usage.input_tokens,
            tokens_out=response.usage.output_tokens,
            quality_score=quality_score,
        )

        return AgentResult(
            answer=response.text,
            latency_ms=latency_ms,
            tokens_in=response.usage.input_tokens,
            tokens_out=response.usage.output_tokens,
            cost_usd=cost_usd,
            quality_score=quality_score,
        )

    @observe(name="rag.retrieve")
    def _retrieve_docs(self, message: str) -> list[str]:
        docs = retrieve(message)
        langfuse_context.update_current_observation(
            input=summarize_text(message),          # scrub patient message
            output="; ".join(docs)[:300],
            metadata={
                "doc_count": len(docs),
                "cache_hit": docs != [
                    "No domain document matched. Use general fallback answer."
                ],
            },
        )
        return docs

    @observe(name="llm.generate", as_type="generation")
    def _generate_response(self, prompt: str) -> FakeResponse:
        response = self.llm.generate(prompt)
        langfuse_context.update_current_observation(
            model=self.model,
            input=summarize_text(prompt, max_len=300),
            output=summarize_text(response.text),
            usage_details={
                "input":  response.usage.input_tokens,
                "output": response.usage.output_tokens,
            },
            metadata={
                "model_reported": response.model,
                "output_chars":   len(response.text),
            },
        )
        return response

    def _estimate_cost(self, tokens_in: int, tokens_out: int) -> float:
        input_cost  = (tokens_in  / 1_000_000) * 3
        output_cost = (tokens_out / 1_000_000) * 15
        return round(input_cost + output_cost, 6)

    def _heuristic_quality(
        self, question: str, answer: str, docs: list[str]
    ) -> float:
        score = 0.5
        if docs:
            score += 0.2
        if len(answer) > 40:
            score += 0.1
        if question.lower().split()[0:1] and any(
            token in answer.lower() for token in question.lower().split()[:3]
        ):
            score += 0.1
        if "[REDACTED" in answer:
            score -= 0.2
        return round(max(0.0, min(1.0, score)), 2)