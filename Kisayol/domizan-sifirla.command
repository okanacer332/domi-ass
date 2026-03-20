#!/bin/bash
set -euo pipefail

TARGETS=(
  "$HOME/Desktop/Domizan"
  "$HOME/Library/Application Support/domizan"
  "$HOME/Library/Application Support/Domizan"
  "$HOME/Library/Caches/domizan"
  "$HOME/Library/Caches/Domizan"
  "/Users/Shared/Domizan"
)

echo "Bu islem yerel Domizan test verilerini silecektir."
echo
echo "Silinecek klasorler:"
for target in "${TARGETS[@]}"; do
  echo "- $target"
done
echo

read -r -p "Devam etmek icin EVET yazin: " CONFIRM

if [[ "$CONFIRM" != "EVET" ]]; then
  echo "Islem iptal edildi."
  exit 0
fi

for target in "${TARGETS[@]}"; do
  if [[ -e "$target" ]]; then
    echo "Siliniyor: $target"
    rm -rf "$target"
  fi
done

echo
echo "Yerel Domizan verileri temizlendi."
echo "Kaynak kod klasoru korunmustur."
