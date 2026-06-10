#!/usr/bin/env bash
#
# docker-pull-retry.sh <image[:tag]>
#
# Pulls a Docker image with bounded retries + exponential backoff.
#
# Why this exists: GitHub Actions `services:` containers are pulled implicitly by
# the runner with NO retry, so a transient Docker Hub timeout/rate-limit
# ("net/http: request canceled while waiting for connection") fails the whole job
# before any step runs. By starting Postgres/Redis manually via `docker run`, we
# can route their pulls through this retry wrapper instead.
#
set -euo pipefail

IMAGE="${1:?usage: docker-pull-retry.sh <image[:tag]>}"
MAX_ATTEMPTS="${DOCKER_PULL_ATTEMPTS:-5}"
BASE_DELAY="${DOCKER_PULL_BASE_DELAY:-5}" # seconds

attempt=1
delay="$BASE_DELAY"

while true; do
  echo "::group::Pulling ${IMAGE} (attempt ${attempt}/${MAX_ATTEMPTS})"
  if docker pull "$IMAGE"; then
    echo "✓ Pulled ${IMAGE} on attempt ${attempt}"
    echo "::endgroup::"
    exit 0
  fi
  echo "::endgroup::"

  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "::error::Failed to pull ${IMAGE} after ${MAX_ATTEMPTS} attempts"
    exit 1
  fi

  echo "✗ Pull failed; retrying in ${delay}s..."
  sleep "$delay"
  attempt=$((attempt + 1))
  delay=$((delay * 2))
done
