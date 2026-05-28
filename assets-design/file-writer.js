const http = require('http');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const { filename, data } = JSON.parse(body);
      const buf = Buffer.from(data, 'base64');
      const filepath = path.join(ASSETS_DIR, filename);
      fs.writeFileSync(filepath, buf);
      console.log('Wrote', filepath, '—', buf.length, 'bytes');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, bytes: buf.length }));
    } catch (e) {
      console.error(e.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(3459, () => {
  console.log('File-writer server listening on :3458');
  console.log('Writing to:', ASSETS_DIR);
});
