// Minimal local static server for the unbundled Aurora presentation build.
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.glb':'model/gltf-binary', '.png':'image/png'};
http.createServer((request, response) => {
  const pathname = request.url === '/' ? 'index.html' : decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.resolve(root, pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { response.writeHead(403); return response.end(); }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); return response.end('Not found'); }
    response.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'});
    response.end(data);
  });
}).listen(8080, '127.0.0.1', () => console.log('Aurora: http://aurora.test:8080 (or http://127.0.0.1:8080)'));
