# Kế Hoạch & Phân Công Nhiệm Vụ - Lab 13: Observability
## Đề tài: Healthcare Support Chatbot
Chatbot hỗ trợ bệnh nhân tra cứu thông tin y tế: lịch khám, hướng dẫn sử dụng thuốc, quy trình đặt lịch xét nghiệm. Bot sử dụng RAG để tìm kiếm trong cơ sở dữ liệu nội quy bệnh viện.

**Chat example:**
- User: *"Tôi là Nguyễn Văn A, CCCD 012345678, muốn đặt lịch khám nội khoa ngày mai"*
- Bot: *"Xin chào! Phòng khám Nội khoa còn slot 9:00 và 14:30. Bạn muốn chọn giờ nào?"*
- User: *"Số điện thoại của tôi là 0912345678, gửi xác nhận lịch hộ tôi nhé"*
- Bot: *"Đã đặt lịch thành công! Xác nhận sẽ được gửi qua SMS."*

---

## 1. Tổng quan yêu cầu của Lab
Mục tiêu cốt lõi: Nâng cấp một "FastAPI agent" cơ bản chưa hoàn thiện trở thành một hệ thống **có tính quan sát (observable) toàn diện**.
Các cấu phần kỹ thuật phải hoàn thành (điền vào các `TODO` trong source code):
- **Structured JSON Logging & Correlation ID:** Tạo tracking xuyên suốt request với `x-request-id`. Bind các thông tin session, user, tính năng vào từng dòng log.
- **Data Privacy (PII Scrubbing):** Làm sạch các dữ liệu nhạy cảm trước khi log ra ngoài hệ thống.
- **Tracing (Langfuse):** Gắn context/trace cho hệ thống để theo dõi các tác vụ Agent/LLM thông qua decorator `@observe()`.
- **Metrics, Dashboard & Alerts:** Tạo các chỉ số đo lường (metrics), xuất ra bảng điều khiển 6-panel, và bắt alert khi vi phạm SLO.
- **Incident Injection & Testing:** Chạy tải (load test) và chủ động tạo tình huống sập/chậm hệ thống để ghi nhận kết quả và khắc phục.

---

## 2. Phân công nhiệm vụ (5 Thành viên)
Nhóm gồm 5 người sẽ gánh vác 6 vai trò tiêu chuẩn bằng cách hợp nhất phần Blueprint + Demo vào chung với Dashboards.

| Thành viên | Vai trò theo Lab | Nhiệm vụ chính & Các tiến trình | Files phụ trách chính |
| :--- | :--- | :--- | :--- |
| **Trần Quang Quí** | **Member A:** Logging & PII | Xử lý middleware để tạo `x-request-id`. Cập nhật file main để inject context logs. Hoàn thiện thuật toán ẩn dữ liệu nhạy cảm. Chạy pass script `validate_logs.py`. | `middleware.py`, `logging_config.py`, `main.py` |
| **Đoàn Nam Sơn** | **Member B:** Tracing & Tags | Cấu hình SDK Langfuse, gắn decorator vào các function gọi AI/LLM. Đảm bảo toàn bộ request đều phát sinh trace hợp lệ (tối thiểu 10 traces trên cloud). | `tracing.py`, Giao diện Langfuse UI |
| **Vũ Đức Duy** | **Member C:** SLO & Alerts | Thiết lập `slo.yaml` và `alert_rules.yaml`. Xác định ngưỡng vi phạm (VD: P95 latency hoặc Error Rate). Viết kịch bản xử lý cảnh báo trong `alerts.md`. | `slo.yaml`, `alert_rules.yaml`, `alerts.md` |
| **Hoàng Vĩnh Giang** | **Member D:** Load Test & Incidents | Chạy script tạo request ảo (`load_test.py`) và ném lỗi có chủ đích (`inject_incident.py`). Phối hợp kiểm tra xem tracking và alert có hoạt động chính xác khi có lỗi không. | `load_test.py`, `inject_incident.py`, RCA section |
| **Nhữ Gia Bách** | **Member E:** Dashboards, Blueprint & Demo | Triển khai Dashboard ảo hóa với 6 panels (lấy metrics từ hệ thống). Setup file `blueprint-template.md`. Thu thập log/ảnh làm chứng cứ (evidence) & Dẫn dắt buổi Demo. | Cấu hình Dashboard, `blueprint-template.md`, `grading-...` |

---

## 3. Lộ trình triển khai (Sprints)

### Sprint 1: Nền tảng (Quí & Sơn)
- **Quí:** Làm middleware trước tiên để mỗi dòng log có `Correlation ID`. Xử lý PII scrubber. Xong báo team để review với script `python scripts/validate_logs.py`.
- **Sơn:** Thiết lập API keys cho Langfuse, gắn `decorator` nội bộ agent LLM. Push 15-20 calls test thử xem UI trên Langfuse đã lên vệt trace chưa. Đẩy config lên repo.

### Sprint 2: Đo lường & Cảnh báo (Duy & Bách)
- **Duy:** Dựa vào mô hình trace ở Sprint 1, tiến hành định nghĩa file YAML `slo.yaml`, `alert_rules.yaml` (các mốc time-out, error 500).
- **Bách:** Dựa vào file `docs/dashboard-spec.md`, cài cắm công cụ hiển thị đồ thị / chart lấy log metric của nhóm thành 6 blocks đúng chuẩn.

### Sprint 3: Stress-Test và Xử lý Lỗi Sự cố (Giang + Cả Team)
- **Giang:** Chạy giả lập tải `python scripts/load_test.py --concurrency 5` và bơm lỗi `python scripts/inject_incident.py --scenario rag_slow`.
- **Cả team phối hợp:**
  1. File log có ghi đủ/đúng loại báo lỗi không?
  2. Langfuse có báo đỏ node bị chậm/sập không?
  3. Cản báo (Alerts) của Duy có bị trigger không?
  4. Đồ thị Dashboard của Bách có gồ lên bất thường không?

### Sprint 4: Báo cáo & Kiểm tra chéo
- Tổng lực gom thông tin chụp màn hình dán vào `docs/grading-evidence.md`.
- Duyệt qua source code 1 lần cuối xem còn sót chữ `TODO` nào không (Quyết định 30đ thực hành).
- Nháp trước kịch bản Live Demo kéo dài 5-7 phút.
- **Report cá nhân:** Viết đúng những đóng góp thật sự và trade-off suy nghĩ cá nhân vào bài, đảm bảo không ai giống ai (Quyết định 40đ cá nhân).
