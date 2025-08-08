#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <url> [filename]" >&2
  exit 1
fi

URL="$1"
FILENAME="${2:-}"

if [ -n "$FILENAME" ]; then
  curl -s -X POST http://localhost:8080/clone \
    -H 'Content-Type: application/json' \
    --data-binary "{\"url\":\"$URL\",\"filename\":\"$FILENAME\"}" \
    -o "$FILENAME"
  echo "Saved: $FILENAME"
else
  curl -s -X POST http://localhost:8080/clone \
    -H 'Content-Type: application/json' \
    --data-binary "{\"url\":\"$URL\"}"
fi