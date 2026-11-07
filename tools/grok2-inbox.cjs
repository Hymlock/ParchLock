#!/usr/bin/env node
// grok2 seat inbox reader (mirrors tools/claude-inbox.sh).
// Plain `worker-client read` returns only the OLDEST unread (mailbox.js slice 0,1).
// Always: read --all, print every body, append to log, loop until unread=0.
//   node tools/grok2-inbox.cjs
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const log = path.join(root, ".ai-bus/runtime/grok2-inbox.log");
const seat = "grok2";

function client(args) {
  const r = spawnSync(
    process.execPath,
    [path.join(root, ".ai-bus/bin/worker-client.js"), ...args, "--root", root, "--seat", seat],
    { encoding: "utf8", cwd: root, maxBuffer: 16 * 1024 * 1024 }
  );
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  if (out.includes('"fatal"') && !out.includes('"instanceId"')) {
    console.log("BUS ERROR:", out.slice(0, 500));
    process.exit(2);
  }
  const start = out.indexOf('{"instanceId"');
  if (start < 0) {
    console.log("UNPARSED:", out.slice(0, 2000));
    process.exit(3);
  }
  return JSON.parse(out.slice(start));
}

function main() {
  let total = 0;
  const lines = [];
  for (let i = 0; i < 30; i++) {
    const st = client(["status"]).result;
    const u = (st.unread && st.unread[seat]) || 0;
    console.log(`[grok2-inbox] unread=${u} round=${st.round}`);
    if (!u) break;
    const rd = client(["read", "--all"]).result;
    const ms = rd.messages || [];
    if (!ms.length) {
      console.log("status said unread but read --all empty; stop");
      break;
    }
    for (const m of ms) {
      total++;
      const block = `=== #${m.seq} ${m.from} -> ${m.to} | ${m.subject}\n${m.body || ""}\n`;
      console.log(block);
      lines.push(block);
    }
    if (rd.hasMore) console.log("MORE UNREAD REMAIN: looping");
  }
  if (lines.length) {
    fs.mkdirSync(path.dirname(log), { recursive: true });
    fs.appendFileSync(log, `\n---- ${new Date().toISOString()} ----\n` + lines.join("\n"));
  }
  if (!total) console.log("no unread messages");
  else console.log(`[grok2-inbox] read ${total} message(s); log ${log}`);
}

main();
