/**
 * Thin App Engine proxy → Cloud Run (clickedin-app).
 *
 * clickedin.hookstep.in still routes via App Engine's custom-domain front end
 * on this project, so App Engine must stay enabled. This stub does NOT run
 * Gemini / LinkedIn logic; it only forwards to Cloud Run.
 */
const http = require('http');
const https = require('https');

const port = process.env.PORT || 8080;
const TARGET_HOST = process.env.CLOUD_RUN_HOST || 'clickedin-app-skhmy4jczq-uc.a.run.app';

function proxy(req, res) {
  const url = new URL(req.url || '/', `https://${TARGET_HOST}`);
  const opts = {
    hostname: TARGET_HOST,
    port: 443,
    path: url.pathname + url.search,
    method: req.method,
    headers: { ...req.headers, host: TARGET_HOST },
  };
  const upstream = https.request(opts, (up) => {
    res.writeHead(up.statusCode || 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad gateway: ' + err.message);
  });
  req.pipe(upstream);
}

http.createServer(proxy).listen(port, () => {
  console.log(`App Engine proxy → https://${TARGET_HOST} on :${port}`);
});
