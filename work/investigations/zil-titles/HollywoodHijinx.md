# HollywoodHijinx.z3.js — ZIL title work (grok2)

## October20 current audited state (Codex operator-authorized takeover)

Overrides the historical uncertainties below: wearable22 independently ACCEPTED from original native ring127/skis188 WEAR tests22 TRUE and held flashlight123 FALSE with refusal. Worn14 independently ACCEPTED from both actual wear/remove sequences and flashlight negative; existing Grok4120 proposal integrated as wornAttribute14, distinct from capability22. Native Equipment skis: worn=true and Remove offered after wear; worn=false after remove. Operator13/0, affected-title/InformZ/Glulx gate0diff. No whole-title or other-key closure.

The old walkthrough omitted entry preconditions: TURN STATUE WEST, EAST, NORTH unlocks the oak door. That native correction reaches the ring puzzle; opening the closet door then permits a short original-scene skis route. Prior skis failures were not proven to be RNG desync. Bounded244-object census (first772, first property2968) has no room owner for14/22. Full independent audit/raw/helpers: work/mapping-research/items-codex/resume-20261020/hollywood-wear-audit.md and sibling files. Historical failed attempts below remain as provenance and are not counted as evidence.

**Assignment:** R3 #4266 top-9  
**Source flags key:** `HollywoodHijinx.z3.js`  
**D198:** confirmed-zil-family  

## Not-F work list (21)

| key | st | source hint | next |
|-----|-----|-------------|------|
| wearable | C→**REVISE** | key OK (WEARBIT=capability); evidence was **X-only insert_obj** (#4295) — need original-scene natives | |
| container | O | CONTBIT 4 (near-exact 24/25) | native put-in / open contents |
| open | U | OPENBIT 25 near-exact | open/close transitions |
| supporter | X | SURFACEBIT 27 exact | upgrade X→O/F with original-scene natives |
| lightSource | U | LIGHTBIT **3** exact (computer, projectors) | TURN ON lamp-class natives |
| on | U | ONBIT 20 exact (many rooms lit?) | careful: rooms vs devices |
| worn | U | WEARBIT **22** exact (toupee, mask, ring) | native wear/remove attr-diff |
| animate | U | ACTORBIT 18 exact (Hildegarde, Herman) | |
| edible | U | no FOODBIT in dump | FEATURE-ABSENT + dynamic FSET grep |
| takeable | S | TAKEBIT 17 exact | D214 path |
| playerRoot | S | settled | confirm |
| status | Os | partial SCORE | complete fields |
| rooms | O | LOOK=RAM | walk record |
| underlineVsDict | X | experimental | |
| descriptors | X | | |
| identical | UD | closed FEATURE-ABSENT style | spot-audit |
| wornItems | X | | |
| actors, onoff, consumed, nested | U | | |

## Existing facts to audit

See `js/ModuleStatFactsClaude.js` ~355 Hollywood Hijinx WEARBIT 22 note.

## Boot probe 2026-10-20

File: `_hh-boot.json`

| field | value |
|-------|--------|
| player | 52 yourself parent 2 South Junction |
| inv | flashlight 123, photo 67, letter 235 — none wearable/worn at boot |
| map room | South Junction |

Wearables (toupee/mask/ring) not in starting inventory — need walk to obtain before worn native proof. Fact `wearable:22` is WEARBIT per comment — **likely wrong PROFILE key** (should be wornAttribute 22 or wearable separate). Flag for audit.

## Original-scene wear attempt 2026-10-20

`zil-walkdiff.cjs HollywoodHijinx.z3.js hollywood 320 317,319` (seed Math.random stub=1):
- STEP 317 WEAR SKIS → "You can't see any skis here!" (walk desync before GET SKIS 165)
- STEP 319 REMOVE SKIS → same

Matches claude #4295 note (replay desyncs before step 26). **BLOCKED** on walkthrough seed/parity until Jericho/Frotz seed matched or short hand-route to skis/ring/toupee found.

## Next
1. Resolve walk seed OR hand-route to GET RING / TAKE TOUPEE / GET SKIS / GET MASK then WEAR + refusal
2. lightSource bit 3 natives on projector/computer (may be easier original-scene)
3. worn cell bit 14 (WORNBIT) separate from wearable 22

## Independent animate18 native audit
Hollywood Hijinx animate18 independently accepted from Grok4112: recovered and fresh original route410 SEARCH Herman163/Aunt126 tests18 TRUE with person replies, buzzsaw152 FALSE with actual search reply; earlier out-of-scope failures excluded. Passive recorder inspected; no forced relocation/attribute writes. Independently bounded244objects has only two NPCs, two yourself aliases and global69 as bit18 owners, no rooms. Current decoded actor attrs agree; no talkable inference, new container or Open/Close rule. Operator13/0 and complete3engine3row parity0diff. Exact semantic delta1field; native wheel commands recorded as observed, not whole-title/actor-consumer completion. Evidence: work/mapping-research/items-codex/resume-20261020/hollywood-animate/.
