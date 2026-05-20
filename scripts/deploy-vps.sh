#!/usr/bin/env bash
# Deploy on a small VPS: free Docker disk, build backend on host, then compose up.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Freeing Docker disk..."
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker container prune -f 2>/dev/null || true

echo "==> Disk usage:"
df -h / || true
docker system df 2>/dev/null || true

echo "==> Backend: npm on host (not inside Docker)"
cd "$ROOT/backend"
if [ ! -f package-lock.json ]; then
  echo "package-lock.json missing" >&2
  exit 1
fi
npm ci --no-audit --no-fund
npx prisma generate
npm run build
npm prune --omit=dev
npm cache clean --force

echo "==> Backend Docker image (prebuilt artifacts)"
cd "$ROOT"
export BACKEND_DOCKERFILE=Dockerfile.prebuilt
IGNORE="$ROOT/backend/.dockerignore"
IGNORE_OFF="$ROOT/backend/.dockerignore.off"
if [ -f "$IGNORE" ]; then
  mv "$IGNORE" "$IGNORE_OFF"
fi
trap 'if [ -f "$IGNORE_OFF" ]; then mv "$IGNORE_OFF" "$IGNORE"; fi' EXIT

docker compose build backend
docker compose build frontend
docker compose up -d

echo "==> Done. Run migrations if needed:"
echo "    docker compose exec backend npx prisma migrate deploy"
