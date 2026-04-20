# Individual Report — Trần Quang Quí
**Role:** Member A — Logging & PII  
**Lab:** Day 13 Observability — Healthcare Support Chatbot

---

## 1. Phần việc đảm nhận

### 1.1 Correlation ID Middleware (`app/middleware.py`)

**Vấn đề ban đầu:** Mỗi request không có định danh riêng, không thể trace một request xuyên suốt qua nhiều log lines.

**Giải pháp:** Implement `CorrelationIdMiddleware` với logic:
1. `clear_contextvars()` — xóa context từ request trước để tránh leak giữa các request
2. Extract `x-request-id` từ header nếu client gửi kèm, hoặc tự generate `req-{uuid4().hex[:8]}`
3. `bind_contextvars(correlation_id=...)` — inject vào structlog context, tự động xuất hiện trong mọi log line của request đó
4. Thêm `x-request-id` và `x-response-time-ms` vào response headers để client có thể trace

**Trade-off:** Dùng format `req-<8-char-hex>` thay vì full UUID để log ngắn gọn hơn, đủ unique cho môi trường lab (~4 tỷ khả năng va chạm).

---

### 1.2 PII Scrubbing (`app/pii.py` + `app/logging_config.py`)

**Vấn đề ban đầu:** Log ghi lại raw message của bệnh nhân, có thể chứa CCCD, số điện thoại, email, số thẻ tín dụng.

**Giải pháp:** Đăng ký `scrub_event` processor vào structlog pipeline. Processor này duyệt qua `payload` dict và field `event`, thay thế PII bằng `[REDACTED_<TYPE>]`.

**Regex patterns theo thứ tự ưu tiên:**
```python
"email":       r"[\w\.-]+@[\w\.-]+\.\w+"
"cccd":        r"\b\d{12}\b"          # phải đứng trước phone_vn
"credit_card": r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b"
"phone_vn":    r"(?:\+84|0)[ \.-]?\d{3}[ \.-]?\d{3}[ \.-]?\d{3,4}"
"passport_vn": r"\b[A-Z]\d{7}\b"
```

**Bug quan trọng đã phát hiện và fix:** Pattern `cccd` (`\b\d{12}\b`) phải đứng **trước** `phone_vn` trong dict. Nếu không, CCCD `012345678901` sẽ bị phone_vn match một phần (`012345678`) trước, để sót `01` trong log — đây là lỗ hổng security thật sự có thể bị khai thác trong adversarial testing.

---

### 1.3 Log Enrichment (`app/main.py`)

**Vấn đề ban đầu:** Log thiếu context — không biết request đến từ user nào, session nào, dùng feature gì.

**Giải pháp:** Bind các context fields vào structlog trước khi xử lý request:
```python
bind_contextvars(
    user_id_hash=hash_user_id(body.user_id),  # SHA-256 first 12 chars
    session_id=hash_user_id(body.session_id), # hash để không lộ raw session
    feature=body.feature,
    model=os.getenv("MODEL_NAME", "mock-llm"),
    env=os.getenv("APP_ENV", "dev"),
)
```

**Trade-off về session_id:** Ban đầu log raw `session_id` để tiện debug, nhưng sau khi phân tích adversarial schema của đội khác, phát hiện raw session_id có thể bị dùng để hijack session hoặc correlate hành vi người dùng. Quyết định hash session_id giống user_id.

---

### 1.4 Security Hardening — Adversarial Defense

Sau khi nhận schema của đội Vinschool để tấn công, tôi review lại hệ thống của nhóm và phát hiện thêm:
- **Lỗ hổng CCCD regex order** → đã fix bằng cách đặt `cccd` trước `phone_vn`
- **Raw session_id trong log** → đã fix bằng hash
- **Metrics reset khi restart** → fix persist sang `data/metrics.json`

---

## 2. Kết quả đo lường

| Metric | Kết quả |
|---|---|
| `validate_logs.py` score | **100/100** |
| PII leaks detected | **0** |
| Correlation ID coverage | **100%** requests |
| Log records analyzed | **66 records** |

---

## 3. Điều tôi học được

**Về kỹ thuật:** Thứ tự apply regex processor quan trọng hơn tôi nghĩ. Một pattern match sai thứ tự có thể để lộ dữ liệu nhạy cảm ngay cả khi tất cả patterns đều đúng riêng lẻ.

**Về observability:** Correlation ID là nền tảng của toàn bộ hệ thống. Nếu không có nó, việc debug incident sẽ phải grep từng dòng log riêng lẻ thay vì filter theo một ID duy nhất.

**Về security vs. debuggability trade-off:** Hash session_id tăng security nhưng giảm khả năng debug khi cần tìm log của một session cụ thể. Trong production, nên có một secure lookup table để map hash → session khi cần điều tra.

---

## 4. Commits

| Commit | Nội dung |
|---|---|
| [1b9e621](https://github.com/DuyVuux/C401-F2-Lab13/commit/1b9e621) | Implement logging, correlation ID, PII scrubbing |
| [28e5471](https://github.com/DuyVuux/C401-F2-Lab13/commit/28e5471) | Fix CCCD regex order, hash session_id |
| [e7d52f0](https://github.com/DuyVuux/C401-F2-Lab13/commit/e7d52f0) | Persist metrics to survive server restarts |
| [eaaffe8](https://github.com/DuyVuux/C401-F2-Lab13/commit/eaaffe8) | Add public API schema for adversarial testing |
