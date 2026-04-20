# Individual Report — Nhữ Gia Bách
**Role:** Member E — SLO & Alerts  
**Lab:** Day 13 Observability — Healthcare Support Chatbot

---

## 1. Phần việc đảm nhận

### 1.1 Service Level Objectives (`config/slo.yaml`)

**Vấn đề ban đầu:** Thiếu định nghĩa rõ ràng về các mục tiêu chất lượng dịch vụ, không có cơ sở để đo lường hiệu suất hệ thống.

**Giải pháp:** Định nghĩa 5 Service Level Indicators (SLIs) toàn diện:
- `latency_p95_ms`: P95 response time ≤ 3000ms với target 99.5%
- `error_rate_pct`: Tỷ lệ lỗi ≤ 2% với target 99.0%
- `uptime_pct`: Thời gian hoạt động ≥ 99.9% với target 99.95%
- `daily_cost_usd`: Chi phí hàng ngày ≤ $2.5 với target 100%
- `quality_score_avg`: Điểm chất lượng trung bình ≥ 0.75 với target 95%

**Trade-off:** Chọn window 28 ngày để có đủ dữ liệu thống kê, thay vì 7 ngày ngắn hơn nhưng kém ổn định.

---

### 1.2 Alert Rules Configuration (`config/alert_rules.yaml`)

**Vấn đề ban đầu:** Không có hệ thống cảnh báo tự động khi hệ thống gặp vấn đề, phụ thuộc vào việc giám sát thủ công.

**Giải pháp:** Triển khai 5 quy tắc cảnh báo với mức độ ưu tiên phù hợp:
- `high_latency_p95` (P2): Phát hiện độ trễ cao >5000ms trong 30 phút
- `high_error_rate` (P1): Phát hiện tỷ lệ lỗi >5% trong 5 phút
- `service_down` (P0): Phát hiện downtime <99.9% uptime trong 5 phút
- `cost_budget_spike` (P2): Phát hiện chi phí >2x baseline trong 15 phút
- `low_quality_score` (P3): Phát hiện chất lượng phản hồi <0.5 trong 1 giờ

**Thiết kế alert conditions:** Sử dụng time windows hợp lý - ngắn cho vấn đề nghiêm trọng (P0/P1), dài hơn cho vấn đề kinh tế hoặc chất lượng (P2/P3).

---

### 1.3 Alert Runbooks (`docs/alerts.md`)

**Vấn đề ban đầu:** Thiếu hướng dẫn xử lý sự cố có cấu trúc, dẫn đến thời gian giải quyết lâu và không nhất quán.

**Giải pháp:** Phát triển runbooks toàn diện với framework incident response 5 bước:

**Cấu trúc runbook cho mỗi alert:**
1. **Description**: Severity, trigger condition, impact, expected resolution time
2. **Investigation Steps**: Checklist điều tra có thứ tự ưu tiên
3. **Mitigation Actions**: Chiến lược khắc phục theo giai đoạn (Immediate/Short-term/Long-term)
4. **Escalation Protocol**: Quy trình leo thang với timeline cụ thể
5. **Prevention Measures**: Biện pháp ngăn ngừa tái diễn

**Đặc biệt chú trọng:**
- **Healthcare context**: Business impact cho bệnh nhân và nhân viên y tế
- **Tool integration**: Hướng dẫn sử dụng Langfuse UI, correlation với traces
- **Time-based decisions**: Escalation triggers dựa trên thời gian (15min, 30min, 1h)

**Trade-off về độ chi tiết:** Runbooks rất chi tiết để phù hợp với môi trường production, thay vì đơn giản hóa cho lab. Điều này tạo ra tài liệu có thể tái sử dụng.

---

### 1.4 Enterprise-Grade Enhancements

**Vượt yêu cầu lab:** Thêm uptime monitoring và service down alert để đảm bảo tính toàn vẹn của hệ thống quan sát.

**Contact Information:** Thêm thông tin liên lạc (on-call engineer, Slack, PagerDuty) để hỗ trợ incident response thực tế.

**Post-Incident Review Process:** Thêm quy trình review sau sự cố để cải tiến liên tục.

---

## 2. Kết quả đo lường

| Metric | Kết quả |
|---|---|
| SLIs defined | **5 SLIs** (Latency, Error Rate, Uptime, Cost, Quality) |
| Alert rules configured | **5 alerts** (P0-P3 severity levels) |
| Runbooks completed | **5 comprehensive runbooks** |
| Coverage of failure modes | **100%** (Performance, Reliability, Availability, Cost, Quality) |
| Documentation quality | **Enterprise-grade** (Investigation checklists, mitigation strategies, escalation protocols) |

---

## 3. Điều tôi học được

**Về SLO/SLI design:** Việc lựa chọn metrics phù hợp quan trọng hơn số lượng. Uptime thường bị bỏ qua trong các hệ thống AI, nhưng lại critical cho healthcare applications nơi downtime có thể ảnh hưởng đến tính mạng.

**Về alert fatigue:** Thiết kế alert với time windows và severity levels phù hợp giúp giảm false positives. P3 alerts cho quality issues cho phép monitor mà không gây quá tải on-call team.

**Về incident response:** Runbooks không chỉ là documentation mà là công cụ training. Việc có checklist có thứ tự giúp reduce mean time to resolution (MTTR) đáng kể trong high-pressure situations.

**Về healthcare observability:** Healthcare systems cần balance giữa technical metrics (latency, errors) và business metrics (quality, cost). Quality score alert là innovation quan trọng để đảm bảo AI responses medically accurate.

---

## 4. Commits

| Commit | Nội dung |
|---|---|
| [commit-hash-1] | feat: implement comprehensive SLO and alerts configuration |
| [commit-hash-2] | add indivdual report for Nhu Gia Bach |
