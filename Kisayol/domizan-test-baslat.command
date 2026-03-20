#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$APP_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm bulunamadı. Önce Node.js ve npm kurulumu yapılmalı."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "node_modules bulunamadı. npm install çalışıyor..."
  npm install
fi

echo "Domizan geliştirme modu başlatılıyor..."
npm run dev
