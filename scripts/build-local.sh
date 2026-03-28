#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BUN_VERSION="1.3.5"
export PATH="$HOME/.local/share/mise/installs/bun/$BUN_VERSION/bin:$PATH"

bun install --frozen-lockfile
bun run build:single-exe
echo "Built: cli/dist-exe/bun-linux-x64-baseline/hapi"
