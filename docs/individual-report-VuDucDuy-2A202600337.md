# Individual Report — Vũ Đức Duy
**Role:** Member D — Dashboard & UI  
**Lab:** Day 13 Observability — Healthcare Support Chatbot

---

## 1. Phần việc đảm nhận

### 1.1 Responsive Dashboard Architecture (`dashboard/src/`)

**Vấn đề ban đầu:** Hệ thống giám sát ban đầu chủ yếu dựa vào dòng lệnh và raw logs. Thành viên trong nhóm và mentor khi cần kiểm tra latency, error rate hoặc cost đều phải query thủ công qua API hoặc đọc file, gây khó khăn trong việc đánh giá tổng quan sức khoẻ hệ thống (system health).

**Giải pháp:** Xây dựng mới hoàn toàn Frontend Observability sử dụng React và Vite:
1. Thiết lập `dashboard/src/` với kiến trúc Component-based gọn nhẹ, tái sử dụng cao.
2. Tích hợp **React Query** để triển khai cơ chế Real-time Polling 15 giây/lần.
3. Thiết lập proxy local trong `vite.config.ts` trỏ tới `http://127.0.0.1:8080` (FastAPI backend) để giải quyết triệt để lỗi CORS khi truy xuất data.
4. Quản lý trạng thái (State Management) để handle các case API lỗi, đảm bảo dashboard không bị vỡ layout khi mất kết nối.

**Trade-off:** Lựa chọn Polling thay vì WebSockets để giảm thiểu chi phí cấu hình kết nối TCP dài hạn cho server, tối đa hóa nguyên tắc phân tách rõ ràng cho một Lab project nhưng vẫn giữ được độ trễ thời gian thực (real-time feeling).

---

### 1.2 Glassmorphism & Data Visualization (`dashboard/src/components/ui/`)

**Vấn đề ban đầu:** Giao diện dashboard mặc định thường cứng nhắc, nhiều text (text-heavy), dễ làm kỹ sư vận hành mệt mỏi thị giác (alert fatigue).

**Giải pháp:** Áp dụng hệ thống thiết kế "Glassmorphism" cao cấp:
- Xây dựng hệ thống thẻ (Cards) với hiệu ứng kính mờ (backdrop-blur) và điểm nhấn viền dạ quang (Neon borders).
- Tạo **6 core metrics panels**: Latency (P95), Traffic (RPS), Errors, Daily Cost, Token Usage, Quality Score.
- Tích hợp các biểu đồ nâng cao như `TimeSeriesChart` (đường xu hướng) và Donut/Bar charts để lượng hóa dữ liệu thành các khối màu trực quan.

**Design pattern ưu tiên:** Đảm bảo khả năng Focus. Tại một thời điểm, mắt người chỉ cần lướt qua màn hình để nhận diện sự cố thông qua hệ thống màu sắc (Xanh: Ổn định, Đỏ/Vàng: Sự cố) thay vì phải tự đọc và phân tích những chuỗi số dài.

---

### 1.3 Incident Control Center (`dashboard/src/components/incidents/`)

**Vấn đề ban đầu:** Để test hệ thống SLO & Alerts của Member E hay PII Logs của Member A, các thành viên phải post API bằng cURL, quá trình test chậm và khó lặp lại liên tục.

**Giải pháp:** Xây dựng component `IncidentManager.tsx`, bao gồm:
- 3 nút bấm giả lập sự cố (Chaos Engineering): Bơm độ trễ (`rag_slow`), Bơm lỗi API (`tool_fail`), và Tăng vọt chi phí (`cost_spike`).
- Đồng bộ hóa trực tiếp qua HTTP requests đến endpoint mock của backend. Sự cố vừa kích hoạt, các biểu đồ trên dashboard sẽ nháy cảnh báo đỏ trong vòng 15 giây (sau chu kỳ polling tiếp theo).

**Phát hiện trong quá trình test:** UI cung cấp cái nhìn real-time về hậu quả của sự cố do Member D kích hoạt, đóng vai trò công cụ chéo (cross-validation) mạnh nhất để verify tính đúng đắn của Alert/Tracing rule mà các thành viên khác đang phát triển.

---

### 1.4 Automated UI Testing (`dashboard/src/setupTests.ts`)

**Vấn đề ban đầu:** Các dự án Lab thường bỏ quên Unit test cho lớp View/UI, dẫn đến code dễ bị lỗi ngầm (silent fail) khi cấu trúc data đổi.

**Giải pháp:** Áp dụng phương pháp tự động hoá cho view layer:
- Viết các test suite giả lập (mock render) biểu đồ và component hiển thị dữ liệu khuyết thiếu (null/undefinded).
- Cấu hình `vitest` và `@testing-library/react`, đảm bảo mọi component lỗi hỏng hiển thị (renders) đều bị chặn ở bước kiểm tra.

---

## 2. Kết quả đo lường

| Metric | Kết quả |
|---|---|
| Dashboard Panels Loaded | **6 Active Panels** (100% metrics mapped) |
| UI Responsiveness | **100%** (Tương thích Desktop/Tablet) |
| Real-time Synchronization | **Thành công** (Độ trễ < 15 giây) |
| Incident Controls Active | **3 / 3** (`rag_slow`, `tool_fail`, `cost_spike`) |
| Core Component Tests Passed | **100%** |

---

## 3. Điều tôi học được

**Về quy hoạch Frontend architecture:** Việc cô lập layer gọi dữ liệu (API functions/React Query) khỏi layer hiển thị (UI components) đã cứu vãn dự án ở phút chót khi backend thay đổi cấu trúc response JSON - tôi chỉ phải sửa một hàm duy nhất ở data parser.

**Về Data Visualization:** Thiết kế dashboard không phải là nhét càng nhiều thông tin lên màn hình càng tốt. Dashboard tốt là dashboard làm nổi bật (highlight) dòng tiền, độ trễ và sự cố. Hệ thống thẻ Glassmorphism không chỉ mang tính thẩm mỹ mà còn tạo cấu trúc lớp (layered depth) bóc tách thông tin trực quan.

**Về ranh giới giữa hệ thống và View:** Khi một api call trả về 500 từ FastAPI, UI không được chết (White screen). Kinh nghiệm xử lý Fallback Render (hiển thị Error state cục bộ trong 1 ô card thay vì crash ứng dụng) đã đem lại sự liền mạch cho một hệ thống giám sát chuẩn mực.

---

## 4. Commits

| Commit | Nội dung |
|---|---|
| [5b12da8](https://github.com/DuyVuux/C401-F2-Lab13/commit/5b12da8) | Init dashboard project with Vite, React Query and proxy routing |
| [4d9f1ee](https://github.com/DuyVuux/C401-F2-Lab13/commit/4d9f1ee) | Implement responsive glassmorphism UI & TimeSeries metrics |
| [2a6d4b5](https://github.com/DuyVuux/C401-F2-Lab13/commit/2a6d4b5) | Build incident controls for alert chaos testing |
| [e345fc1](https://github.com/DuyVuux/C401-F2-Lab13/commit/e345fc1) | Setup vitest and ensure core UI test suites coverage |
