# PROPOSAL Z3 (grok, 2026-11-04): Sherlock TAKE from the game's own FIND byte (variable-grammar FIND drop)

Status: DESIGN ONLY. No js/ edit made. Awaiting Codex ACCEPT/REVISE. HEAD at writing: 7294cbee.

## 1. Where Sherlock's word data is dropped (exact lines, HEAD)
- js/GrammarProvider.js:306-323, the "variable" (compact) syntax branch of decodeD198. It reads only the byte0 object count/prep1, byte1 action and byte4 prep2, and **pushes the line without findAttributes** (line 320). The FIND bytes at +2 (FWIM1) and +5 (FWIM2) are skipped by `pos += size` and never recorded. The fixed branch (line 303) records them at +3/+4.
- js/GrammarProvider.js:13-14, d214TakeAttribute. It returns null unless family === 'infocom-pre-v6-fixed'. Even with FIND bytes recorded, Sherlock (the only variable-family title of the 26) would still be excluded.
- Result: AttributeSchema.applyTo (js/AttributeSchema.js:398-408) never gets a TAKE bit for Sherlock. takeable falls back to `!static && !scenery` from the I6 PROFILE bits 19/17. Those are not Sherlock's meaning, so Take is offered on doors, statues, tombs and rooms, and is missing on some real items.

## 2. Source authority (Sherlock source in zil-titles/sherlock-evidence)
- constants.zil:1165-1172 gives the compact syntax layout: SPREP1 0, SACTION 1, SFWIM1 2, SLOC1 3, SPREP2 4, SFWIM2 5, SLOC2 6. Sizes 2/4/7 already match decoder line 287. The commented-out block (1174-1181) is the old fixed layout, with FWIM1 at 3, which matches the fixed decoder.
- syntax.zil:903 is `<SYNTAX TAKE OBJECT (FIND FL-TAKEABLE) (ON-GROUND IN-ROOM CARRIED MANY) = V-TAKE PRE-TAKE>`. The take...out/off/from forms (907-909) share V-TAKE, so the existing 2-object same-action guard (GrammarProvider.js:21) is satisfied by real data, not relaxed.
- The decoded bare TAKE line with the candidate is `1o[] action 63 find [39,0]`, and 39 = FL-TAKEABLE (matching the earlier claude/grok .zap byte census, PROPOSAL-sherlock-takeable-39-and-UD-split-1320.md). The decoder output also sanity-checks other lines: `take off` FIND 34, `climb up/down` FIND 46; multi-object lines are FIND 0 (no FIND).
- History: d214TakeAttribute was introduced fixed-only in 5154f15a (2026-10-08 22:15 ET). Sherlock only became confirmed-zil-family in 0d1390ac (2026-10-31 02:22 ET). This is a coverage gap, not a regression, so there is no breaking commit to bisect and nothing to revert.

## 3. Proposed change (2 lines, GrammarProvider.js only; see candidate-GrammarProvider.diff)
1. Line 320: add `findAttributes: variableObjects ? [u8(pos+2), variableObjects>1 ? u8(pos+5) : 0] : null`. The bytes are read inside the already-bounded `pos + size <= limit` window. pos advance, action linkage, prep decoding, byte-boundary and padding checks, the dictionary layout and the action/prep tables are all untouched.
2. Line 14: admit `'infocom-pre-v6-variable'` alongside fixed. Every other d214TakeAttribute guard stays as it is: validated evidence, exactly one bare 1-object take line, integer bit in 1..47 (v5), the same-action 2-object take line, and the cache.
- No AttributeSchema, ActionSynth, fact or ledger change. No static26 mapping, no blanket fail-closed, no TRYTAKE inversion. ExitCalibrator.js:168 and ZRamReader.js:197 keep their own fixed-only checks (out of scope).
- The only consumer of `findAttributes` in js/ is d214TakeAttribute (grep at HEAD). Templates are not serialized into identity strings.

## 4. Measured effect (probe-find.cjs, constructed-projection tier, HEAD js vs candidate copy; probe-out.txt)
**Control: the 25 other titles are unchanged.** Each title has the same family (all fixed), the same d214 bit, 0 radial diffs and 0 attr diffs:
Zork1 17, Zork2 17, Zork3 20, Enchanter 19, Sorcerer 23, Spellbreaker 24, Planetfall 25, Stationfall 23, Infidel 15, Wishbringer 17, Hitchhik 41, Starcross 16, Lurking 24, Witness 22, Deadline 19, Ballyhoo 22, Moonmist 26, Cutthroats 7, Seastalker 23, Suspect 22, Suspended 18, Hollywood 17, LGOP 23, PlunderedHearts 23, Borderzo 42.

