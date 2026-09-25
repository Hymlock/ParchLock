const fs = require("fs");
const files = [
  "js/Navigator.js","js/HostEmglkenBridge.js","js/TranslatorUI.js","js/TextGate.js",
  "js/ActionSynth.js","js/MapIdentity.js","js/EmglkenHost.js","js/Consts.js","js/ParchLock.js","js/Actionable.js"
];
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  const bad = [];
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c === 0x2018 || c === 0x2019 || c === 0x201C || c === 0x201D || c === 0x2013 || c === 0x2014 || c === 0x2026 || c === 0x00A0) {
      bad.push({ i, c: c.toString(16), ctx: t.slice(Math.max(0,i-20), i+20) });
    }
  }
  if (bad.length) console.log(f, bad.slice(0,5));
  else console.log(f, "clean");
}
