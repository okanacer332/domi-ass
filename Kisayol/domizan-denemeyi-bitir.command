#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Bu islem deneme suresini aninda bitmis olarak isaretler."
echo "Sonraki acilista Domizan kilitli moda dusecektir."
echo
read -r -p "Devam etmek icin EVET yazin: " CONFIRM

if [[ "$CONFIRM" != "EVET" ]]; then
  echo "Islem iptal edildi."
  exit 0
fi

node tools/domizan-access-tool.cjs expire-trial
echo
echo "Deneme suresi bitmis olarak ayarlandi."
