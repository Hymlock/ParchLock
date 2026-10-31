# Audit of 04cc1d32 (claude seat, 2026-10-31) - LGOP revealed Cell hole

Verdict: **ACCEPT** (one non-blocking note, N1). Clean worktree ../wt-claude-lgop detached at d4e89ea7 (contains 04cc1d32, no stash applied).
Design reference: work/investigations/lgop-hole/proposal-r1.md R2+R3; codex r2-review-1152 / r3-vote-1207.

## Harness (work/investigations/lgop-hole/audit/lgop-revealed-hole.audit.js)
Copied from the earlier claude parallel worker, run against plural `ZRamReader.revealedLocalGlobalObjects` (real story bytes,
RAM edits as X-tier consumer controls). Result: 48 PASS / 1 FAIL (harness-run.txt).

| R3 check | 04cc1d32 |
|---|---|
| descriptor exact R3 values, frontier 228, validated ZIL family | matches |
| real bytes: Cell50 prop15 lists 83; 83 prop16 size 2 raw 59426; boot slot144=0 | matches |
| hidden (slot144=0): not admitted, no menu | matches |
| revealed: admitted, name "black circle", parentId 40 kept, scopeRoomId 50, physical parent unchanged, Examine only, inventory context none | matches |
| wrong room (player elsewhere / caller room mismatch) | matches |
| membership byte removed / parent changed | matches |
| raw word 59427 before decode | matches (rejected before decode) |
| decoded value mismatch | matches |
| digest / stable-header drift / unvalidated family | matches |
| malformed descriptors (35 cases) | 34 match; **N1** below |
| hidden vs revealed: rest of Cell scope byte-identical | matches |
| tap currency (gate, player room, parent, generation, noun, digest, command/verb drift, sharedMembers) | matches |
| other titles: fact on LGOP digest only; reader returns nothing for every room of 228 other titles | matches |

Harness corrections (not product deltas): (a) after stubbing GrammarProvider.decodeD198 the harness must reset
AttributeSchema._famCache (keyed buffer+identity) or the stub result poisons later checks; (b) the old expectation that
noun "black circle" yields no Examine was wrong: natively the game accepts it (below), so it now expects `examine black circle`.

**N1 (non-blocking):** a descriptor with an extra unknown key (`{...R3, extra:1}`) is still admitted. Validation checks each
R3 field's type/range but not the exact key set. R3 says "malformed => absent"; a superset is arguably well-formed. The
fact is a hard-coded constant in ModuleStatFactsClaude.js, so no runtime path produces it. Optional hardening: compare
Object.keys(d).sort() to the 9 R3 keys.

## Native: does the game accept the app's noun? (open question)
App command: `ActionSynth.revealedLocalGlobalCommand` emits `"examine " + Actionable.referenceFor(obj).noun`; in codex's
seeded native menu run (oct30-recovery/lgop-implementation.run.json) the radial was `["Examine","More"]`, command
**`examine circle`**; the mark noun is "black circle".
Native at the revealed Cell (codex config lgop-hole-reveal.config.json, seed 0, route 170 steps, reached room 50,
rawParent 83 = 40; probe oct30-recovery/lgop-hole-probe.cjs; run audit/lgop-noun-native.run.json):

| command | reply |
|---|---|
| examine circle | "It's like staring into an eternal void of blackest infinity..." |
| examine hole | same |
| examine black circle | same |
| examine black hole | same |

All four accepted with the hole description; each test_attr trace touches only #83. **No defect**: the app's noun is accepted.
(Probe ran from root cwd for playwright; root js/ has unrelated uncommitted AttributeSchema.js edits, which cannot affect
game replies.)

## sha256 manifest
- 885c0e44f20feb16d734b9e9fd2025082f46023d5d0372f25da85c8ba491a059  work/investigations/lgop-hole/proposal-r1.md
- d113dc9bfff546a7935b740c541b6a64c3b7d945fed0599ff509c57907197bd7  work/investigations/lgop-hole/audit/lgop-revealed-hole.audit.js
- 93b277569acbf3bc88f71a4eff97a29edbdbbc13dbe8e8c5eaeb7feb0de1aec9  work/investigations/lgop-hole/audit/harness-run.txt
- 6ef50f395157dc1fbffd4b01fdb9a97d55aac262a949dd988dea3c6e354c3c2d  work/investigations/lgop-hole/audit/lgop-noun-native.config.json
- a7c8dc0715c670f94153a04172635b01b2b0717774a1b17e42fa07750ba02d4f  work/investigations/lgop-hole/audit/lgop-noun-native.run.json
- 9c721f893cd5b6ca706efdb183e4d4b5eee1315941a78d63be4cca010e2747bb  work/mapping-research/items-codex/resume-20261020/oct30-recovery/lgop-hole-reveal.config.json
- 957ad2584d7c8399f97b476b328fcb48416476affb99e750b1473879587fcb36  work/mapping-research/items-codex/resume-20261020/oct30-recovery/lgop-hole-probe.cjs
- bc8a32f473a13b7fb3fa9dffd9f3e1d9e48cb8adfdc34fab56a168399f0e54ad  work/investigations/zil-titles/lightsource-native/probe.cjs
- c618a39313b45bee8fbf002f4c8e8434328b16c9a7bf150202235c01f5c688f3  work/mapping-research/items-codex/resume-20261020/oct30-recovery/lgop-implementation.run.json
- da89f11f5c0e7fb4c9200e7f4c8e7caa2989f63aeb016fb4a3523769add1a260  wt@d4e89ea7/js/ZRamReader.js
- 7c87df090cb016a67462e04444b1d8890c60411b801873a9ffbabe812ac8904d  wt@d4e89ea7/js/ActionSynth.js
- 39b802f70083bffa6235d475b34f9948140c62e34623c5a2aaaf038edb87505f  wt@d4e89ea7/js/Actionable.js
- db21fb39122af713211340f9bd87af14c1d0f5275fc56d03d34bb65da03f4587  wt@d4e89ea7/js/SemanticActions.js
- 188ed8a4067c5f196a836ec860d3b842f46f631c4d041328d8c7425dcfd5cc0d  wt@d4e89ea7/js/ModuleStatFactsClaude.js
- 5a0bd659782f91639c54ab1034390af315eba596fc9c7eab0163a03556c14a8c  wt@d4e89ea7/games/LeatherGoddessesofPhobos.z3.js
