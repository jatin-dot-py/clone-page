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
  const { url, filename, disposition } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing "url"' });
  }
  try {
    const started = Date.now();

    const safeName = filename && filename.trim().length > 0
      ? filename.trim()
      : `${slugify(url, { lower: true, strict: true }) || 'page'}.html`;

    // Build SingleFile CLI command (deno)
    const denoArgs = [
      'run',
      '--allow-all',
      'https://raw.githubusercontent.com/gildas-lormeau/single-file-cli/master/single-file-launcher.js',
      url,
      '--dump-content',
      '--browser-executable-path=/usr/bin/chromium',
    ];

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
        const durationMs = Date.now() - started;
        // Security headers; serve inline by default, allow opting into attachment via disposition
        const contentDisposition = (disposition === 'attachment')
          ? `attachment; filename="${safeName.replace(/"/g, '')}"`
          : `inline; filename="${safeName.replace(/"/g, '')}"`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', contentDisposition);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "sandbox; img-src 'self' data: blob: *; media-src 'self' data: blob: *; font-src 'self' data: blob: *; style-src 'unsafe-inline' data: blob: 'self'");
        res.setHeader('X-Clone-Duration-Ms', String(durationMs));
        return res.status(200).send(stdout);
      } catch (e) {
        return res.status(500).json({ ok: false, error: 'stream_failed', detail: String(e) });
      }
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`webcloner listening on :${PORT}`);
});