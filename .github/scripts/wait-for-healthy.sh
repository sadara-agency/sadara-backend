#!/usr/bin/env bash
#
# wait-for-healthy.sh <container-name>
#
# Blocks until a Docker container's healthcheck reports "healthy", or fails after
# a timeout. Replaces the implicit health gating that GitHub Actions `services:`
# performs before running steps — since we now start the containers manually, we
# must wait for them ourselves before the test/migration steps connect.
#
set -euo pipefail

NAME="${1:?usage: wait-for-healthy.sh <container-name>}"
TIMEOUT="${HEALTH_TIMEOUT:-90}" # seconds
INTERVAL="${HEALTH_INTERVAL:-3}" # seconds

elapsed=0
echo "Waiting for container '${NAME}' to become healthy (timeout ${TIMEOUT}s)..."

while true; do
  # `health` is empty for containers without a healthcheck; guard with a default.
  status="$(docker inspect -f '{{ if .State.Health }}{{ .State.Health.Status }}{{ else }}no-healthcheck{{ end }}' "$NAME" 2>/dev/null || echo "missing")"

  case "$status" in
    healthy)
      echo "✓ '${NAME}' is healthy"
      exit 0
      ;;
    missing)
      echo "::error::Container '${NAME}' not found"
      exit 1
      ;;
  esac

  if [ "$elapsed" -ge "$TIMEOUT" ]; then
    echo "::error::Container '${NAME}' did not become healthy within ${TIMEOUT}s (last status: ${status})"
    echo "── docker ps ──"
    docker ps -a --filter "name=${NAME}"
    echo "── last logs ──"
    docker logs --tail 50 "$NAME" || true
    exit 1
  fi

  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done
