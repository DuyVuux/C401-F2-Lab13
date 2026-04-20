# Day 13 — Monitoring, Logging & Observability: Context Rules

> Tài liệu này là bộ quy tắc kỹ thuật tinh gọn từ bài giảng Day 13 (AICB-P1, VinUniversity 2026).
> Mục đích: làm context cho AI thực hiện Lab 13 — gắn observability stack vào FastAPI agent.

---

## 1. Ba Pillars of Observability

| Pillar | Vai trò | Dùng khi |
|---|---|---|
| **Metrics** | Số liệu aggregate (latency, rate, cost) | Alert, dashboard |
| **Logs** | Event chi tiết (JSON structured) | Debug, audit |
| **Traces** | Hành trình request end-to-end | Root-cause analysis |

**Quy tắc:** Metrics → phát hiện vấn đề. Traces → xác định bước lỗi. Logs → tìm root cause. Cần cả 3.

---

## 2. Six Signals Cho AI Agent

Google SRE 4 Golden Signals + 2 AI-specific:

1. **Latency** — P50/P95/P99 (quan trọng: P99, không phải average)
2. **Traffic** — requests/giây (QPS)
3. **Errors** — error rate % theo loại (API 5xx, timeout, tool fail, guardrail block)
4. **Saturation** — tài nguyên còn bao nhiêu
5. **Cost** — $/request, $/user, token usage (AI-specific)
6. **Quality** — hallucination rate, CSAT, regenerate rate (AI-specific)

---

## 3. Structured Logging — Quy Tắc Bắt Buộc

### Log Schema 3 Tier

| Tier 1: Required | Tier 2: Context | Tier 3: Payload |
|---|---|---|
| `ts` (ISO 8601) | `user_id` (hashed) | `latency_ms` |
| `level` (INFO/WARN/ERROR) | `session_id` | `tokens_in/out` |
| `correlation_id` | `feature` | `cost_usd` |
| `service` | `model` | `error_type` |
| `event` | `env` | `tool_name` |

### structlog Setup Chuẩn

```python
import structlog, logging

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        scrub_event,  # PII scrubber PHẢI chạy TRƯỚC JSONRenderer
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    cache_logger_on_first_use=True,
)
```

### Correlation ID với contextvars

```python
from structlog.contextvars import bind_contextvars, clear_contextvars
import uuid

async def handle_request(request):
    clear_contextvars()
    bind_contextvars(
        correlation_id=str(uuid.uuid4())[:8],
        user_id=request.user_id,
        feature=request.feature,
    )
```

**Quy tắc:** Mỗi request phải có `correlation_id` duy nhất. Dùng HTTP header `X-Request-ID` hoặc W3C `traceparent` để propagate qua services.

### Log Levels

| Level | Khi nào | Production? |
|---|---|---|
| DEBUG | Dev only, full prompt/state | Không (sample 1%) |
| INFO | Normal flow, milestones | Có |
| WARN | Degraded nhưng hoạt động | Có |
| ERROR | Failed, cần attention | Có + alert |
| CRITICAL | System-level failure | Có + page |

---

## 4. PII Sanitization — Quy Tắc Nghiêm Ngặt

### KHÔNG được log

PII (tên, SĐT, CCCD, email), full prompt chứa sensitive data, API keys/tokens/secrets, credit card, full raw user input, DEBUG verbose ở production.

### Regex Scrubbing

```python
import re
PII_PATTERNS = {
    "email": r"[\w\.-]+@[\w\.-]+\.\w+",
    "phone_vn": r"(\+84|0)\d{9,10}",
    "cccd": r"\b\d{12}\b",
    "credit_card": r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b",
}
def scrub(text):
    for name, pattern in PII_PATTERNS.items():
        text = re.sub(pattern, f"[REDACTED_{name.upper()}]", text)
    return text
```

**Quy tắc:** Scrubber processor phải đặt TRƯỚC JSONRenderer trong structlog pipeline. Vi phạm GDPR/PDPA/CCPA phạt tới 4% revenue toàn cầu.

---

## 5. Distributed Tracing — Langfuse Integration

### Terminology

- **Trace** = toàn bộ request end-to-end (`trace_id`)
- **Span** = 1 đơn vị công việc (`span_id`, `parent_span_id`)
- **Context propagation** = truyền `trace_id` qua HTTP headers

### Langfuse Integration Pattern

```python
from langfuse.decorators import observe, langfuse_context

@observe()
def rag_agent(query: str, user_id: str):
    langfuse_context.update_current_trace(
        user_id=user_id, tags=["prod", "rag"]
    )
    docs = retrieve(query)
    response = llm_call(query, docs)
    langfuse_context.update_current_observation(
        metadata={"doc_count": len(docs)},
        usage_details={
            "input": response.usage.input_tokens,
            "output": response.usage.output_tokens,
        },
    )
    return response.text
```

**Quy tắc:** Mọi LLM call phải có 3 tags tối thiểu: `user_id`, `feature`, `model`. Tối thiểu 10 traces trên Langfuse.

