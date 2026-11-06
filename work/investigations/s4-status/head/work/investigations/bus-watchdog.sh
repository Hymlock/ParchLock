#!/usr/bin/env bash
# Claude seat watchdog (operator: prevent bus stalls).
# Exits (waking the claude seat) when EITHER:
#   - a new message from codex or grok arrives, printing "MAIL <header>";
#   - grok has been silent for STALL_SECS since claude's last message to grok,
#     printing "STALL grok"; claude then re-pings grok and re-arms this script.
# Usage: bash work/investigations/bus-watchdog.sh [STALL_SECS=600] [MAX_SECS=14400]
cd "$(dirname "$0")/../.." || exit 1
T=${WATCHDOG_TRANSCRIPT:-.ai-bus/runtime/mailbox/transcript.md}
STALL_SECS=${1:-600}; MAX_SECS=${2:-14400}
base=$(grep -c '^## [0-9]*\. \(codex\|grok\) ->' "$T")
start=$(date +%s)
while :; do
  n=$(grep -c '^## [0-9]*\. \(codex\|grok\) ->' "$T")
  if [ "$n" -gt "$base" ]; then echo "MAIL $(grep '^## [0-9]*\. \(codex\|grok\) ->' "$T" | tail -1)"; exit 0; fi
  # Seconds since claude's last message to grok, if grok has not answered since.
  lastToGrok=$(grep -n '^## [0-9]*\. claude -> grok' "$T" | tail -1 | cut -d: -f1)
  lastFromGrok=$(grep -n '^## [0-9]*\. grok -> claude' "$T" | tail -1 | cut -d: -f1)
  if [ -n "$lastToGrok" ] && [ "${lastFromGrok:-0}" -lt "$lastToGrok" ]; then
    ts=$(sed -n "$lastToGrok,$((lastToGrok+5))p" "$T" | grep -o '20[0-9-]*T[0-9:.]*Z' | head -1)
    if [ -n "$ts" ]; then
      age=$(( $(date +%s) - $(date -d "$ts" +%s) ))
      if [ "$age" -gt "$STALL_SECS" ]; then echo "STALL grok silent ${age}s since claude's last message"; exit 0; fi
    fi
  fi
  [ $(( $(date +%s) - start )) -gt "$MAX_SECS" ] && { echo timeout; exit 0; }
  sleep 30
done
