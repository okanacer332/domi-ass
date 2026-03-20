#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Bu islem trial kaydini temizler."
echo "Deneme daha baslatilmamis gorunur hale gelir."
echo
read -r -p "Devam etmek icin EVET yazin: " CONFIRM

if [[ "$CONFIRM" != "EVET" ]]; then
  echo "Islem iptal edildi."
  exit 0
fi

node tools/domizan-access-tool.cjs reset-trial
echo
echo "Trial kaydi temizlendi."
