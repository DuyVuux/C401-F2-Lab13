# Lab 13 Observability Dashboard

Hệ thống Dashboard theo dõi các chỉ số hệ thống (SLI, SLA, SLO) cho dự án LLM Healthcare, bao gồm hai thành phần tuyến tính nối trực tiếp với nhau: FastAPI Backend và React Frontend.

## Yêu cầu Hệ thống
- Python 3.9+ với `uv` package manager.
- Node.js bản 18.x trở lên với `npm`.

## Hướng dẫn Khởi chạy
Bởi vì cổng mặc định `8000` của mạng nội bộ đã bị chiếm dụng bởi service Docker (`IDAE Notion Service`), hệ thống được cấu trúc lại để sử dụng cổng `9999`.

### 1. Khởi động Backend API
Bộ API FastAPI cung cấp cấu trúc Telemetry chuẩn và đo lường độ trễ của AI logic.
Mở Terminal 1 và điều hướng vào thư mục gốc `C401-F2-Lab13`:
```bash
cd /home/duykhongngu28/massive/C401-F2-Lab13
uv run uvicorn app.main:app --host 127.0.0.1 --port 9999
```

### 2. Khởi động Frontend Dashboard
Giao diện React giám sát tự động với cơ chế polling 15s. Đã thiết lập proxy định tuyến các yêu cầu gọi `/metrics` về cổng `9999`.
Mở Terminal 2:
```bash
cd /home/duykhongngu28/massive/C401-F2-Lab13/dashboard
npm install
npm run dev
```
Truy cập: **http://localhost:5173**

### 3. Tạo Lưu lượng Ảo (Simulate Traffic)
Để Dashboard có dữ liệu đồ thị thay vì chỉ hiển thị `0`, bạn có thể chạy script kiểm thử chịu tải tích hợp sẵn (tự động call endpoint chat).
Mở Terminal 3:
```bash
cd /home/duykhongngu28/massive/C401-F2-Lab13
uv run python scripts/load_test.py
```

## Khắc phục sự cố (Troubleshooting)
- **Dashboard báo "API Disconnected"**: Đảm bảo Backend đã chạy đúng cổng `9999` chưa (hoặc proxy trong `vite.config.ts` bị sai cổng).
- **Lỗi cổng (Port in use)**: Hãy mở `vite.config.ts` và `scripts/load_test.py` nâng cổng từ `9999` lên một cổng tuỳ ý khác (ví dụ: `8088`), sau đó chạy lại `uvicorn` với `--port 8088`.
- **Thiếu Module Node**: Xóa thư mục `node_modules` và chạy lại `npm install`.
