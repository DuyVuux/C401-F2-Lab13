#!/usr/bin/env bash
# =============================================================================
#  Member B — Tracing Verification Playbook
#  Đoàn Nam Sơn | Healthcare Support Chatbot | Day 13 Observability Lab
#  Mục tiêu: >= 15 traces trên Langfuse UI với đầy đủ metadata.
#  Chạy từ thư mục gốc: C401-F2-Lab13/
# =============================================================================

echo "========================================================"
echo "  Member B Tracing Verification — Healthcare Chatbot"
echo "========================================================"


# ── BƯỚC 0: Môi trường ────────────────────────────────────────────────────────
echo ""
echo "[0a] Cài đặt dependencies..."
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt --quiet

echo ""
echo "[0b] Điền API key vào .env rồi chạy kiểm tra kết nối:"

python - <<'PYEOF'
import os
from dotenv import load_dotenv; load_dotenv()
from langfuse import Langfuse
lf = Langfuse(
    public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
    secret_key=os.environ["LANGFUSE_SECRET_KEY"],
    host=os.environ.get("LANGFUSE_HOST","https://cloud.langfuse.com"),
)
ok = lf.auth_check()
print("Connection OK:", ok)
if not ok:
    raise SystemExit("Kiem tra lai API key trong .env")
PYEOF


# ── BƯỚC 1: Khởi động server ─────────────────────────────────────────────────
# Chạy lệnh này trong terminal riêng:
#   uvicorn app.main:app --reload --port 8000

echo ""
echo "[1] Kiem tra health (server phai dang chay)..."
curl -s http://127.0.0.1:8000/health | python -m json.tool
# Xac nhan: "tracing_enabled": true


# ── BƯỚC 2: 20 traces baseline ───────────────────────────────────────────────
echo ""
echo "[2] Gui 20 healthcare requests (healthcare sample_queries.jsonl)..."
python scripts/load_test.py            # 20 dong x 1 luot = 20 traces
sleep 5                                # cho SDK flush


# ── BƯỚC 3: Request co PII that (kiem tra scrubbing) ─────────────────────────
echo ""
echo "[3] Kiem tra PII scrubbing trong traces..."
curl -s -X POST http://127.0.0.1:8000/chat \
     -H "Content-Type: application/json" \
     -d '{"user_id":"u_pii","session_id":"s_pii","feature":"appointment",
          "message":"Nguyen Van A, CCCD 012345678901, SDT 0912345678, dat lich kham"}'


# ── BƯỚC 4: Concurrent (5 luong song song) ───────────────────────────────────
echo ""
echo "[4] Concurrent test (5 workers)..."
python scripts/load_test.py --concurrency 5


# ── BƯỚC 5a: Incident rag_slow ───────────────────────────────────────────────
echo ""
echo "[5a] Bat incident rag_slow..."
python scripts/inject_incident.py --scenario rag_slow

for i in 1 2 3 4 5; do
  curl -s -X POST http://127.0.0.1:8000/chat \
       -H "Content-Type: application/json" \
       -d "{\"user_id\":\"u_slow_$i\",\"session_id\":\"s_slow_$i\",
            \"feature\":\"appointment\",\"message\":\"Dat lich kham noi khoa\"}"
  sleep 0.3
done

python scripts/inject_incident.py --scenario rag_slow --disable
# Langfuse: span rag.retrieve cua 5 traces tren phai > 2500ms


# ── BƯỚC 5b: Incident cost_spike ─────────────────────────────────────────────
echo ""
echo "[5b] Bat incident cost_spike..."
python scripts/inject_incident.py --scenario cost_spike

for i in 1 2 3; do
  curl -s -X POST http://127.0.0.1:8000/chat \
       -H "Content-Type: application/json" \
       -d "{\"user_id\":\"u_cost_$i\",\"session_id\":\"s_cost_$i\",
            \"feature\":\"medication\",\"message\":\"Huong dan thuoc huyet ap\"}"
done

python scripts/inject_incident.py --scenario cost_spike --disable
# Langfuse: output tokens x4, cost tang ro ret


# ── BƯỚC 6: Validate logs ────────────────────────────────────────────────────
echo ""
echo "[6] Kiem tra logs..."
python scripts/validate_logs.py


# ── BƯỚC 7: Metrics ──────────────────────────────────────────────────────────
echo ""
echo "[7] Kiem tra /metrics..."
curl -s http://127.0.0.1:8000/metrics | python -m json.tool


# ── CHECKLIST ────────────────────────────────────────────────────────────────
echo ""
echo "========================================================"
echo "  CHECKLIST BANG CHUNG (chup man hinh cho grading)"
echo "========================================================"
echo "  [ ] >= 15 traces trong Langfuse Traces list"
echo "  [ ] Co trace cho: appointment, medication, lab_test, qa, summary"
echo "  [ ] Waterfall 3 spans: agent.run > rag.retrieve > llm.generate"
echo "  [ ] Tags: lab, domain:healthcare, feature:*, model:*, env:dev"
echo "  [ ] user_id la hash 12 ky tu (KHONG phai ten benh nhan)"
echo "  [ ] llm.generate co Usage tab: input + output tokens"
echo "  [ ] CCCD / SDT KHONG xuat hien trong trace input/output"
echo "  [ ] Trace rag_slow: rag.retrieve span > 2500ms"
echo "  [ ] Trace cost_spike: output tokens x4"
echo "  [ ] validate_logs.py >= 80/100"