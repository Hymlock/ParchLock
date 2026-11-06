const http = require("http");
const fs = require("fs");
const path = require("path");
const root = __dirname + "/..";
const port = 8765;
const ct = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".wasm":"application/wasm",".png":"image/png",".z5":"application/octet-stream",".z8":"application/octet-stream",".json":"application/json" };
http.createServer((q,s) => {
  let u = require("url").parse(q.url).pathname;
  let f = path.join(root, decodeURIComponent(u === "/" ? "/index.html" : u));
  fs.readFile(f, (e,d) => {
    if (e) { s.writeHead(404); s.end("no " + f); return; }
    s.writeHead(200, { "Content-Type": ct[path.extname(f)] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
    s.end(d);
  });
}).listen(port, () => console.log("listening", port, "root", root));
