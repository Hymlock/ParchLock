#!/usr/bin/env bash
# Parallel regression gate (bottleneck fix 2026-10-17). Runs regression-gate.cjs in N shards at once and merges.
#   OUT=cand.jsonl [N=8] [ROOT=.] [GLULX=1] [GAMES=a,b] bash work/investigations/gate-parallel.sh
#   then: node work/investigations/regression-gate.cjs --diff base.jsonl cand.jsonl
set -u
N="${N:-8}"; OUT="${OUT:?OUT required}"; pids=()
for ((i = 0; i < N; i++)); do
  SHARD="$i/$N" OUT="$OUT.s$i" node work/investigations/regression-gate.cjs >/dev/null 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait "$p"; done
cat "$OUT".s* > "$OUT" && rm -f "$OUT".s*
echo "gate-parallel: $(wc -l < "$OUT") rows -> $OUT"
