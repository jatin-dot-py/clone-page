# Web Cloner (SingleFile, browser-powered)

This project provides a containerized service to clone web pages into self-contained single HTML using SingleFile (runs in headless Chromium for high-fidelity rendering).

- Back-end archiver: SingleFile CLI (Deno) with headless Chromium
- Interface: Simple HTTP API
- Default: returns raw HTML in the response
- Optional: persist saved `.html` under `./data` if requested

Note: We intentionally choose SingleFile over Monolith because it renders JavaScript in a real browser. ArchiveBox is great but heavier; SingleFile is lightweight and focused.

## Quick start

1. Prerequisites: Docker + Docker Compose
2. Start the service:

```
docker compose up -d --build
```

3. Clone a page (returns HTML body):

```
# POST
curl -s -X POST 'http://localhost:8080/clone' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.wikipedia.org"}' | head -n 20

# GET
curl -s 'http://localhost:8080/clone?url=https://www.wikipedia.org' | head -n 20
```

4. Persist the file (and still return HTML):

```
curl -i -s -X POST 'http://localhost:8080/clone' \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.wikipedia.org","persist":true,"filename":"wikipedia.html"}' | head -n 20
# Response headers include X-Saved-Path: /data/wikipedia.html
```

5. Health check:

```
curl http://localhost:8080/healthz
```

## API

- POST `/clone` (recommended)
  - JSON body:
    - `url` (string, required)
    - `filename` (string, optional) — used if `persist=true`
    - `persist` (boolean, optional, default false) — if true, saves file to `/data` and sets `X-Saved-Path` header
  - Response: HTML content with `Content-Type: text/html`. Headers include `X-Duration-Ms` and optionally `X-Saved-Path`.

- GET `/clone` (convenience)
  - Query params: `url`, `filename` (optional), `persist` (`true|1` to save)
  - Response: HTML content

## Configuration

- Volume `./data` is mounted to `/data` in the container for optional persisted files.
- Environment `SINGLEFILE_ARGS` can be used to pass extra SingleFile flags (e.g. wait conditions).
- The container sets `/dev/shm` to reduce Chromium crashes inside Docker.

## CLI (optional helper)

Run a one-off clone via the running container:
```
./scripts/clone.sh https://example.com
```

## Notes

- Some pages protected by anti-bot/CAPTCHA or requiring authentication may need a custom user profile/cookies; future enhancements can add cookie file support.
- For large/complex pages, first render may take longer due to headless Chromium startup.

## Alternatives

- ArchiveBox (heavier full archiving platform; also browser-powered).
- Monolith (lightweight but typically does not render JavaScript; not chosen here).