### OTel GenAI Semantic Conventions

| Attribute | Ý nghĩa |
|---|---|
| `gen_ai.system` | Provider: "anthropic", "openai" |
| `gen_ai.request.model` | Model name |
| `gen_ai.usage.input_tokens` | Input tokens |
| `gen_ai.usage.output_tokens` | Output tokens |
| `gen_ai.response.finish_reasons` | "stop", "length", "tool_use" |

### Bốn Bottleneck Patterns

| Pattern | Dấu hiệu | Fix |
|---|---|---|
| Sequential dependency | A→B→C, tổng = sum | Parallelize nếu không phụ thuộc |
| N+1 queries | Nhiều span ngắn cùng tên | Batch API / pre-fetch |
| Waiting (IO-bound) | Span dài, CPU idle | Parallelize, cache, timeout |
| Retry storm | Nhiều retry spans | Exponential backoff + circuit breaker |

---

## 6. SLI / SLO / SLA

| Thuật ngữ | Định nghĩa | Ví dụ |
|---|---|---|
| **SLI** | Metric đo lường được | P95 latency = 2.3s |
| **SLO** | Mục tiêu nội bộ | P95 ≤ 3s trong 99.5% thời gian (28 ngày) |
| **SLA** | Cam kết khách hàng, có phạt | 99% uptime, refund 10% nếu không |
| **Error Budget** | Dung sai cho phép | 100% − 99.5% = 0.5% = 3.6 giờ/tháng |

### Error Budget

| SLO | Downtime/tháng | Downtime/ngày |
|---|---|---|
| 99% | 7.2 giờ | 14.4 phút |
| 99.5% | 3.6 giờ | 7.2 phút |
| 99.9% | 43.2 phút | 1.44 phút |

**Quy tắc:** AI agent thực tế → SLO 99%–99.5% là đủ. Đừng hứa 99.99% khi LLM API chỉ 99.9%.

---

## 7. Alerting — Quy Tắc Thiết Kế

### Symptom-based, không phải Cause-based

| Sai (cause-based) | Đúng (symptom-based) |
|---|---|
| CPU > 80% | P95 latency > SLO |
| RAM > 90% | Error rate > 1% |
| LLM retry > 5 | Cost/hour > budget |

### Alert Rules Tối Thiểu Cho AI Agent

| Metric | Threshold | Severity | Action |
|---|---|---|---|
| Latency P95 | > 5s, 30 phút | P2 Warning | Investigate trace |
| Error rate | > 5%, 5 phút | P1 Critical | Rollback |
| Hourly cost | > budget × 2 | P2 Warning | Check users/features |
| Daily cost | > daily budget | P1 Critical | Kill switch |
| Tool call failure | > 10%, 15 phút | P2 Warning | Check tool provider |
| Uptime | < 99%, 1 giờ | P1 Critical | Incident response |

### Alert Anatomy Bắt Buộc

Mỗi alert phải có: title rõ ràng, severity (P1/P2/P3), impact statement, current value vs threshold, dashboard link, trace link, **runbook link**, on-call owner.

**Quy tắc:** Alert không có runbook = không dùng được. Alert không fire 90 ngày → xóa.

### Multi-Window Multi-Burn-Rate (Google SRE)

| Severity | Short window | Long window | Burn rate |
|---|---|---|---|
| Page (critical) | 5 phút | 1 giờ | 14.4x |
| Ticket (warn) | 30 phút | 6 giờ | 6x |

Alert fire khi **cả 2 window** cùng vượt threshold.

---

## 8. Dashboard — 3 Layers

| Layer | Nội dung | Đối tượng |
|---|---|---|
| **L1: Overview** | Health status, uptime, key alerts | Leadership |
| **L2: Detail** | 6 panels (bắt buộc) | Engineering |
| **L3: Drill-down** | Traces, log search, root cause | Debugging |

### Dashboard Layer 2 — 6 Panels Bắt Buộc

| Panel 1 | Panel 2 | Panel 3 |
|---|---|---|
| Latency P50/P95/P99 (time-series) | Traffic QPS (time-series) | Error rate % (time-series + breakdown) |

| Panel 4 | Panel 5 | Panel 6 |
|---|---|---|
| Cost $/hour (cumulative + forecast) | Tokens in/out (stacked) | Hallucination % (sampled) |

### Anti-patterns Cần Tránh

1. "Wall of metrics" — giới hạn 6–8 panels/layer
2. Time range mặc định quá dài — default 1 giờ cho ops
3. Không có baseline/threshold line — luôn vẽ đường SLO lên chart
4. Metric không có đơn vị — luôn label đầy đủ (USD, ms, %)
5. Không auto-refresh — 15–30s cho ops

---

## 9. Error Taxonomy

