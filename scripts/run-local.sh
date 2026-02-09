#!/usr/bin/env bash
# Run BudgetPro locally with Docker Compose (app on :3000, api on :3001). Optional quick test.
#
# Usage:
#   ./scripts/run-local.sh           # build and start, then run tests
#   ./scripts/run-local.sh --no-test  # build and start only (no curl checks)
#   ./scripts/run-local.sh down       # stop containers

set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml"
RUN_TEST=true

for arg in "$@"; do
  case "$arg" in
    --no-test) RUN_TEST=false ;;
  esac
done

if [ "$1" = "down" ]; then
  $COMPOSE down
  echo "Stopped. Volume budgetpro_data kept."
  exit 0
fi

echo "Building and starting BudgetPro (app + api + database)..."
$COMPOSE build
$COMPOSE up -d

echo "Waiting for API to be healthy..."
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null | grep -q 200; then
    echo "API is up."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Timeout waiting for API. Check: docker compose -f docker-compose.yml logs api"
    exit 1
  fi
  sleep 1
done

if [ "$RUN_TEST" = true ]; then
  echo "Quick test: GET /api/health"
  curl -s http://localhost:3001/api/health | head -c 200
  echo ""
  echo "Quick test: GET /api/transactions"
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/transactions)
  echo "  /api/transactions → $code"
  if [ "$code" = "200" ]; then
    echo "All good."
  else
    echo "  (non-200 is ok if DB is empty or not yet ready)"
  fi
fi

echo ""
echo "Running:"
echo "  App:  http://localhost:3000"
echo "  API:  http://localhost:3001"
echo "  Stop: ./scripts/run-local.sh down"
echo "  Logs: docker compose -f docker-compose.yml logs -f"
