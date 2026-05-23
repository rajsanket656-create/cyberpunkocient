/**
 * proxy.js - Local development CORS proxy
 * Run: node proxy.js
 * This sits at http://localhost:3001/lookup?mobile=NUMBER
 * and proxies to the external API server-side (no CORS issues).
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Allow all origins for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const mobile = parsedUrl.query.mobile;

  if (!mobile) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'mobile parameter is required' }));
    return;
  }

  const apiUrl = `https://numinfo.eu.cc/api/check?apikey=freekeyhostmafia&number=${encodeURIComponent(mobile)}`;
  console.log(`[Proxy] Fetching: ${apiUrl}`);

  https.get(apiUrl, (apiRes) => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => {
      res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  }).on('error', (err) => {
    console.error('[Proxy] Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy fetch failed', detail: err.message }));
  });
});

server.listen(PORT, () => {
  console.log(`✅ Local CORS proxy running at http://localhost:${PORT}`);
  console.log(`   Test: http://localhost:${PORT}/lookup?mobile=8335016483`);
});
