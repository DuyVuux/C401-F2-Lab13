# Individual Report — Hoàng Vĩnh Giang
**Role:** Tracing & Observability  
**Lab:** Day 13 Observability — Healthcare Support Chatbot  

---

## 1. Đảm bảo hệ thống có tracing hoạt động ổn định

### Problem  
Ban đầu hệ thống không thể kết nối với Langfuse:
- Lỗi import (`langfuse.decorators not found`)
- SDK load nhưng không tạo trace
- Không có log hoặc output nào xác nhận tracing hoạt động
- `tracing_enabled()` trả về `False` dù đã set env

Điều này khiến toàn bộ observability layer không hoạt động.

---

### Solution  

Tôi đã xử lý theo 3 bước:

#### (1) Fix version mismatch của Langfuse SDK  

Code ban đầu sử dụng:
```python
from langfuse.decorators import observe, langfuse_context
```

Nhưng version mới không còn module này -> gây lỗi import.

-> Giải pháp:

- Downgrade về version tương thích với decorator API

---

#### (2) Khởi tạo client và set default client

```python
_client = Langfuse(
    public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
    secret_key=os.environ["LANGFUSE_SECRET_KEY"],
    host=os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
)

set_default_client(_client)
```

-> Nếu không set default client, decorator `@observe()` sẽ không biết gửi trace đi đâu.

---

### Kết quả

- SDK load thành công
- `tracing_enabled()` = True
- Trace bắt đầu xuất hiện trên Langfuse UI

---

## 2. Gắn tracing vào hệ thống và enrich dữ liệu

### Problem

Sau khi kết nối được Langfuse, hệ thống vẫn không có thông tin đủ để phân tích:

- Không biết request thuộc user nào
- Không có metadata (feature, model, env)
- Không theo dõi được token và cost

-> Trace chỉ có dạng "raw", không hữu ích cho debugging.

---

### Solution

Tôi sử dụng decorator `@observe()` và enrich trace bằng metadata:

```python
langfuse_context.update_current_trace(
    name=f"healthcare/{feature}",
    user_id=hash_user_id(user_id),
    session_id=session_id,
    tags=[
        "lab",
        "domain:healthcare",
        _feature_tag(feature),
        f"model:{self.model}",
        f"env:{os.getenv('APP_ENV', 'dev')}",
    ],
    metadata={
        "latency_ms": latency_ms,
        "cost_usd": cost_usd,
        "quality_score": quality_score,
        "doc_count": len(docs),
        "feature": feature,
    },
    input=summarize_text(message),
    output=summarize_text(response.text),
)
```

---

### Evidence (từ code)

Tracking token usage:

```python
langfuse_context.update_current_observation(
    usage_details={
        "input": response.usage.input_tokens,
        "output": response.usage.output_tokens,
    },
)
```

Cost estimation:

```python
input_cost  = (tokens_in  / 1_000_000) * 3
output_cost = (tokens_out / 1_000_000) * 15
```

---

### Kết quả

- Mỗi trace có đầy đủ:

  - latency
  - cost
  - token usage
  - metadata
- Có thể filter theo:

  - feature
  - model
  - environment

---

## 3. Đảm bảo an toàn dữ liệu khi tracing

### Problem

Dữ liệu đầu vào có thể chứa:

- CCCD
- Số điện thoại
- Tên bệnh nhân

Nếu gửi raw lên Langfuse sẽ gây rò rỉ PII.

---

### Solution

Sử dụng hàm scrub trước khi gửi:

```python
input=summarize_text(message)
output=summarize_text(response.text)
```

Và hash user_id:

```python
user_id=hash_user_id(user_id)
```

---

### Evidence

```python
# PII scrubbed before sending to tracing
input=summarize_text(message)
```

---

### Kết quả

- Không có PII leak trong trace
- Vẫn giữ được đủ thông tin để debug

---

## 4. Phân tích hành vi hệ thống khi xảy ra Incident

### Problem

Không thể hiểu hệ thống bị lỗi ở đâu khi:

- latency tăng
- response kém chất lượng
- chi phí tăng

Nếu chỉ dùng log -> rất khó xác định nguyên nhân.

---

### Solution

Sử dụng tracing để quan sát sự thay đổi của hệ thống theo từng incident:

---

### 4.1 `rag_slow`

**Evidence từ trace:**

```python
latency_ms = int((time.perf_counter() - started) * 1000)
```

**Quan sát:**

- latency tăng mạnh
- token và cost không đổi

**Kết quả:**

- Response vẫn đúng
- Chỉ chậm hơn

**Kết luận:**
-> Bottleneck nằm ở performance, không phải LLM

---

### 4.2 `tool_fail`

**Evidence từ code:**

```python
docs != [
    "No domain document matched. Use general fallback answer."
]
```

**Quan sát:**

- Không có document phù hợp
- hệ thống không báo lỗi

**Kết quả:**

- Response generic
- chất lượng giảm

**Kết luận:**
-> Silent failure (không crash nhưng degrade quality)

---

### 4.3 `cost_spike`

**Evidence:**

```python
tokens_out = response.usage.output_tokens
```

**Quan sát:**

- tokens_out tăng mạnh
- cost tăng

**Kết quả:**

- Response dài hơn
- verbose

**Kết luận:**
-> Ảnh hưởng đến cost, không phải correctness

---

## 5. Vấn đề thực tế và cách debug

### Problem

Trace không xuất hiện trên UI dù đã gọi API

---

### Solution

Thêm flush:

```python
_client.flush()
```

---

### Problem

Lỗi kết nối:

```
WinError 10061
```

---

### Solution

Fix host:

```env
LANGFUSE_HOST=https://cloud.langfuse.com
```

---

## 7. Điều học được

- Tracing giúp debug hệ thống nhanh hơn log
- Silent failure là nguy hiểm nhất trong LLM
- Performance, Quality, Cost là 3 yếu tố cần theo dõi độc lập

