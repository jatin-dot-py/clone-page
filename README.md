# Web Cloner (SingleFile, browser-powered)

This project provides a containerized service to clone web pages into self-contained single HTML files using SingleFile (runs in headless Chromium for high-fidelity rendering).

- Back-end archiver: SingleFile CLI (Deno) with headless Chromium
- Interface: Simple HTTP API
- Output: `.html` files stored under `./data`

Note: We intentionally choose SingleFile over Monolith because it renders JavaScript in a real browser. ArchiveBox is great but heavier; SingleFile is lightweight and focused.

## Quick start

1. Prerequisites: Docker + Docker Compose
2. Start the service:

```
docker compose up -d --build
```

3. Clone a page via API:

```
curl -s -X POST http://localhost:8080/clone \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.wikipedia.org","filename":"wikipedia.html"}' | jq
```

The saved file will be in `./data/wikipedia.html`.

4. Health check:

```
curl http://localhost:8080/healthz
```

## API

- POST `/clone`
  - JSON body:
    - `url` (string, required)
    - `filename` (string, optional) — default slugified from URL
    - `inline` (boolean, optional) — if true, responds with HTML content inline
  - Response: JSON with `ok`, `path`, `size_bytes`, and `duration_ms`. If `inline=true`, returns HTML directly.

Example:
```
POST /clone
{ "url": "https://example.com", "filename": "example.html" }
```

## Configuration

- Volume `./data` is mounted to `/data` in the container for output files.
- Environment `SINGLEFILE_ARGS` can be used to pass extra SingleFile flags (e.g. wait conditions).
- The container sets `/dev/shm` to reduce Chromium crashes inside Docker.

## CLI (optional helper)

Run a one-off clone via the running container:
```
./scripts/clone.sh https://example.com example.html
```

## Notes

- Some pages protected by anti-bot/CAPTCHA or requiring authentication may need a custom user profile/cookies; future enhancements can add cookie file support.
- For large/complex pages, first render may take longer due to headless Chromium startup.

## Alternatives

- ArchiveBox (heavier full archiving platform; also browser-powered).
- Monolith (lightweight but typically does not render JavaScript; not chosen here).