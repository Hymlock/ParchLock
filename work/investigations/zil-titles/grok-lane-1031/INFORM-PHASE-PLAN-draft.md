# INFORM PHASE PLAN: DRAFT (grok, 2026-10-31 14:00 ET). For Claude to review; Codex audits.

Inputs: GAMES_INCLUDED.md Index (80 rows), the 2026-10-17 release80 audit, AttributeSchema.bitFor (js/AttributeSchema.js:271-339), and ZRamReader.informAttributeNames (js/ZRamReader.js:281-398).
Inventory script: `inform-plan/inventory.cjs` (read-only; run it from the repo root). Its output is `inform-plan/inventory.json`, with the digest, z-version, release.serial, compiler string, D198 family, name-table result and facts keys for each title.

## 1. Inventory: 80 release games
| Class | n | Runtime attribute source today |
|---|---|---|
| Glulx (gblorb): Alabaster, AndromedaApocalypse, BlueLacuna, CounterfeitMonkey, RoversDayOut | 5 | Separate track (D38, parked; 0 rooms). Out of scope here. |
| Z, I6 name table, **exact stock order** (bits 0-30 = linklpa) | 46 | Declared names. Agrees with PROFILE. |
| Z, name table, **whole-block offset** (stock order shifted by +1..+8): HugeCave, Aug4, bookvol, building, degen, Savoir-Faire, Swineback, blues, yagwad | 9 | Declared names (the D193 path). PROFILE would be wrong, so names must stay authoritative. |
| Z, name table, **dialect/aliases**: Heliopause (I7, 6.31: no general/scored, remove_proper), temple (absent=female=8, ward_area 0, no male/neuter/pluralname), Vacation (clothing..enterable down by 1, absent=female=7, huge/weird 27/28) | 3 | Declared names. Partial maps, so a missing flag gives null (fail-closed omit). Aliases need checking. |
| Z, **no name table** (compiler 6.05/6.11 or pre-6 "...."): library, break-in, minster, Enemies, Gumshoe, heist, lists, godot, SoFar, spirit, lost, magic-toyshop, windhal1, sutwin, wedding, theatre, tube | 17 | **I6 PROFILE fallback** (confirmed-inform). None has an attributeMap fact. |

- All 75 Z titles classify as D198 confirmed-inform, and none is ZIL.
- I7-compiled Z titles: Accuse, ChildsPlay, Wallpaper, Figaro, gardening (all exact for bits 0-30, with I7 extras at 31+), plus Heliopause (dialect).
- Facts today: 19 release digests have ModuleStatFactsClaude entries, all of them command/status/rejectedForms. **None has an attributeMap.**

## 2. The risk this phase exists for
PROFILE is "a profile, not an ABI" (PRODUCTION_PLAN.md A3.3, line 1040). The 17 no-names titles get PROFILE blind.
- Precedent: phlegm (not a release title) is an Inform game with no name table whose library numbers container 3 (d64bad11, with raw PUT IN tests).
- The bitFor comment at AttributeSchema.js:297 names "phlegm/heist" for that pattern. heist is a release title, digest 251a02ac…, with no fact. **heist goes first.**
- Many of these no-names titles are early 1995-97 games built on library 5/x. That era's attribute order is close to stock but not guaranteed.

## 3. Ledger (same approach as ZIL)
- Rows: 75 Z titles. Columns: the same 38 keys as the ZIL ledger, plus `attrSource` = names-exact / names-shifted / names-dialect / profile-verified / profile-unverified / fact.
- Cell codes: the same as ZIL (F / C / L:NA / L:S / L:NC / L:UD / L:O / L:X). U and B mean open.
- Authority order, mirroring ZIL's "source first":
  1. the declared name table;
  2. the library source/version where it is public (IF Archive) for no-names titles;
  3. raw route-op attribute tests (zil-route-ops-raw.cjs style, as for phlegm);
  4. native replies.
  Never infer from object names or played verbs (ZRamReader.js:284).
- Fail-closed: if a no-names title's layout can't be proven, add an attributeMap fact with explicit nulls for the unproven flags (honoured at AttributeSchema.js:298). Never let PROFILE guess.
- Missing over wrong (D233 R2): don't remove a native working path.

## 4. Order of work
- **P1 Layout (highest risk first):**
  1. 17 no-names titles, starting with heist. For each title, run raw attribute tests on container/open/worn/supporter/animate/light/on from a known object at start. Compare against the PROFILE bits. A divergence gets a facts packet (Claude edits facts).
  2. 3 dialect titles. Check the aliases (absent/female) for absent/worn/visibility effects, and the I7 omissions in Heliopause.
  3. 9 offset titles. Spot-check one container and one worn per title to confirm that the declared path is live in the harness.
  4. 46 exact titles. Batch-confirm only; there is no layout risk.
- **P2 Ledger cells:** build the 75x38 ledger with the ZIL generator. Decide cells with the same packet + two-seat ACCEPT flow, in batches of about 10 titles.
- **P3 Known release80 issues** (attach to rows, not new work unless the operator says so): startup menus without a prompt (bookvol, chico); Pattern A parentless player (gostak, cabal, Tokyo2, bluechairs, rameses, saveprinceton, csbb, HugeCave, KoA, guess, yagwad); Pattern B (Heroine, LASH, windhal1).
- **P4 Browser touch verify** on a sample: one per attrSource class, plus every title with a new fact.

## 5. Harness and gate
- inform-layout harness: for each title, compare the declared/fact/PROFILE bit against the raw-test bit for 7 flags. It fails on any mismatch, and includes a control that flips one bit.
- Existing gates must stay green: identity-wear 100, light-forms 48, unresolved-player 9.

## 6. Open questions (for Claude; may need the operator)
- Q1: Are the Glulx 5 still parked (D38)? I assume yes.
- Q2: Same 38 keys, or drop ZIL-only keys (for example, D198 UD rows) for Inform?
- Q3: Do the Pattern A/B titles get ledger rows now, or after P1?
