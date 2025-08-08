# syntax=docker/dockerfile:1.6
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    DENO_INSTALL=/deno \
    NODE_ENV=production

# Install system deps + Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg git \
    chromium \
    fontconfig fonts-liberation \
    locales tzdata \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (LTS) via deb nodesource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get update && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh && \
    ln -s /deno/bin/deno /usr/local/bin/deno

# Install SingleFile CLI (deno executable will fetch on first run). We'll also install the Docker image tag for fallback.
# Note: We’ll use gildas-lormeau/single-file-cli via npx alternative: but deno is primary.

# Create app dir
WORKDIR /app

# Copy package files and install deps
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Create data directory
RUN mkdir -p /data
VOLUME ["/data"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://localhost:8080/healthz || exit 1

# Run as non-root
RUN useradd -m -u 10001 appuser && chown -R appuser:appuser /app /data
USER appuser

EXPOSE 8080
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","server/index.js"]