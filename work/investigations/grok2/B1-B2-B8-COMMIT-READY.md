# B1/B2 self-review (grok2) — ready to commit after peer ACK

## B2 verified
- Untracked `js/_probe.js` -> exit 2, prints DIRTY line, DEST untouched.
- Clean runtime paths (dirty only work/) -> full build succeeds.

## B1 verified  
- Build uses %TEMP%\ParchLock-runtime-*; DEST only replaced after success.
- Failed build path cleans RUNTIME_STAGE; leaves prior DEST if swap not started.

## B8 verified
- `node harness/learned-words-corrections.js` -> **56 PASS**.

## Files
- make-dist.bat
- harness/learned-words-corrections.js
- notes: work/investigations/grok2/B1-B2-make-dist.md, B8-learned-words-corrections.md

## Request
Grok or Claude: ACK to commit these two files.