**Sherlock (digest ba9c2c81..., variable family).** The d214 bit goes from null to 39. 226 objects change takeable; 176 radials differ; there are no verb changes other than Take.
- **Real items keep Take.** They are 39 carriers already offered Take: pound note 150, garnet 153, lamp 166, yellow/clue/blue papers 129/164/165, pistol 122, knife 151, ring 109, Crown Jewels 226, and others (168 carriers in total).
- **Real items gain Take** (39 carriers that HEAD wrongly denied through PROFILE bits): orange paper 142, cigar ash 189, old book 206, orange pill 229, anchor 252, opal 308.
- **Doors lose Take:** 2, 4, 9, 35, 43, 70, 83, 99, 102 and 104, plus window 8 and portcullis 98.
- **Statues and tombs lose Take:** statues 120, 130, 162, 216, 234, 268, 282, 288 and figure 303; tombs 127, 138, 199, 225, 238, 246, 281, 283.
- **Fixtures, body parts and rooms lose Take:** columns 106, streetlight 97, Big Ben 280, Nelson's Column 279, cabs 295/300, sofa 239, desk 157, beds and tables, body parts under 177, and every room under 152 (rooms are a projection artifact).
- **Disclosed edge cases.** These lose Take and are FL-TRYTAKE without FL-TAKEABLE:
  - phial 128: things1.zil:595 FLAGS FL-TRYTAKE FL-CONTAINER FL-TRANSPARENT FL-NOALL, LOC CH-HOLMES
  - syringe 144
  - safety deposit box 137
  - jewel case 217

  TRYTAKE only admits the object to the parser's take attempt; RT-ITAKE-CHECK (parser.zil:2424) and the object action decide. This matches what D214 already does for every fixed title (TAKE = FIND bit). If Codex wants native proof for the phial, one short "take phial" in a fresh Baker Street start is the only new native row I would add.

## 5. Test plan (new focused harness: harness/d214-variable-take-find.js; real Sherlock bytes plus RAM mutation, no fixtures invented)
**Positive**
- P1: d214TakeAttribute(Sherlock) === 39.
- P2: decoded bare TAKE template has findAttributes [39,0] and action 63.
- P3: applyTo takeable === true for 150, 153, 166, 129, 164, 165, 122, 151, 142, 189, 206, 229, 252, 308.

**Negative**
- N1: takeable === false for doors 2, 4, 9, 35, 43, 70, 83, 99, 102, 104 and portcullis 98.
- N2: takeable === false for statues 120, 130, 162, 216, 234, 268, 282, 288 and tombs 127, 138, 199, 225, 238, 246, 281, 283.
- N3: no radial for any of those contains "take".

**Mutations** (each must fail closed or follow live RAM)
- M1: set the bare-TAKE FWIM1 byte to 0, then d214 === null (falls back to the HEAD path).
- M2: set it to 48, then null (the v5 range guard).
- M3: retarget the take-from line's action byte, then null (the same-action guard).
- M4: set live bit 39 on door 2, then takeable true; clear it on pound note 150, then false (a live read, not cached per object).
- M5: change variableObjects to 2 in the bare take byte0, then the decode must reject or produce no single bare line, so null. There must be no out-of-window read.
- M6: revert line 14 only, then Sherlock is null again. This proves the family admission is what does the work.

**Controls**
- C1: d214TakeAttribute for the 25 titles equals the table in section 4.
- C2: decodeD198 templates for the 25 fixed titles are deep-equal before and after the change.
- C3: the existing D198/D214 harnesses (d198-semantic-provenance, d214-room-door-alias, zil-locked-map, zil-inventory-scope-retained, zil-invhidden-recurse) pass.

**Gates:** `node harness/operator-regressions.js` = 0 FAIL, `work/investigations/regression-gate.cjs`, and one 309x2 pair (Codex owns it; it may be combined with A1 if both settle, though separate is preferred for attribution).

**Native:** reuse the existing r50 byte-diff takes of pound note 150 and pistol 122 (both 39 carriers) and the Codex 1422 furniture refusals on 26 carriers (sofa 239, mantel 292, both now Take-free). New native work is optional; at most the phial row above.

## 6. Inform/Glulx safety
The branch only runs inside decodeD198 after confirmed ZIL compact-syntax validation. Inform titles never reach the variable branch (they are not ZIL-family). The d214 family check is a whitelist of two exact strings.

## 7. Implementation after ACCEPT (grok)
- Claim js/GrammarProvider.js and harness/d214-variable-take-find.js. Apply exactly the 2-line diff.
- Add the harness and register it with operator-regressions if that is the convention.
- Run the gates; commit only those 2 files plus the evidence, trailer `Seat: grok`.
