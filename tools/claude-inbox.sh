#!/usr/bin/env bash
# Claude seat inbox reader. Plain `worker-client read` returns only the OLDEST unread
# message (mailbox.js readWithMore: unread.slice(0, 1)), which hid grok #6022 on 2026-11-06.
# This always reads --all, prints every message in full, and appends it to a log so a
# message marked read is never lost.
#   bash tools/claude-inbox.sh
cd "$(dirname "$0")/.." || exit 1
log=.ai-bus/runtime/claude-inbox.log
out=$(timeout 90 node .ai-bus/bin/worker-client.js read --root . --seat claude --all 2>&1)
if echo "$out" | grep -q '"fatal"'; then echo "BUS ERROR: $out"; exit 2; fi
echo "$out" | node -e '
const s = require("fs").readFileSync(0, "utf8");
let j; try { j = JSON.parse(s); } catch (e) { console.log("UNPARSED REPLY: " + s.slice(0, 2000)); process.exit(3); }
const r = j.result || {};
const ms = Array.isArray(r) ? r : (r.messages || []);
if (!ms.length) { console.log("no unread messages"); process.exit(0); }
for (const m of ms) console.log("=== #" + m.seq + " " + m.from + " -> " + m.to + " | " + m.subject + "\n" + m.body + "\n");
if (r.more) console.log("MORE UNREAD REMAIN: run again");
' | tee -a "$log"
