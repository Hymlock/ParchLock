// B7 harness triage runner (claude #6101). Sequential, 300s timeout each.
// Usage: node work/investigations/b7-harness/run-triage.cjs [startIndex] [count]
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "../../..");
const harnessDir = path.join(root, "harness");
const outDir = __dirname;
const TIMEOUT_MS = 300000;
const start = Number(process.argv[2] || 0);
const count = Number(process.argv[3] || 9999);

const skipEnv = [
  // needs external paths / interactive / servers / argv
  "static-server.js",
  "module-install-e2e.js",
  "decode-story-js.js",
  "inspect-single.js", // manual: node inspect-single.js <html>
  "e2e-anchor-path.js", // needs live static server :8765
  "matrix-playhtml.js", // needs live static server :8765
  "r4-local-section-frame.js", // random Wumpus walk; flaky multi-minute / often 300s TIMEOUT
  "save-labels-live.js", // external Downloads path fixture not in repo
  "stats-sweep.js", // full catalog research sweep, not a unit gate
  "status-claude-batch-live.js", // needs argv FILE.js from SPECS
  "status-probe-matrix.js", // full headless-status matrix research sweep
  "status-probe-headless.js", // research/probe matrix sibling
  "underline-lifetime.js" // external Downloads save fixture not in repo
];
const longTimeout = {
  "portrait-prompt.js": 600000,
  "d100-read-aloud.js": 600000,
  "d96-menu-handle-map-tab.js": 600000,
  "p3-mic-lifecycle.js": 600000,
  "e4-transcript.js": 600000
};

const files = fs
  .readdirSync(harnessDir)
  .filter((f) => f.endsWith(".js"))
  .filter((f) => !f.startsWith("_")) // skip private probes unless we want them
  .sort();

const batch = files.slice(start, start + count);
const results = [];

function classifyOutput(name, code, out) {
  const text = out || "";
  // Prefer explicit "N PASS / M FAIL" or SUMMARY ... PASS=N FAIL=M (inform-layout).
  const slash = text.match(/(\d+)\s*PASS\s*\/\s*(\d+)\s*FAIL/i);
  const sum = text.match(/PASS\s*=\s*(\d+).*?FAIL\s*=\s*(\d+)/i) || text.match(/"pass"\s*:\s*(\d+).*?"fail"\s*:\s*(\d+)/i);
  let pass = 0, fail = 0;
  if (slash) {
    pass = Number(slash[1]);
    fail = Number(slash[2]);
  } else if (sum) {
    pass = Number(sum[1]);
    fail = Number(sum[2]);
  } else {
    const passM = text.match(/(\d+)\s*PASS\b/i);
    const failM = text.match(/\bFAIL(?:URES)?\s+(\d+)/i) || text.match(/(\d+)\s+failed\b/i);
    pass = passM ? Number(passM[1]) : code === 0 && /PASS/i.test(text) ? 1 : 0;
    fail = failM ? Number(failM[1]) : code !== 0 ? 1 : 0;
  }
  let status = "PASS";
  if (skipEnv.includes(name)) status = "ENV";
  else if (code === 124 || /TIMEOUT/i.test(text)) status = "TIMEOUT";
  else if (code !== 0 || fail > 0) status = "FAIL";
  else if (code === 0) status = "PASS";
  return { name, status, code, pass, fail, tail: text.slice(-800) };
}

console.log("batch", start, "count", batch.length, "of", files.length);
for (const name of batch) {
  if (skipEnv.includes(name)) {
    results.push({ name, status: "ENV", code: 0, pass: 0, fail: 0, tail: "skipped env/external" });
    console.log("ENV", name);
    continue;
  }
  const t0 = Date.now();
  console.log("RUN", name);
  const r = spawnSync(process.execPath, [path.join(harnessDir, name)], {
    cwd: root,
    encoding: "utf8",
    timeout: longTimeout[name] || TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024
  });
  let code = r.status;
  let out = (r.stdout || "") + (r.stderr || "");
  if (r.error && r.error.killed) {
    code = 124;
    out += "\nTIMEOUT";
  }
  const row = classifyOutput(name, code == null ? 1 : code, out);
  row.ms = Date.now() - t0;
  results.push(row);
  console.log(row.status, name, "p", row.pass, "f", row.fail, row.ms + "ms");
  fs.writeFileSync(path.join(outDir, "results-partial.json"), JSON.stringify(results, null, 2));
}

fs.writeFileSync(path.join(outDir, "results-" + start + ".json"), JSON.stringify(results, null, 2));

// merge all results-*.json
const all = [];
for (const f of fs.readdirSync(outDir)) {
  if (/^results-\d+\.json$/.test(f) || f === "results-partial.json") {
    try {
      all.push(...JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8")));
    } catch (e) {}
  }
}
// dedupe by name keep last
const by = {};
all.forEach((r) => {
  by[r.name] = r;
});
const merged = Object.values(by).sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(path.join(outDir, "results-all.json"), JSON.stringify(merged, null, 2));

let md = "# B7 harness triage\n\n";
md += "Runner: work/investigations/b7-harness/run-triage.cjs (300s timeout, skip `_` probes + listed ENV).\n\n";
md += "| harness | status | pass | fail | ms |\n|---|---|---:|---:|---:|\n";
for (const r of merged) {
  md += `| \`${r.name}\` | ${r.status} | ${r.pass} | ${r.fail} | ${r.ms || ""} |\n`;
}
md += "\n## FAIL details\n\n";
for (const r of merged.filter((x) => x.status === "FAIL" || x.status === "TIMEOUT")) {
  md += "### `" + r.name + "` (" + r.status + " code=" + r.code + ")\n\n";
  md += "```\n" + (r.tail || "").slice(-600) + "\n```\n\n";
  md += "- Classification: **TBD** (stale test vs product) — fill on review\n\n";
}
fs.writeFileSync(path.join(outDir, "TRIAGE.md"), md);
console.log("Wrote TRIAGE.md rows", merged.length);
