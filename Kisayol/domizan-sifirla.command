#!/bin/bash
set -euo pipefail

TARGETS=(
  "$HOME/Desktop/Domizan"
  "$HOME/Library/Application Support/domizan"
  "$HOME/Library/Application Support/Domizan"
  "$HOME/Library/Caches/domizan"
  "$HOME/Library/Caches/Domizan"
)

echo "Bu işlem yerel Domizan test verilerini silecektir."
echo
echo "Silinecek klasörler:"
for target in "${TARGETS[@]}"; do
  echo "- $target"
done
echo

read -r -p "Devam etmek için EVET yazın: " CONFIRM

if [[ "$CONFIRM" != "EVET" ]]; then
  echo "İşlem iptal edildi."
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
echo "Kaynak kod klasörü korunmuştur."
