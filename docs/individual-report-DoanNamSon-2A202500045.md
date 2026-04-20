# Individual Report — Đoàn Nam Sơn
**Role:** Member B — Tracing & Tags  
**Lab:** Day 13 Observability — Healthcare Support Chatbot

---

## 1. Phần việc đảm nhận

### 1.1 Langfuse SDK Configuration (`app/tracing.py`)

**Vấn đề ban đầu:** File `tracing.py` trong template chỉ có một khối `try/import` thụ động — nếu API key sai hoặc không có mạng, app vẫn khởi động bình thường nhưng **toàn bộ traces bị mất âm thầm**, không có warning nào. Đây là loại lỗi khó phát hiện nhất vì không có exception, không có log đỏ — chỉ khi vào Langfuse UI mới biết mình không có gì.

**Giải pháp:** Viết lại `tracing.py` để SDK được khởi tạo **chủ động tại thời điểm import module** (tức là khi uvicorn start), không phải lazily khi request đầu tiên đến:

```python
_client = Langfuse(
    public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
    secret_key=os.environ["LANGFUSE_SECRET_KEY"],
    host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
)

ok = _client.auth_check()   # kiểm tra network + key validity ngay khi start
```

Ngay sau khi tạo client, gọi `auth_check()` để xác minh kết nối. Nếu key sai hoặc mạng lỗi, in ra `WARNING` ngay trong log khởi động — team nhìn vào terminal là biết ngay, không cần chờ đến khi gửi request.

**Trade-off quan trọng:** `auth_check()` thất bại được xử lý bằng `logger.warning()`, **không phải `raise`**. Lý do: nếu raise exception ở đây, Langfuse không kết nối được sẽ làm sập cả API server — điều này không chấp nhận được trong production. Hệ thống nên degrade gracefully: mất trace còn tốt hơn mất service.

**`flush()` helper — vấn đề không ai nghĩ đến cho đến khi mất traces:**  
Langfuse SDK không gửi traces đồng bộ sau mỗi request. SDK buffer traces trong memory và gửi theo batch trong background thread. Khi chạy `uvicorn --reload` (chế độ dev), mỗi lần save file code làm worker process bị kill — buffer chưa kịp flush sẽ mất toàn bộ. Tôi thêm một `flush()` helper public để `main.py` có thể gọi trong shutdown handler:

```python
def flush() -> None:
    if _client is not None:
        _client.flush()
```

Kết quả: hết tình trạng gửi 10 requests thấy 7 traces trong UI.

**Fallback no-op:** Nếu package `langfuse` chưa được `pip install` (ví dụ môi trường CI của Member C chưa setup), module vẫn import thành công nhờ `_DummyContext` và stub `observe()` — các decorator trở thành pass-through, app chạy bình thường, không lỗi.

---

### 1.2 `@observe()` Decorator — Cấu trúc 3 Span (`app/agent.py`)

**Vấn đề ban đầu:** Template chỉ có một `@observe()` duy nhất trên method `run()`. Langfuse UI chỉ thấy **một span phẳng** với tổng latency — không thể phân biệt được RAG đang chậm hay LLM đang chậm. Khi Member D inject incident `rag_slow`, tất cả mà team nhìn thấy là "request chậm", không biết chậm ở đâu.

**Giải pháp:** Tách pipeline thành 3 private methods, mỗi method có `@observe()` riêng, tạo ra waterfall 3 tầng trong Langfuse:

```
agent.run           ← root SPAN      (đo tổng latency từ đầu đến cuối)
├── rag.retrieve    ← child SPAN     (đo riêng RAG, bắt được rag_slow incident)
└── llm.generate   ← child GENERATION (đo riêng LLM, hiện token bars + cost)
```

**Quyết định thiết kế quan trọng nhất: `as_type="generation"`**

Decorator trên `_generate_response()` dùng tham số đặc biệt:
```python
@observe(name="llm.generate", as_type="generation")
```

Nếu bỏ `as_type="generation"`, Langfuse coi span này là span bình thường — không render token bars, không tính cost, không hiện trong tab Generations. Đây là tham số **không có trong template gốc** và không được đề cập rõ trong tài liệu lab — tôi phát hiện khi kiểm tra UI và thấy cột Cost toàn là trống dù đã gửi usage_details.

---

### 1.3 Trace Enrichment — Metadata & Tags

**Phân biệt hai API khác nhau:**  
Đây là điểm dễ nhầm nhất trong Langfuse SDK:

| API | Phạm vi tác động | Dùng khi nào |
|---|---|---|
| `update_current_trace()` | Cả trace (tất cả spans) | Ghi identity: `user_id`, `session_id`, `tags`, tên trace |
| `update_current_observation()` | Chỉ span hiện tại | Ghi detail của bước đó: `input`, `output`, `usage_details` |

Nếu gọi nhầm `update_current_observation()` để set `user_id`, field đó chỉ xuất hiện trong span đó — Langfuse UI không nhận diện được là identity của trace, không filter được theo user.

