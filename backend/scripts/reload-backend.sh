#!/usr/bin/env bash
# reload-backend.sh — chạy trên VPS

set -e

echo "=== 1. Tìm project dir ==="
PROJECT_DIR=$(find /opt /home /srv /var/www -maxdepth 4 -type d -name "freelancerhub*" 2>/dev/null | head -1)
if [ -z "$PROJECT_DIR" ]; then
  PROJECT_DIR=$(find / -maxdepth 5 -type d -name "backend" -path "*freelancerhub*" 2>/dev/null | head -1 | xargs -I{} dirname {})
fi
echo "PROJECT_DIR=$PROJECT_DIR"
cd "$PROJECT_DIR/backend"

echo ""
echo "=== 2. Backup code cũ ==="
cp app/routers/interviews.py app/routers/interviews.py.bak 2>/dev/null || true
cp app/routers/tasks.py app/routers/tasks.py.bak 2>/dev/null || true

echo ""
echo "=== 3. Tìm process manager đang chạy ==="
if pgrep -f "uvicorn" >/dev/null; then
  echo "Found uvicorn. PID(s): $(pgrep -f uvicorn | tr '\n' ' ')"
elif systemctl list-units --type=service 2>/dev/null | grep -i freelancer; then
  echo "Found systemd service."
elif command -v pm2 >/dev/null && pm2 list 2>/dev/null | grep -q freelancer; then
  echo "Found pm2 process."
elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qi freelancer; then
  echo "Found docker container."
fi

echo ""
echo "=== 4. Reload code ==="
# rsync từ local máy bạn đã có ở C:\Users\An\Downloads\freelancerhub-main\backend\app\routers\
# Nếu code ở local chưa sync lên VPS, hãy git pull trước:
git pull origin main 2>/dev/null || echo "(no git or no changes)"

echo ""
echo "=== 5. Restart process ==="
if pgrep -f "uvicorn" >/dev/null; then
  pkill -HUP -f "uvicorn"  # gửi SIGHUP để reload nếu uvicorn --reload
  sleep 2
  if pgrep -f "uvicorn" >/dev/null; then
    pkill -f "uvicorn"
    sleep 1
    nohup ./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 > /var/log/freelancerhub.log 2>&1 &
  fi
  echo "uvicorn restarted"
elif systemctl list-units --type=service 2>/dev/null | grep -qi freelancer; then
  systemctl restart freelancerhub
  echo "systemd restarted"
elif command -v pm2 >/dev/null; then
  pm2 restart all
  echo "pm2 restarted"
elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qi freelancer; then
  docker restart $(docker ps --format '{{.Names}}' | grep -i freelancer | head -1)
  echo "docker restarted"
fi

echo ""
echo "=== 6. Verify ==="
sleep 3
curl -s -o /dev/null -w "Local /api/v1/categories: HTTP %{http_code}\n" \
  -H "Origin: https://freelancerhub.io.vn" \
  http://127.0.0.1:8000/api/v1/categories
