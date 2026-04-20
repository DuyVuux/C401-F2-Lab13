# Dashboard System Context

## 1. System Overview
The Day 13 Observability Lab repository serves as the backend engine for a healthcare-focused, LLM-powered chatbot. It features a robust observability pipeline, including custom tracking wrappers for `Langfuse` integrations, PII scrubbing before logging, detailed metric aggregations (latency, traffic, cost, quality), and a configurable simulated incident manager. The system exposes RESTful API endpoints for interaction, metrics collection, and simulated failure injection, which act as the foundation for the upcoming front-end monitoring dashboard architecture.

## 2. Tech Stack & Exact Versions
No frontend framework is currently installed; the repository functions purely as an overarching API backend.
- **Backend Framework**: `fastapi` (>=0.118.0)
- **ASGI Server**: `uvicorn[standard]` (>=0.37.0)
- **Data Validation & Typing**: `pydantic` (>=2.11.4)
- **Observability SDK**: `langfuse` (>=3.2.1)
- **Structured Logging**: `structlog` (>=25.4.0)
- **HTTP Client**: `httpx` (>=0.28.1)
- **Testing**: `pytest` (>=8.3.5)
- **Environment Management**: `python-dotenv` (>=1.1.0)
- **Core language standard**: Python 3.9+ (implied via modern union typing syntax `|` and `dict[str, Any]` annotations).

## 3. Directory Architecture
*(Absolute Paths)*

**Backend Structure (`/home/duykhongngu28/massive/C401-F2-Lab13`)**
- `/home/duykhongngu28/massive/C401-F2-Lab13/app/`: Core backend layer.
  - `/app/main.py`: FastAPI endpoints and dependency wiring.
  - `/app/agent.py`: Langfuse-decorated AI Agent executing healthcare Q&A logic.
  - `/app/middleware.py`: Custom HTTP Request correlation middleware (`x-request-id`).
  - `/app/metrics.py`: In-memory metrics accumulator for SLO and dashboard presentation.
  - `/app/pii.py`: Text substitution patterns protecting PII entries (Regex-based).
  - `/app/schemas.py`: Pydantic definitions bridging inputs to responses.
  - `/app/tracing.py`: Fallback-ready Langfuse tracing init logic.
  - `/app/incidents.py`: Global switch system that forces failure modes.
- `/home/duykhongngu28/massive/C401-F2-Lab13/config/`: Configuration rulesets and thresholds.
  - `alert_rules.yaml`: Defines active monitoring alerts (P0 to P3 Severities).
  - `slo.yaml`: Explicit limits for expected SLI targets.
  - `logging_schema.json`: JSON schema strictly validating `structlog` records.
- `/home/duykhongngu28/massive/C401-F2-Lab13/docs/`: Lab documentation.
- `/home/duykhongngu28/massive/C401-F2-Lab13/data/`: Static log references and sample JSONLs.
- `/home/duykhongngu28/massive/C401-F2-Lab13/tests/`: Automated `.py` test files for API assurance.
- `/home/duykhongngu28/massive/C401-F2-Lab13/references/`: Reference components including `go-view` structure meant for frontend architectural inspiration.

## 4. Architectural Patterns
1. **Decoupled API/Collector Pattern**: The application centralizes state (such as metrics and incidents) via global objects exposed across REST endpoints. The dashboard will utilize a **Polling Data Flow** approach pulling from these endpoints.
2. **Decorator-Driven Tracing**: Methods within the AI execution (`agent.py`) heavily rely upon custom `@observe` extensions to wrap business logic, guaranteeing non-intrusive metadata enrichment.
3. **Poka-yoke Middleware Approach**: Ensures safety across processes. `CorrelationIdMiddleware` ensures tracing is passed implicitly without code payload disruption; `JsonlFileProcessor` ensures all outputs are dumped correctly to logs concurrently.
4. **Resiliency by Design**: The tracing logic accounts for environments intentionally missing API credentials (gracefully transitioning to standalone operation without crashing the app).

