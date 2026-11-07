#!/usr/bin/env bash
# Claude seat inbox reader. Plain `worker-client read` returns only the OLDEST unread
# message (mailbox.js readWithMore: unread.slice(0, 1)), which hid grok #6022 on 2026-11-06,
# and `read --all` returns a bounded batch, so this loops until the inbox is empty.
# Every message is printed in full and appended to a log so nothing marked read is lost.
#   bash tools/claude-inbox.sh
cd "$(dirname "$0")/.." || exit 1
log=.ai-bus/runtime/claude-inbox.log
total=0
for i in $(seq 1 25); do
  out=$(timeout 90 node .ai-bus/bin/worker-client.js read --root . --seat claude --all 2>&1)
  if echo "$out" | grep -q '"fatal"'; then echo "BUS ERROR: $out"; exit 2; fi
  n=$(echo "$out" | node -e '
const s = require("fs").readFileSync(0, "utf8");
let j; try { j = JSON.parse(s); } catch (e) { console.error("UNPARSED REPLY: " + s.slice(0, 2000)); console.log(0); process.exit(0); }
const r = j.result || {};
const ms = Array.isArray(r) ? r : (r.messages || []);
for (const m of ms) console.error("=== #" + m.seq + " " + m.from + " -> " + m.to + " | " + m.subject + "\n" + m.body + "\n");
console.log(ms.length);' 2> >(tee -a "$log" >&2))
  total=$((total + n))
  [ "$n" -gt 0 ] || break
done
[ "$total" -gt 0 ] || echo "no unread messages"
