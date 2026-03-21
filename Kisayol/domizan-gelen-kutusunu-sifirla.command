#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Domizan gelen kutusu temizleniyor..."
node tools/domizan-access-tool.cjs clear-inbox
echo
echo "Islem tamamlandi."
