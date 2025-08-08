# Web Cloner (SingleFile, browser-powered)

This project provides a containerized service to clone web pages into self-contained single HTML using SingleFile (runs in headless Chromium for high-fidelity rendering).

- Back-end archiver: SingleFile CLI (Deno) with headless Chromium
- Interface: Simple HTTP API
- Output: raw HTML returned by the API response

Note: We intentionally choose SingleFile over Monolith because it renders JavaScript in a real browser. ArchiveBox is great but heavier; SingleFile is lightweight and focused.

## Quick start (Docker)

1. Build and run:

```
docker compose up --build -d
```

2. Clone a page (returns HTML):

```
curl -s -X POST http://localhost:8080/clone \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.wikipedia.org","filename":"wikipedia.html"}' > wikipedia.html
```

3. Health check:

```
curl -s http://localhost:8080/healthz | jq
```

4. Optional helper script:

```
./scripts/clone.sh https://example.com example.html
```

## API

- POST `/clone`
  - JSON body:
    - `url` (string, required)
    - `filename` (string, optional) suggested name used in `Content-Disposition` and for downloads
    - `disposition` ("inline" | "attachment", optional) default `inline`
  - Returns: `text/html` body of the archived page (no file is written to disk)

Example:
```
POST /clone
{ "url": "https://example.com", "filename": "example.html", "disposition": "attachment" }
```

Download to a file:
```
curl -s -X POST http://localhost:8080/clone \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","filename":"example.html"}' > example.html
```

Security headers are applied to the response to reduce risk when rendering HTML from untrusted sources (e.g. CSP sandbox, no-sniff). SingleFile still preserves page fidelity.

## Local development (Node)

```
cd server
npm install
npm run start
```

Note: The service requires `deno` and `chromium` to be installed when running outside Docker. Prefer Docker for convenience.

## Deployment

- Container image: build with Dockerfile `docker/app.Dockerfile`
- Compose: `docker compose up --build -d`
- GitHub Actions: on push to `main`, builds and publishes image to GHCR `ghcr.io/<owner>/<repo>:latest`
- One-click cloud: connect this repo to Render; `render.yaml` is provided for automatic deploy

### Pull & run the published image

Once published to GHCR, you can run:
```
docker run -p 8080:8080 ghcr.io/<owner>/<repo>:latest
```

## CLI (optional helper)

Run a one-off clone via the running container:
```
./scripts/clone.sh https://example.com example.html
```