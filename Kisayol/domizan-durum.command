#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
node tools/domizan-access-tool.cjs status
echo
