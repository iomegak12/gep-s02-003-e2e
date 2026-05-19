#!/usr/bin/env bash
# Launch the GEP DevOps interactive menu (PowerShell Core).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec pwsh -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_DIR/scripts/devops.ps1" "$@"
