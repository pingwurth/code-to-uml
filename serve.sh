#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-5401}"
node serve.js "${PORT}"
