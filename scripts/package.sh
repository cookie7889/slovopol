#!/usr/bin/env bash
set -euo pipefail
npm run typecheck
npm run build
cd dist
7z a "../slovopol-$(date +%Y%m%d-%H%M).zip" .
cd ..
echo "Готово: slovopol-$(date +%Y%m%d-%H%M).zip — загружайте в Developer Console"