## 5. UI System & Design Constraints (From `dashboard-spec.md`)
*No active frontend exists, but the target Dashboard architecture has explicit requirements laid out in `docs/dashboard-spec.md` which must be strictly followed:*
- **Required Layer-2 Panels**:
  1. Latency (P50/P95/P99)
  2. Traffic (Request count or QPS)
  3. Error rate (with structured breakdown)
  4. Cost USD over time
  5. Tokens in/out volume
  6. Quality proxy (heuristic evaluation)
- **Behavioural Specifications**:
  - Auto-refresh interval: `15 - 30 seconds`.
  - Default time span: `1 hour`.
  - Visuals: Must show fixed SLO lines/threshold markers clearly aligned to `slo.yaml`.
  - Layout Limits: **Maximum of 6-8 panels** displayed on the principal layer.
- **Incident Switch Entities**: Interactive variants necessary to toggle backend incident endpoints (`rag_slow`, `tool_fail`, `cost_spike`).

## 6. Data Layer & API Surface
Primary API Endpoints intended to pipe into Dashboard state providers.

- **`GET /health`**
  - **Returns**: `{"ok": bool, "tracing_enabled": bool, "incidents": dict[str, bool]}`
  - **Purpose**: Server vitality and checking active incident simulator state.
- **`GET /metrics`**
  - **Returns**: Formatted dict summarizing operations (used for primary chart population).
  - `{ traffic: int, latency_p50: float, latency_p95: float, latency_p99: float, avg_cost_usd: float, total_cost_usd: float, tokens_in_total: int, tokens_out_total: int, error_breakdown: dict[str, int], quality_avg: float }`
- **`POST /chat`**
  - **Body**: `ChatRequest (user_id: str, session_id: str, feature: str [qa/summary/etc], message: str)`
  - **Returns**: `ChatResponse (answer, correlation_id, latency_ms, tokens_in, tokens_out, cost_usd, quality_score)`
- **`POST /incidents/{name}/enable` & `POST /incidents/{name}/disable`**
  - **Params**: `name`: enum derived from `['rag_slow', 'tool_fail', 'cost_spike']`
  - **Returns**: Contextual updating dictionary mirroring `status()`.

## 7. Component, Scripts & Module Inventory
- **Operational Scripts (`/home/duykhongngu28/massive/C401-F2-Lab13/scripts/`)**: Includes `load_test.py` for traffic generation, `inject_incident.py` for mutating states, and `validate_logs.py`/`tracing_test.sh` for schema adherence verifications.
- **Test Suite (`/home/duykhongngu28/massive/C401-F2-Lab13/tests/`)**: Unit tests validating core schemas and PII scrubbing (`test_metrics.py`, `test_pii.py`).
- **Data Fixtures (`/home/duykhongngu28/massive/C401-F2-Lab13/data/`)**: JSON/L fixtures holding `sample_queries.jsonl`, `expected_answers.jsonl` and `incidents.json` to feed simulation events.
- **Backend Core**: 
  - `LabAgent`: The core LLM logic integration using Langfuse contexts.
  - `Metrics Aggregator`: Singleton variables collecting runtime variables state.
  - `Structlog Formatter`: Highly-specialized payload mutation (`scrub_text`).

## 8. Global Constraints & Standards
- **Strict PII Regulations**: All payloads recorded into backend state handlers (both metrics and log traces) MUST traverse through `scrub_text()` which redacts Vietnamese phone schemas, CCCD patterns, emails, and credit variables natively using regex prior to storage or external LLM API transition.
- **Explicit Type Validation**: Use of strict `pydantic` types forces exact type contracts for `chat` integration (especially `min_length` constraints and literal types).
- **Graceful Error Handling in APIs**: Unanticipated errors must map to specific `raise HTTPException` states whilst logging internally specifying incident correlations.
- **Correlation Integrity**: The HTTP header `x-request-id` anchors multi-layered logs. All frontend API interaction modules must capture this returned header to assist QA.
