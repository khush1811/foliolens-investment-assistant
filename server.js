'use strict';

const http = require('node:http');
const path = require('node:path');
const { readFile } = require('node:fs/promises');
const { sendClassification } = require('./model');

const port = Number(process.env.PORT ?? 4173);
const root = path.join(__dirname, 'dist');
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/portfolio.js', ['portfolio.js', 'text/javascript; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/sample-holdings.csv', ['sample-holdings.csv', 'text/csv; charset=utf-8']]
]);

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

function readQuestion(request) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    request.on('data', chunk => {
      total += chunk.length;
      if (total <= 2048) chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () => {
      if (total > 2048) return reject(Error('Request too large.'));
      try {
        const { question } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (typeof question !== 'string' || !question.trim() || question.length > 350) throw Error('Question required (1–350 characters).');
        resolve(question.trim());
      } catch (error) { reject(error); }
    });
  });
}

let active = 0;
let requestTimes = [];
const server = http.createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'self'");
  const host = request.headers.host || '';
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json(response, 403, { error: 'Use the local development address.' });
  const url = new URL(request.url, 'http://' + host);
  const modelReady = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  if (request.method === 'GET' && url.pathname === '/api/status') return json(response, 200, { modelReady });
  if (request.method === 'POST' && url.pathname === '/api/intent') {
    if (request.headers.origin !== 'http://' + host || !/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) {
      return json(response, 403, { error: 'Only the local app can request AI routing.' });
    }
    if (!modelReady) return json(response, 503, { error: 'Rules mode is available.' });
    const now = Date.now();
    requestTimes = requestTimes.filter(time => now - time < 60_000);
    if (active >= 2 || requestTimes.length >= 12) return json(response, 429, { error: 'Use rules mode while AI routing is busy.' });
    let question;
    try { question = await readQuestion(request); }
    catch { return json(response, 400, { error: 'Use a valid question of 1–350 characters.' }); }
    if (active >= 2 || requestTimes.length >= 12) return json(response, 429, { error: 'Use rules mode while AI routing is busy.' });
    requestTimes.push(now);
    active++;
    try {
      return json(response, 200, { intent: await sendClassification(question, process.env) });
    } catch {
      return json(response, 502, { error: 'The model could not route this question.' });
    } finally { active--; }
  }
  const asset = assets.get(url.pathname);
  if (!asset || !['GET','HEAD'].includes(request.method)) return json(response, 404, { error: 'Page not found.' });
  try {
    const body = await readFile(path.join(root, asset[0]));
    response.writeHead(200, { 'Content-Type': asset[1], 'Content-Length': body.length, 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    json(response, 500, { error: 'The application file could not be read.' });
  }
});
server.requestTimeout = 12_000;
server.listen(port, '127.0.0.1', () => console.log('FolioLens is ready at http://127.0.0.1:' + server.address().port));
