/**
 * grok2 inbox drain — ALWAYS use this (claude #6028 / operator 11-07).
 * Root cause: plain `read` = unread.slice(0,1) only (mailbox.js:452).
 * Always: loop status.unread.grok2; `read --all`; print FULL bodies.
 * Usage from repo root: node work/investigations/grok2/drain-inbox.cjs
 */
const { spawnSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "../../..");

function client(args) {
  const r = spawnSync(
    process.execPath,
    [path.join(root, ".ai-bus/bin/worker-client.js"), ...args, "--root", root, "--seat", "grok2"],
    { encoding: "utf8", cwd: root, maxBuffer: 16 * 1024 * 1024 }
  );
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  const start = out.indexOf('{"instanceId"');
  if (start < 0) throw new Error("no worker-client json: " + out.slice(0, 400));
  const j = JSON.parse(out.slice(start));
  if (!j.result) throw new Error("no result");
  return j.result;
}

function main() {
  let total = 0;
  for (let i = 0; i < 30; i++) {
    const st = client(["status"]);
    const u = (st.unread && st.unread.grok2) || 0;
    console.log(`[drain] pass=${i} unread=${u} halted=${!!st.halted} round=${st.round}`);
    if (!u) break;
    const rd = client(["read", "--all"]);
    const msgs = rd.messages || [];
    if (!msgs.length) {
      console.log("[drain] WARN unread>0 but empty read; stop");
      break;
    }
    for (const m of msgs) {
      total++;
      console.log("==== SEQ", m.seq, m.createdAt, m.from, `[${m.kind}]`, m.subject);
      console.log(m.body || "(empty)");
      console.log("");
    }
  }
  const end = client(["status"]);
  console.log(`[drain] done totalRead=${total} finalUnread=${(end.unread && end.unread.grok2) || 0}`);
}
main();
