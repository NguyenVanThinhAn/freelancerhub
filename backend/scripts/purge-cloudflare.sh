#!/usr/bin/env bash
# purge-cloudflare.sh — chạy trên máy local (Windows PowerShell tương đương)

# Lấy API token từ: https://dash.cloudflare.com/profile/api-tokens
# Cần scope: Zone.Cache Purge
API_TOKEN="${CLOUDFLARE_API_TOKEN}"
ZONE_ID="${CLOUDFLARE_ZONE_ID}"  # lấy từ dashboard domain overview

if [ -z "$API_TOKEN" ] || [ -z "$ZONE_ID" ]; then
  echo "Set CLOUDFLARE_API_TOKEN và CLOUDFLARE_ZONE_ID trước:"
  echo "  export CLOUDFLARE_API_TOKEN=xxxxxxxxxxxx"
  echo "  export CLOUDFLARE_ZONE_ID=xxxxxxxxxxxx"
  echo ""
  echo "Hoặc purge từ Dashboard: https://dash.cloudflare.com → domain → Caching → Purge Everything"
  exit 1
fi

echo "=== Purge Cloudflare cache cho 2 domain ==="
for HOST in "freelancerhub.io.vn" "backend.freelancerhub.io.vn"; do
  echo ""
  echo "Purging $HOST..."
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"hosts\":[\"$HOST\"]}" \
    | head -c 200
  echo ""
done
echo ""
echo "Done. Đợi 5-10s rồi refresh browser (Ctrl+Shift+R)."
