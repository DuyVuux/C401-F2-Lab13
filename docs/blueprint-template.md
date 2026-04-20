# Day 13 Observability Lab Report

> **Instruction**: Fill in all sections below. This report is designed to be parsed by an automated grading assistant. Ensure all tags (e.g., `[GROUP_NAME]`) are preserved.

## 1. Team Metadata
- [GROUP_NAME]: C401-F2-Lab13-Group
- [REPO_URL]: https://github.com/DuyVuux/C401-F2-Lab13
- [MEMBERS]:
  - Member A: Trần Quang Quí | Role: Logging & PII
  - Member B: Đoàn Nam Sơn | Role: Tracing & Enrichment
  - Member C: Nhữ Gia Bách | Role: SLO & Alerts
  - Member D: Vũ Đức Duy | Role: Dashboard & Demo
  - Member E: Hoàng Vĩnh Giang | Role: Load Test & Incidents

---

## 2. Group Performance (Auto-Verified)
- [VALIDATE_LOGS_FINAL_SCORE]: 100/100
- [TOTAL_TRACES_COUNT]: 10+
- [PII_LEAKS_FOUND]: 0

---

## 3. Technical Evidence (Group)

### 3.1 Logging & Tracing
- [EVIDENCE_CORRELATION_ID_SCREENSHOT]: [Path to image]
- [EVIDENCE_PII_REDACTION_SCREENSHOT]: [Path to image]
- [EVIDENCE_TRACE_WATERFALL_SCREENSHOT]: [Path to image]
- [TRACE_WATERFALL_EXPLANATION]: Span `rag_retrieve` chiếm phần lớn latency (~120ms) trong mỗi request bình thường. Khi inject `rag_slow`, span này tăng lên ~13000ms, trong khi các span LLM và routing vẫn bình thường — chứng minh bottleneck nằm ở retrieval layer.

### 3.2 Dashboard & SLOs
- [DASHBOARD_6_PANELS_SCREENSHOT]: [Path to image]
- [SLO_TABLE]:
| SLI | Target | Window | Current Value |
|---|---:|---|---:|
| Latency P95 | < 3000ms | 28d | ~155ms |
| Error Rate | < 2% | 28d | 0% |
| Cost Budget | < $2.5/day | 1d | ~$0.04 |

### 3.3 Alerts & Runbook
- [ALERT_RULES_SCREENSHOT]: [Path to image]
- [SAMPLE_RUNBOOK_LINK]: docs/alerts.md

---

## 4. Incident Response (Group)
- [SCENARIO_NAME]: rag_slow
- [SYMPTOMS_OBSERVED]: P95 latency tăng từ ~155ms lên ~13000ms (≈84x). Dashboard latency panel spike rõ ràng. Không có error (status 200) nhưng throughput giảm mạnh.
- [ROOT_CAUSE_PROVED_BY]: Langfuse trace cho thấy span `rag_retrieve` chiếm ~12800ms/request. Log `correlation_id: req-*` ghi `latency_ms` cao đồng đều, không có error_type → loại trừ crash, xác định là artificial delay.
- [FIX_ACTION]: Gọi `POST /incidents/rag_slow/disable` để tắt incident. Latency trở về bình thường ngay lập tức.
- [PREVENTIVE_MEASURE]: Thiết lập alert `high_latency_p95` trigger khi P95 > 5000ms trong 30 phút. Thêm timeout cho RAG retrieval để tự động fail-fast thay vì block request.

---

## 5. Individual Contributions & Evidence

### Trần Quang Quí
- [TASKS_COMPLETED]: Implement correlation ID middleware (generate `x-request-id`, bind structlog contextvars, thêm response headers). Implement PII scrubbing processor (email, SĐT, CCCD, credit card). Enrich logs với user_id_hash, session_id, feature, model, env. validate_logs.py: 100/100.
- [EVIDENCE_LINK]: https://github.com/DuyVuux/C401-F2-Lab13/commit/1b9e621

### Đoàn Nam Sơn
- [TASKS_COMPLETED]: Cấu hình Langfuse SDK, gắn `@observe()` decorator vào agent/LLM functions. Update sample queries theo Healthcare domain.
- [EVIDENCE_LINK]: https://github.com/DuyVuux/C401-F2-Lab13/commit/85ecc75

### Nhữ Gia Bách
- [TASKS_COMPLETED]: Định nghĩa SLO (latency P95, error rate, uptime, cost, quality score). Cấu hình 5 alert rules với severity và runbook links. Viết runbook cho từng alert.
- [EVIDENCE_LINK]: https://github.com/DuyVuux/C401-F2-Lab13/commit/f0ee766

### Vũ Đức Duy
- [TASKS_COMPLETED]: Triển khai dashboard 6 panels. Thu thập grading evidence.
- [EVIDENCE_LINK]: https://github.com/DuyVuux/C401-F2-Lab13/commit/40a812d

### Hoàng Vĩnh Giang
- [TASKS_COMPLETED]: Chạy load test concurrency 5, inject incident `rag_slow` và `tool_fail`. Viết RCA cho 2 incidents. Cấu hình alert rules bổ sung.
- [EVIDENCE_LINK]: https://github.com/DuyVuux/C401-F2-Lab13/commit/05a5c08

---

## 6. Bonus Items (Optional)
- [BONUS_COST_OPTIMIZATION]: Hệ thống mock LLM giữ cost ~$0.002/request. Cost budget SLO được thiết lập ở $2.5/day.
- [BONUS_AUDIT_LOGS]: (Description + Evidence)
- [BONUS_CUSTOM_METRIC]: (Description + Evidence)
