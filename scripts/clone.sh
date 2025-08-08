#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <url> [--persist] [--filename <name>]" >&2
  exit 1
fi

URL=""
PERSIST="false"
FILENAME=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --persist)
      PERSIST="true"; shift ;;
    --filename)
      FILENAME="${2:-}"; shift 2 ;;
    *)
      if [ -z "$URL" ]; then URL="$1"; else echo "Unexpected arg: $1" >&2; exit 1; fi
      shift ;;
  esac
done

if [ -n "$FILENAME" ]; then
  curl -s -X POST 'http://localhost:8080/clone' \
    -H 'Content-Type: application/json' \
    -d "{\"url\":\"$URL\",\"persist\":$PERSIST,\"filename\":\"$FILENAME\"}"
else
  curl -s -X POST 'http://localhost:8080/clone' \
    -H 'Content-Type: application/json' \
    -d "{\"url\":\"$URL\",\"persist\":$PERSIST}"
fi