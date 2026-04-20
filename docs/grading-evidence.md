# Evidence Collection Sheet

## Incident 1: RAG Slow

**Incident:**  
P95 latency tăng từ ~770ms lên ~13,000ms (≈17x).

**Metrics:**  
Dashboard “Latency” cho thấy toàn bộ request tăng mạnh lên ~13s, vượt xa SLO (~1s). Không có error nhưng throughput bị ảnh hưởng nghiêm trọng.

**Traces:**  
Trong Langfuse:
- Span **RAG / retrieval** chiếm gần như toàn bộ thời gian (~12–13s)
- Các span khác (LLM, routing) vẫn bình thường

**Logs:**  
- Tất cả request đều có latency cao đồng đều (~13270ms)  
- Không có error → loại trừ network/random failure  
- Pattern đồng nhất → dấu hiệu của artificial delay  

**Root Cause:**  
Incident `rag_slow` được bật → inject delay vào bước retrieval (sleep hoặc slow vector DB).  
Khắc phục bằng cách disable incident hoặc tối ưu retrieval pipeline.

---

## Incident 2: Tool Failure

**Incident:**  
Error rate tăng từ ~0% lên 100% (toàn bộ request trả về 500).

**Metrics:**  
- Error rate spike lên 100%  
- Latency giảm mạnh (~15–30ms) do fail sớm  

**Traces:**  
Trong Langfuse:
- Trace bị fail ngay tại step đầu (tool execution)  
- Không có downstream spans (LLM không được gọi)  

**Logs:**  
- Status: `[500]`  
- `request_id = None` → fail trước khi trace được tạo  
- Latency rất thấp (~20ms) → crash ngay lập tức  

**Root Cause:**  
Incident `tool_fail` được bật → tool layer bị crash (raise exception).  
Khắc phục: disable incident hoặc fix exception handling trong tool.

---

## Incident 3: Cost Spike

**Incident:**  
Chi phí/token usage tăng bất thường trong khi latency giữ nguyên (~770ms).

**Metrics:**  
- Latency: không đổi  
- Cost/token usage: tăng mạnh  

**Traces:**  
Trong Langfuse:
- Span LLM có:
  - input tokens tăng  
  - output tokens tăng  
- Payload lớn hơn bình thường  

**Logs:**  
- Latency không đổi (~770ms)  
- Không có error  
- Pattern giống normal → chỉ khác ở token usage  

**Root Cause:**  
Incident `cost_spike` được bật → prompt/context bị inflate (ví dụ: thêm nhiều documents trong RAG hoặc prompt duplication).

Khắc phục:
- Giới hạn context size  
- Kiểm tra prompt construction  
- Disable incident  


## Required screenshots
- Langfuse trace list with >= 10 traces: [Langfuse_tracing](/screenshot/trace_list.png)

- JSON logs showing correlation_id, log line with PII redaction: 

```json
{
  "service": "api",
  "payload": {
    "message_preview": "Quy trình đặt lịch xét nghiệm máu như thế nào? Email liên hệ: [REDACTED_EMAIL]"
  },
  "event": "request_received",
  "user_id_hash": "75af07890985",
  "feature": "lab_test",
  "session_id": "s04",
  "env": "dev",
  "correlation_id": "req-8a3e6201",
  "model": "mock-llm",
  "level": "info",
  "ts": "2026-04-20T08:52:56.683645Z"
}
```
- Dashboard with 6 panels

  - [Image 1](/screenshot/dashboard1.png)
  - [Image 2](/screenshot/dashboard2.png)


