import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import slugify from 'slugify';

const app = express();
app.use(bodyParser.json());
app.use(morgan('dev'));

const DATA_DIR = '/data';
const DEFAULT_WAIT = process.env.SINGLEFILE_ARGS || '--browser-wait-until=networkidle2';
const PORT = process.env.PORT || 8080;

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.post('/clone', async (req, res) => {
  const { url, filename, inline } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing "url"' });
  }
  try {
    const started = Date.now();
    await fs.mkdir(DATA_DIR, { recursive: true });

    const safeName = filename && filename.trim().length > 0
      ? filename.trim()
      : `${slugify(url, { lower: true, strict: true }) || 'page'}.html`;

    const outPath = path.join(DATA_DIR, safeName);

    // Build SingleFile CLI command (deno)
    // Using single-file-cli Deno entry: deno run with permissions
    // See: https://github.com/gildas-lormeau/single-file-cli
    const denoArgs = [
      'run',
      '--allow-all',
      'https://raw.githubusercontent.com/gildas-lormeau/single-file-cli/master/single-file-launcher.js',
      url,
      outPath,
      '--browser-executable-path=/usr/bin/chromium',
    ];

    // Append optional args from env
    if (DEFAULT_WAIT) {
      denoArgs.push(...DEFAULT_WAIT.split(' '));
    }

    const child = spawn('deno', denoArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      return res.status(500).json({ ok: false, error: String(err) });
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ ok: false, error: 'singlefile_failed', code, stderr });
      }
      try {
        const stat = await fs.stat(outPath);
        const durationMs = Date.now() - started;
        if (inline) {
          const html = await fs.readFile(outPath, 'utf8');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(html);
        }
        return res.json({ ok: true, path: `/data/${safeName}`, size_bytes: stat.size, duration_ms: durationMs });
      } catch (e) {
        return res.status(500).json({ ok: false, error: 'output_not_found', detail: String(e) });
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`webcloner listening on :${PORT}`);
});