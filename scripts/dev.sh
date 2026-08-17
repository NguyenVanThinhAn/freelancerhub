#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# scripts/dev.sh — chạy CẢ frontend (Vite) + backend (FastAPI) trong 1 tiến trình.
#
# Stack:
#   - Backend:  cd backend && .venv/bin/uvicorn main:app --reload --port $PORT_API
#   - Frontend: cd frontend && npm run dev   (Vite proxy /api/v1 -> http://localhost:$PORT_API)
#
# Cấu hình qua env (xem scripts/dev-stack.env.example):
#   PORT_API  port FastAPI  (default 8000)
#   PORT_WEB  port Vite     (default 8080)
#   API_DEBUG 1 -> in log request backend
#
# Phím tắt:
#   ./scripts/dev.sh           chạy cả 2
#   ./scripts/dev.sh web       chỉ frontend
#   ./scripts/dev.sh api       chỉ backend
#   ./scripts/dev.sh install   cài concurrently + đảm bảo backend .venv có uvicorn
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

# Load env defaults từ file (không bắt buộc)
if [ -f "$ROOT_DIR/scripts/dev-stack.env" ]; then
  # shellcheck disable=SC1091
  set -a; source "$ROOT_DIR/scripts/dev-stack.env"; set +a
fi

PORT_API="${PORT_API:-8000}"
PORT_WEB="${PORT_WEB:-8080}"
API_DEBUG="${API_DEBUG:-0}"

# Export để concurrently + subprocess nhìn thấy
export PORT_API PORT_WEB API_DEBUG

# ----- helpers ---------------------------------------------------------------
log()  { printf '\033[1;36m[dev-stack]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dev-stack]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[dev-stack]\033[0m %s\n' "$*" >&2; exit 1; }

check_frontend_deps() {
  cd "$FRONTEND_DIR"
  if [ ! -d node_modules ]; then
    log "cài dependencies frontend (npm install)…"
    npm install
  fi
}

check_backend_deps() {
  cd "$BACKEND_DIR"
  if [ ! -x .venv/bin/uvicorn ]; then
    die "không thấy $BACKEND_DIR/.venv/bin/uvicorn. Tạo venv trước: cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
  fi
}

ensure_stack() {
  check_frontend_deps
  check_backend_deps
  cd "$ROOT_DIR"
}

run_all() {
  ensure_stack
  log "API=http://localhost:$PORT_API  WEB=http://localhost:$PORT_WEB"
  log "nhấn Ctrl+C để dừng cả 2."
  exec node "$ROOT_DIR/scripts/run-all.mjs"
}

run_web() {
  ensure_stack
  cd "$FRONTEND_DIR"
  npm run dev -- --host 0.0.0.0 --port "$PORT_WEB"
}

run_api() {
  check_backend_deps
  cd "$BACKEND_DIR"
  API_DEBUG="$API_DEBUG" \
  DB_TYPE="$DB_TYPE" \
  DB_URL_MYSQL="$DB_URL_MYSQL" \
  .venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port "$PORT_API"
}

run_install() {
  check_frontend_deps
  log "xong. Backend .venv đã có sẵn uvicorn (nếu thiếu, xem warning ở trên)."
}

# ----- main ------------------------------------------------------------------
cmd="${1:-all}"
case "$cmd" in
  all)    run_all ;;
  web)    run_web ;;
  api)    run_api ;;
  install) run_install ;;
  -h|--help|help)
    sed -n '3,25p' "$0"
    ;;
  *)
    die "lệnh không hợp lệ: $cmd (dùng: all|web|api|install)"
    ;;
esac
