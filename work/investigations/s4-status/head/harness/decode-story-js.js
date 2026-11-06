const fs = require("fs");
const path = require("path");
const src = process.argv[2];
const dst = process.argv[3];
let text = fs.readFileSync(src, "utf8").trim();
// formats: processBase64Zcode("..."); or processBase64Zcode('...');
const m = text.match(/processBase64Zcode\s*\(\s*["']([\s\S]*)["']\s*\)/);
if (!m) {
  // maybe just base64 payload
  const m2 = text.match(/["']([A-Za-z0-9+/=\s]{100,})["']/);
  if (!m2) { console.error("no base64"); process.exit(1); }
  text = m2[1];
} else text = m[1];
const buf = Buffer.from(text.replace(/\s+/g, ""), "base64");
fs.writeFileSync(dst, buf);
console.log("wrote", dst, "bytes", buf.length, "version", buf[0]);