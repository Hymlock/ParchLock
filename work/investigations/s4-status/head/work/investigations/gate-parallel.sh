#!/usr/bin/env bash
# Parallel regression gate (bottleneck fix 2026-10-17). Runs regression-gate.cjs in N shards at once, merges, validates
# (one valid JSON row per game; corrupt or duplicate rows dropped), and reruns any missing game serially.
#   OUT=cand.jsonl [N=8] [ROOT=.] [GLULX=1] [GAMES=a,b] bash work/investigations/gate-parallel.sh
#   then: node work/investigations/regression-gate.cjs --diff base.jsonl cand.jsonl
set -u
N="${N:-8}"; OUT="${OUT:?OUT required}"; pids=()
for ((i = 0; i < N; i++)); do
  SHARD="$i/$N" OUT="$OUT.s$i" node work/investigations/regression-gate.cjs >/dev/null 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
cat "$OUT".s* > "$OUT.raw" && rm -f "$OUT".s*
missing=$(node -e '
const fs = require("fs"), raw = fs.readFileSync(process.argv[1], "utf8").split("\n"), seen = {}, rows = [];
for (const l of raw) { try { const j = JSON.parse(l); if (j && j.game && !seen[j.game]) { seen[j.game] = 1; rows.push(l); } } catch (e) {} }
fs.writeFileSync(process.argv[2], rows.join("\n") + "\n");
const all = fs.readdirSync("games").filter(f => f.endsWith(".js") && (process.env.GLULX || !/\.(ulx|gblorb)\.js$/i.test(f)))
  .filter(f => !process.env.GAMES || process.env.GAMES.split(",").includes(f));
console.log(all.filter(g => !seen[g]).join(","));' "$OUT.raw" "$OUT")
rm -f "$OUT.raw"
if [ -n "$missing" ]; then
  echo "gate-parallel: rerunning missing serially: $missing"
  GAMES="$missing" OUT="$OUT.miss" node work/investigations/regression-gate.cjs >/dev/null 2>&1
  cat "$OUT.miss" >> "$OUT"; rm -f "$OUT.miss"
fi
echo "gate-parallel: $(grep -c . "$OUT") rows -> $OUT"
