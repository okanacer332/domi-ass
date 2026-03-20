#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Bu islem sadece yerel lisans kaydini temizler."
echo "Mukkellef verileri ve klasorler korunur."
echo
read -r -p "Devam etmek icin EVET yazin: " CONFIRM

if [[ "$CONFIRM" != "EVET" ]]; then
  echo "Islem iptal edildi."
  exit 0
fi

node tools/domizan-access-tool.cjs clear-license
echo
echo "Yerel lisans kaydi temizlendi."
