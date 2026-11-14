#!/bin/sh
# Contract regression for the Eamon Showcase (plan section 6; Grok #3484/#3489). Run from this folder:
#   sh run-contracts.sh selfcheck <package.eamon> <out-dir>        all 20: contract-check at each first prompt
#   sh run-contracts.sh inject <probe-package.eamon> <out-dir>     every spec in inject-specs.json, positive and negative (ONLY=<index> runs one)
#   sh run-contracts.sh status <probe-package.eamon> <out-dir>     stats by injected state (mkstatus.py), positive and negative, cases in parallel
# Needs PARCHLOCK_SOURCE_ROOT (this repository). The probe package is a PARCHLOCK_PROBE build (never shipped); its digest
# must be added to js/EamonPackage.js TRUSTED for the run only, then removed. Each run uses a fresh browser profile.
set -u
MODE=$1; PKG=$2; OUT=$3; mkdir -p "$OUT"
HERE=$(pwd)
probe() {  # probe <profile> <port> <eval-file> <rules-file> <receipt>
  PARCHLOCK_HOST_PROFILE="$OUT/$1" PARCHLOCK_HOST_PORT=$2 PARCHLOCK_APP_PACE=300 PARCHLOCK_APP_IMPORT="$PKG" PARCHLOCK_APP_NOTOUR=1 \
  PARCHLOCK_APP_EVAL="$(cat "$3")" PARCHLOCK_HOST_TAIL=4 PARCHLOCK_HOST_WORK="$OUT" PARCHLOCK_HOST_SCRIPT="$HERE/$4" PARCHLOCK_HOST_RECEIPT="$OUT/$5" \
  timeout 900 node "$PARCHLOCK_SOURCE_ROOT/modules/eamon-showcase/host/run-app-probe.cjs" > "$OUT/$5.log" 2>&1
  grep '^EVAL' "$OUT/$5.log" | cut -c6-
}
port=8900
if [ "$MODE" = selfcheck ]; then
  for sel in ${SELS:-1 2 3 4 6 7 8 9 10 12 14 15 16 17 18 19 20 21 22 23}; do
    port=$((port + 1))
    probe "sc_$sel" $port seed-all-open.js hall-create-character.json "sc_seed_$sel.json" > /dev/null
    sed "s/SELECTIONS/[$sel]/" selfcheck.js.tmpl > "$OUT/selfcheck_$sel.js"
    echo "$sel $(probe "sc_$sel" $port "$OUT/selfcheck_$sel.js" no-rules.json "sc_$sel.json" | grep -o 'contract-check[^"]*' | head -1)"
  done
elif [ "$MODE" = status ]; then
  n=$(python mkstatus.py count)
  i=0
  while [ $i -lt "$n" ]; do
    ( for m in positive negative; do
        p=$((8950 + i * 2)); [ $m = negative ] && p=$((p + 1))
        python mkstatus.py $i $m "$OUT/status_${i}_$m.js" > /dev/null
        probe "st_${i}_$m" $p seed-all-open.js hall-create-character.json "st_seed_${i}_$m.json" > /dev/null
        probe "st_${i}_$m" $p "$OUT/status_${i}_$m.js" no-rules.json "st_${i}_$m.json" > "$OUT/st_${i}_$m.eval"
      done ) &
    i=$((i + 1))
  done
  wait
else
  n=$(python -c "import json;print(len(json.load(open('inject-specs.json'))))")
  i=0
  while [ $i -lt "$n" ]; do
    if [ -n "${ONLY:-}" ] && [ "$i" != "$ONLY" ]; then i=$((i + 1)); continue; fi
    for m in positive negative; do
      port=$((port + 1))
      python mkseed.py $i "$OUT/seed_$i.js"
      python mkinject.py $i $m "$OUT/inject_${i}_$m.js" > /dev/null
      probe "inj_${i}_$m" $port "$OUT/seed_$i.js" hall-create-character.json "inj_seed_${i}_$m.json" > /dev/null
      probe "inj_${i}_$m" $port "$OUT/inject_${i}_$m.js" no-rules.json "inj_${i}_$m.json"
    done
    i=$((i + 1))
  done
fi