| Loại lỗi | Nguyên nhân | Cách handle |
|---|---|---|
| LLM API 5xx | Provider down/rate limit | Retry exponential backoff, fallback model |
| LLM timeout | Slow provider | Circuit breaker, client timeout < server |
| Tool call failed | External API lỗi | Retry, graceful degradation |
| Tool schema invalid | LLM sinh JSON lỗi | Re-prompt với error feedback |
| Guardrail block | Content policy vi phạm | Log + user-friendly message |
| Empty response | LLM refuse/filter | Alternate prompt, escalate to human |
| Context overflow | Input > limit | Truncate, summarize history |

---

## 10. Cost Engineering

### Cost Per Request Formula

```
Cost = (T_in / 10⁶) × P_in + (T_out / 10⁶) × P_out + (T_cache / 10⁶) × P_cache
```

### Bốn Cost Optimization Patterns

| Pattern | Hiệu quả |
|---|---|
| **Prompt Caching** — cache system prompt tĩnh | Giảm 70% cost |
| **Model Routing** — dễ→Haiku, khó→Sonnet | Giảm 40–60% |
| **Semantic Cache** — query tương tự→cached | Hit rate 20–40% |
| **Batch API** — non-realtime batch giá 50% | 50% offline |

### Cost Attribution Tags Bắt Buộc

Mọi LLM call: `user_id`, `feature`, `model`. Thêm: `tenant_id`, `env`, `plan`.

---

## 11. Audit Log vs App Log

| | App Log | Audit Log |
|---|---|---|
| Mục đích | Debug, performance | Compliance, forensics |
| Retention | 30–90 ngày | 2–7 năm |
| Sampling | Có thể | Không — 100% |
| Mutability | Có thể sửa/xóa | Append-only |
| Access | Dev team | Restricted |

**Quy tắc:** Tách riêng audit log từ ngày đầu.

---

## 12. Tool Comparison

| Tool | Best for | OSS? |
|---|---|---|
| **Langfuse** | Self-host, framework-agnostic, full stack | Yes (MIT) |
| **LangSmith** | LangChain users | No |
| **Helicone** | Proxy, 0 code change | Yes (Apache) |
| **Arize Phoenix** | OTel-native, research | Yes (Apache) |

**Khuyến nghị cho Lab:** Langfuse (free cloud tier).

---

## 13. Troubleshooting Thường Gặp

| Triệu chứng | Cách xử lý |
|---|---|
| Trace không xuất hiện ở Langfuse | Check API key env var, bật `LANGFUSE_DEBUG=true` |
| Cost không được track | Model name phải khớp Langfuse pricing DB, cần `usage_details` |
| Correlation ID mất qua async | Dùng `contextvars`, `clear_contextvars` ở đầu mỗi request |
| PII leak dù đã scrub | Scrubber phải chạy TRƯỚC JSONRenderer trong processor chain |
| Dashboard trống | Kiểm tra time range filter, tag filter, data source connection |

---

## 14. Bảy Anti-patterns Cần Tránh

1. "We'll add monitoring later" — add ngay từ MVP
2. Log full prompts/responses — sanitize + sample
3. Alert trên mọi metric — chỉ alert khi cần hành động
4. Không có runbook — alert vô dụng lúc 3h sáng
5. Monitoring dev ≠ prod — config phải giống nhau
6. Chỉ đo performance, quên cost — FinOps từ đầu
7. Trust vendor mặc định — đọc docs trước khi deploy

---

## 15. Lab 13 Deliverables & Rubric

### Deliverables Bắt Buộc

| # | Deliverable | Tiêu chí |
|---|---|---|
| 1 | Structured logging pipeline | JSON, correlation ID, PII sanitized, 3 log levels |
| 2 | Langfuse integration | ≥ 10 traces với cost + latency + quality tags |
| 3 | Monitoring dashboard | 6 panels: 4 golden signals + cost + quality |
| 4 | SLO definition + alert rules | Symptom-based, có runbook link |
| 5 | Blueprint document | SLO table, architecture diagram, alert playbook |

### Rubric Chấm Điểm

| Hạng mục | Điểm |
|---|---|
| **Logging & Tracing (40%)** | |
| Structured JSON logs | 10 |
| Correlation ID propagate | 10 |
| PII sanitized | 10 |
| 10+ Langfuse traces | 10 |
| **Dashboard & Alerts (40%)** | |
| 6+ panels Layer 2 | 15 |
| SLO defined | 5 |
| 3 alert rules với runbook | 15 |
| Screenshot có data | 5 |
| **Blueprint (20%)** | |
| SLO table | 5 |
| Architecture diagram | 5 |
| Alert playbook | 5 |
| Cost & scaling plan | 5 |
| **Bonus (+10)** | |
| Cost optimization (prompt cache) | +3 |
| Quality metric (heuristic) | +3 |
| OTel auto-instrument | +2 |
| Audit logs tách riêng | +2 |

### Passing Criteria

- `validate_logs.py` ≥ 80/100
- ≥ 10 traces live trên Langfuse
- Dashboard đủ 6 panels
- Blueprint report đầy đủ
