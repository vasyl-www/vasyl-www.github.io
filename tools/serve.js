/* Локальний статичний сервер для розробки: node tools/serve.js [порт]. Лише 127.0.0.1. */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
function create() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.normalize(path.join(root, p));
    if (!f.startsWith(root) || /(^|\/)(node_modules|\.git|tests|tools|src)(\/|$)/.test(path.relative(root, f)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}
if (require.main === module) { const port = Number(process.argv[2]) || 8099; create().listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port)); }
module.exports = { create };
