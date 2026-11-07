const fs = require("fs");
const s = fs.readFileSync("js/ModuleStatFactsClaude.js", "utf8");
const j = require("../../2026-10-11-zil-source-flags.json");

function blockNear(label) {
  const re = new RegExp(label, "i");
  const m = s.search(re);
  if (m < 0) return null;
  const chunk = s.slice(m, m + 2500);
  return {
    switchable: (chunk.match(/"switchable"\s*:\s*[^\n,}]+/) || [])[0] || null,
    on: (chunk.match(/"on"\s*:\s*[^\n,}]+/) || [])[0] || null,
    lightForms: (chunk.match(/"lightForms"\s*:\s*\{[\s\S]{0,300}?\}/) || [])[0] || null,
    attributeMap: (chunk.match(/"attributeMap"\s*:\s*\{[^\}]+\}/) || [])[0] || null
  };
}

for (const t of ["Hollywood Hijinx", "HollywoodHijinx", "Starcross", "Stationfall"]) {
  console.log("====", t);
  console.log(JSON.stringify(blockNear(t), null, 2));
}

for (const t of ["HollywoodHijinx.z3.js", "Starcross.z3.js", "Stationfall.z3.js"]) {
  const g = j[t];
  console.log("FLAGS", t);
  if (!g) {
    console.log(" missing");
    continue;
  }
  for (const [k, v] of Object.entries(g.flags || {})) {
    if (/LIGHT|ONBIT|FLAME|LAMP|SWITCH/i.test(k)) {
      console.log(k, "bit", v.bit, "exact", v.exact, (v.examples || []).slice(0, 5));
    }
  }
}