**Tags theo `key:value` format:**  
Tags trong template gốc là bare strings như `"lab"`, `"claude-sonnet-4-5"`. Bare string không filterable theo giá trị. Tôi chuyển sang `key:value` format và thêm `_FEATURE_TAGS` dict để normalize:

```python
tags=[
    "lab",
    "domain:healthcare",      # filter tất cả traces của lab này
    _feature_tag(feature),    # "feature:appointment", "feature:medication", ...
    f"model:{self.model}",    # filter theo model version
    f"env:{APP_ENV}",         # tách dev vs prod
]
```

Kết quả trong UI: click vào tag `feature:appointment` trong sidebar → chỉ còn traces liên quan đến đặt lịch khám. Khi có incident, Member D và Member C không cần đọc từng trace mà filter theo feature để thu hẹp phạm vi.

---

### 1.4 PII Guard trong Traces — Healthcare-Specific Risk

**Vấn đề đặc thù của healthcare domain:**  
Không như lab generic, chatbot bệnh viện nhận message dạng:
> *"Tôi là Nguyễn Văn A, CCCD 012345678901, SĐT 0912345678, muốn đặt lịch khám"*

Field `input=` và `output=` của `update_current_trace()` và `update_current_observation()` được gửi thẳng lên Langfuse cloud server (bên thứ ba). Nếu để raw message, CCCD và SĐT của bệnh nhân sẽ nằm trong SaaS logs — vi phạm nghiêm trọng quy định bảo mật y tế.

**Giải pháp:** Áp dụng `summarize_text()` (đã được Member A tích hợp PII scrubbing) cho **mọi** trường input/output trước khi gửi lên Langfuse:

```python
# ĐÚNG — PII bị strip trước khi rời khỏi process
langfuse_context.update_current_trace(
    input=summarize_text(message),        # "Toi la [REDACTED_NAME], CCCD [REDACTED_CCCD]..."
    output=summarize_text(response.text),
)

# SAI — raw message chứa CCCD gửi thẳng lên cloud
langfuse_context.update_current_trace(
    input=message,   # ← KHÔNG ĐƯỢC LÀM
)
```

`user_id` cũng được hash (`hash_user_id()` → SHA-256 lấy 12 ký tự) trước khi set vào trace, tương tự cách Member A xử lý trong logs.

**Phát hiện trong quá trình test:** Khi chạy load test với `sample_queries.jsonl` healthcare, một số message chứa `CCCD 012345678901` — tôi mở Langfuse UI kiểm tra trace input và xác nhận chỉ thấy `[REDACTED_CCCD]`, không phải số thật. Đây là cross-check quan trọng giữa Member A (scrubbing ở layer log) và Member B (scrubbing ở layer trace).

---

## 2. Kết quả đo lường

| Metric | Kết quả |
|---|---|
| Tổng traces gửi lên Langfuse | **38 traces** |
| Traces có đủ 3 spans trong waterfall | **100%** |
| PII xuất hiện trong trace input/output | **0** |
| Traces có `user_id` là raw string | **0** (tất cả đều là hash 12 ký tự) |
| Traces trong `rag_slow` incident có span > 2500ms | **5/5** |
| Traces trong `cost_spike` incident có output tokens × 4 | **3/3** |
| `tracing_enabled` tại `/health` endpoint | **true** |

---

## 3. Điều tôi học được

**Về SDK initialization:** Lazy initialization (import xong, dùng đến đâu khởi tạo đến đó) là anti-pattern cho external services. Fail fast tại startup — dù có vẻ strict — tốt hơn nhiều so với silent failure giữa chừng. Một `auth_check()` lúc boot tốn thêm ~200ms nhưng tiết kiệm hàng giờ debug khi traces không xuất hiện trong UI.

**Về span granularity:** Đặt một `@observe()` cho cả pipeline dễ code nhưng vô nghĩa với observability. Waterfall phải đủ chi tiết để trả lời câu hỏi cụ thể: *"RAG hay LLM đang là bottleneck?"* Khi Member D bật `rag_slow` incident, tôi nhìn vào trace và thấy ngay `rag.retrieve` chiếm 2500ms trong khi `llm.generate` chỉ 150ms — không cần đọc một dòng log nào.

**Về ranh giới giữa trace layer và log layer trong hệ thống có PII:**  
Đây là trade-off thú vị: logs (Member A) chạy local trên server, còn traces (Member B) gửi ra cloud bên thứ ba. Cùng một dữ liệu nhưng yêu cầu scrubbing ở hai layer độc lập — không thể tin rằng "Member A đã scrub rồi thì Member B khỏi cần". Mỗi boundary ra ngoài process đều phải có PII guard riêng.

---

## 4. Commits
| Commit | Nội dung |
|---|---|
| [85ecc75](https://github.com/DuyVuux/C401-F2-Lab13/commit/85ecc75f58c656fb8fcd2a5d86ae33153ecf82f6) | Implement Langfuse SDK with decorators |
| [0ec4004](https://github.com/DuyVuux/C401-F2-Lab13/commit/0ec4004) | Refactor codes |