const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
console.log("len", html.length);
for (const pat of ["story=", "lib_path", "parchment_options", "autoplay", "bocfel-noz6"]) {
  console.log(pat, html.indexOf(pat));
}
const idx = html.indexOf("parchment_options");
console.log("around options", html.slice(Math.max(0, idx - 80), idx + 250));