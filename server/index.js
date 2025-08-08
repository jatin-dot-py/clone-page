import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import slugify from 'slugify';
import os from 'node:os';

const app = express();
app.use(bodyParser.json());
app.use(morgan('dev'));

const DATA_DIR = '/data';
const DEFAULT_WAIT = process.env.SINGLEFILE_ARGS || '--browser-wait-until=networkidle2';
const PORT = process.env.PORT || 8080;

function resolveDenoBin() {
  const home = process.env.HOME || os.homedir() || '';
  const candidates = [
    process.env.DENO_PATH,
    '/usr/local/bin/deno',
    '/usr/bin/deno',
    path.join(home, '.deno', 'bin', 'deno'),
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fsSync.existsSync(c)) return c;
    } catch {}
  }
  return 'deno';
}

const DENO_BIN = resolveDenoBin();

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

async function runSingleFile(url, outPath) {
  const denoArgs = [
    'run',
    '--allow-all',
    'https://raw.githubusercontent.com/gildas-lormeau/single-file-cli/master/single-file-launcher.js',
    url,
    outPath,
    '--browser-executable-path=/usr/bin/chromium',
  ];
  if (DEFAULT_WAIT) {
    denoArgs.push(...DEFAULT_WAIT.split(' '));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(DENO_BIN, denoArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => reject(err));

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`singlefile_failed code=${code} stderr=${stderr}`));
      } else {
        resolve(undefined);
      }
    });
  });
}

async function fetchFallbackHtml(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36 WebCloner/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!response.ok) {
    throw new Error(`fetch_failed status=${response.status}`);
  }
  return await response.text();
}

async function cloneToHtml({ url, filename, persist }) {
  if (!url || typeof url !== 'string') {
    const err = new Error('Missing "url"');
    err.statusCode = 400;
    throw err;
  }

  const started = Date.now();

  const shouldPersist = Boolean(persist);
  const targetDir = shouldPersist ? DATA_DIR : os.tmpdir();

  if (shouldPersist) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  const baseName = filename && filename.trim().length > 0
    ? filename.trim()
    : `${slugify(url, { lower: true, strict: true }) || 'page'}-${Date.now()}.html`;

  const outPath = path.join(targetDir, baseName);

  let html = '';
  let usedFallback = false;
  try {
    await runSingleFile(url, outPath);
    html = await fs.readFile(outPath, 'utf8');
  } catch (e) {
    // Fallback to simple fetch if SingleFile is unavailable
    usedFallback = true;
    html = await fetchFallbackHtml(url);
    if (shouldPersist) {
      try {
        await fs.writeFile(outPath, html, 'utf8');
      } catch {}
    }
  } finally {
    if (!shouldPersist && !usedFallback) {
      try { await fs.unlink(outPath); } catch {}
    }
  }

  const durationMs = Date.now() - started;
  return {
    html,
    durationMs,
    savedPath: shouldPersist ? `/data/${baseName}` : null,
  };
}

app.post('/clone', async (req, res) => {
  const { url, filename, persist } = req.body || {};
  try {
    const { html, durationMs, savedPath } = await cloneToHtml({ url, filename, persist });
    if (savedPath) {
      res.setHeader('X-Saved-Path', savedPath);
    }
    res.setHeader('X-Duration-Ms', String(durationMs));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (e) {
    const status = e && e.statusCode ? e.statusCode : 500;
    return res.status(status).json({ ok: false, error: String(e.message || e) });
  }
});

app.get('/clone', async (req, res) => {
  const url = req.query.url;
  const filename = req.query.filename;
  const persist = req.query.persist === '1' || req.query.persist === 'true';
  try {
    const { html, durationMs, savedPath } = await cloneToHtml({ url, filename, persist });
    if (savedPath) {
      res.setHeader('X-Saved-Path', savedPath);
    }
    res.setHeader('X-Duration-Ms', String(durationMs));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (e) {
    const status = e && e.statusCode ? e.statusCode : 500;
    return res.status(status).json({ ok: false, error: String(e.message || e) });
  }
});

app.listen(PORT, () => {
  console.log(`webcloner listening on :${PORT}`);
});