# LGOP hole — prerequisite measurements (claude, 2026-10-31)

Read-only. No js/ edits. Source: historicalsource/leathergoddesses @17cbbc1 (compiled ZAP: x1dat.zap). Native: `G1SEED=0 G1ROUTES=work/investigations/lgop-hole/evidence/routes.json node work/investigations/grok1/batch/g1-batch.cjs eval lgop N "$(cat prereq/ev-globals.js)"`, N=169/170/171, current checkout, seeded JSEED tier 0 (disclosed; same 172-step route as the sealed half; three fresh runs).

## (1) SDESC property = 16
- Compiled: x1dat.zap `P?SDESC=16`; every SDESC object table emits `.PROP 2,P?SDESC ; STRING PROPERTY` (word = packed string addr). `P?GLOBAL=15` (matches Cell 50 prop 15 = [202,83,173]).
- Live obj 83 prop 16 = [232,34] = 0xE822, packed x2 -> decodes "black circle" in all three runs. Other props decoded as strings are garbage (18 "some ugemi", 17 "c b jxonly c"), 31 is size 4 — so not string properties.
- Corroboration (eval-170.json prop16AllObjects): 27 objects carry a size-2 prop 16; 22 empty-shortname objects decode to their source SDESCs (sheet 156, ground 168, man 79, Trent 48, Trent's body 15, his sword 11, Thorbast 90, Sultan 91, photo of Jean Harlow 53, rule book 131, brass loincloth 134, young woman 214, ...). Caveats: rooms 188/191/194/198 also have prop 16 decoding to prose (named objects, not SDESC consumers here); obj 238 decodes to garbage -> a consumer must require empty shortName + valid-string domain, not blindly decode prop 16. SDESC is mutable (PUTP: SHEET, GROUND, MAN-WOMAN, sidekick gender set) -> read live, never cache.

## (2) HOLE-OPEN = global variable 160 (0xA0); global table base 8327 (header 0x0C)
GLOBAL table order in x1dat.zap (HERE = var 16, verified live G16 == player parent).
| run | step | here | G160 HOLE-OPEN | text |
|---|---|---|---|---|
| eval-169 | after `stand on circle` | 199 (cramped space, dark) | 0 | hidden: no collapse yet |
| eval-170 | after `wait` | 50 Cell | 1 | "part of the floor collapses ... you notice a black circle" |
| eval-171 | after `look` | 50 Cell | 1 | "A black circle is lying on the ground" |
Gap: the route never stands in Cell with HOLE-OPEN=0 (player arrives via the collapse itself). Hidden-Cell=0 rests on source (`<GLOBAL HOLE-OPEN <>>`, only `<SETG HOLE-OPEN T>` in I-CRAMPED-SPACE phobos.zil 643) plus the pre-collapse 0 measured here; codex's lgop-hole-hidden-native.md covers a hidden-Cell rejection run.

## Other HOLE-INVISIBLE conditions (globals.zil 1314-1321)
HOLE-INVISIBLE true (hole not in scope) when:
- HERE = GARDEN and SOD (obj 183) lacks MUNGBIT (attr 12, x1dat `MUNGBIT=12`). Live: 183 MUNGBIT=false (unmoved) all runs.
- HERE = CELL and not HOLE-OPEN (G160).
- HERE = LONG-CORRIDOR and LONG-CORRIDOR-LOC (global var 144, init 1) != 3. Live: G144 = 1.
Everywhere else the local global is visible when listed in the room's GLOBAL (prop 15). HERE = var 16.

Files: prereq/ev-globals.js, prereq/eval-169.json, eval-170.json, eval-171.json, prereq/x1dat-excerpts.txt, prereq/MANIFEST.sha256.
