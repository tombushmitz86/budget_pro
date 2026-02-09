#!/usr/bin/env bash
# Run BudgetPro without Docker: build frontend, then run API + app on one port.
# Bind to 0.0.0.0 so the app is reachable from Ultra.cc or your network.
#
# Usage (from project root):
#   ./scripts/run-without-docker.sh           # build, then start on port 3000
#   PORT=8080 ./scripts/run-without-docker.sh # use port 8080
#
# Then open http://localhost:3000 (or http://YOUR_ULTRA_CC_IP:3000).

set -e
cd "$(dirname "$0")/.."

export SERVE_APP=1
export HOST=0.0.0.0
export PORT=${PORT:-3000}

echo "Installing dependencies..."
npm ci

echo "Building frontend (VITE_API_URL= for same-origin /api)..."
VITE_API_URL= npm run build

echo "Starting API + app on http://${HOST}:${PORT}"
echo "Press Ctrl+C to stop."
exec node server/index.js
