# Inform P1 step 3: shifted-block name-table titles (claude, 2026-10-31)

Method: `claude-p1/radial.cjs <game> "i"` (evidence in `radial-<game>.txt` here) dumps the live `AttributeSchema.bitFor` and radial commands.
Declared and PROFILE bits come from `inventory.json` mismatch lists. PROFILE values: animate 0, clothing 2, container 4, open 14, openable 15, worn 26.
Raw VM check (blues, `open knapsack`): the VM tests `8:23=1` (openable) and `8:22=0` (open), which are the declared bits. PROFILE's 15/14 are not tested.

| Title | Offset | Declared bits (container/clothing/open/openable/worn) | App bitFor | Radial evidence | Verdict |
|---|---|---|---|---|---|
| HugeCave | +6 | 10/8/20/21/32 | same | Knapsack (worn container): open/search/empty/remove | OK (parentless player is a separate known issue) |
| Aug4 | +5 | 9/7/19/20/31 | same | Start pool has only scenery and a takeable root; "Jim and Rob" animate gives talk to | OK on bits; container/clothing radial UNREACHED cheaply |
| bookvol | +6 | 10/8/20/21/32 | same | Startup menu blocks the line input | OK on bits; radial UNREACHED (menu) |
| building | +1 | 5/3/15/16/27 | same | Ground (enterable supporter): enter/exit/search | OK on bits; container/clothing UNREACHED cheaply |
| degen | +1 | 5/3/15/16/27 | same | Holy symbol and chain-mail (worn): remove; Baron's eyes (openable): open/close | OK |
| Savoir-Faire | +3 | 7/5/17/18/29 | same | Ditch, pipe and well (open containers): search/empty/close; door: open/close | OK |
| Swineback | +2 | 6/4/16/17/28 | same | Leather breastplate (worn): remove | OK |
| blues | +8 | 12/10/22/23/34 | same | Knapsack (clothing container, carried): open/search/empty/wear/put in; raw op confirms 22/23 | OK |
| yagwad | +5 | 9/7/19/20/31 | same | Start pool is only objects/machine (parentless player) | OK on bits; radial UNREACHED (Pattern A) |

Conclusion: in all 9 titles the declared (D193) name-table path is live, and none uses a PROFILE bit. There are no WRONG rows, so no fix is proposed.
The 4 partial rows were not reached because of start position, a menu or Pattern A, not because of the attribute map.
