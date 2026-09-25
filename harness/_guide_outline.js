const fs = require("fs");
const p = "Full Stack Engine Level Conversion.txt";
const st = fs.statSync(p);
console.log("bytes", st.size);
const t = fs.readFileSync(p, "utf8");
console.log("chars", t.length, "lines", t.split(/\n/).length);
// Print headings / numbered sections / ALL-CAPS markers
t.split(/\n/).forEach((l,i) => {
  const s = l.trim();
  if (!s) return;
  if (/^(#+|\d+[\.)]\s|[A-Z][A-Z0-9 /-]{8,}|Part |Section |Phase |Layer |Step |TODO|NOTE|WARNING|CRITICAL|Architecture|Overlay|RAM|HEAP|Map|Action|Text-Gate|Spoiler|Glulx|Z-Machine|Emglken|Provider|Translator|UIPayload|Navigator|Beautify|Inventory|Scope|Attribute)/.test(s) && s.length < 140) {
    console.log((i+1)+"|"+s.slice(0,140));
  }
});
