#!/usr/bin/env bash
# Deploy BudgetPro for production (front + back + database).
# Uses nginx on port 80; API is proxied at /api. Data persists in volume budgetpro_data.
#
# Usage:
#   ./scripts/deploy-production.sh              # build and start
#   ./scripts/deploy-production.sh down        # stop and remove containers (keeps volume)
#   ./scripts/deploy-production.sh logs       # follow logs
#
# Require: Docker and Docker Compose v2 (docker compose).

set -e
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

case "${1:-up}" in
  up|start)
    echo "Building and starting BudgetPro (production mode)..."
    $COMPOSE build --no-cache
    $COMPOSE up -d
    echo "Done. App: http://localhost (or http://<this-server-ip>)"
    $COMPOSE ps
    ;;
  down|stop)
    $COMPOSE down
    echo "Containers stopped. Volume budgetpro_data kept. Run '$COMPOSE up -d' to start again."
    ;;
  logs)
    $COMPOSE logs -f
    ;;
  restart)
    $COMPOSE restart
    ;;
  *)
    echo "Usage: $0 [ up | down | logs | restart ]"
    echo "  up      - build and start (default)"
    echo "  down    - stop and remove containers"
    echo "  logs    - follow logs"
    echo "  restart - restart services"
    exit 1
    ;;
esac
