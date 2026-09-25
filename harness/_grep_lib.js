const fs = require("fs");
const path = require("path");
const files = [
  "js/EmglkenHost.js","js/EmglkenProvider.js","js/HostEmglkenBridge.js","js/VmProbeLoader.js",
  "js/GlkTapProvider.js","js/RemGlkTapProvider.js","play-emglken.html","play.html"
];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const t = fs.readFileSync(f, "utf8");
  if (t.includes("lib_path") || t.includes('lib/"') || t.includes("parchment_options")) {
    console.log("HIT", f);
    t.split(/\n/).forEach((l,i)=>{ if (/lib_path|parchment_options/.test(l)) console.log((i+1)+":"+l.trim().slice(0,160)); });
  }
}
// search injected region of tapped for options override
const t = fs.readFileSync("lib/parchment-modern/parchment-single-tapped.html", "utf8");
const markers = ["lib_path:", "lib_path =", 'lib_path:"lib', "parchment_options ="];
for (const m of markers) {
  let i = 0, c = 0;
  while ((i = t.indexOf(m, i)) >= 0 && c < 3) {
    if (i > 500000 || i < 5000) console.log("marker", m, "at", i, t.slice(i, i+80).replace(/\n/g," "));
    i += m.length; c++;
  }
}
