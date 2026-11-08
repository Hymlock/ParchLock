# D285 independent return audit — Codex, 2026-11-07

**Verdict: ACCEPT the current D285 implementation and its focused Advent regression. No D285 runtime blocker found for Build 85 / 2.0.1 signing.** This is a non-author code review, not an efficiency audit or an APK/signature review. Root retains packaging/signing responsibility.

Reviewed commit `fd1b3310` and current checkout `4039ee00`. The two reviewed files have no subsequent source changes. An independent review file did not already exist when this audit started. No runtime files were edited.

## Exact source binding

| File | SHA256 of current bytes |
|---|---|
| `js/AttrCalibrator.js` | `de700fd4678ccc9c097b4a8e81a71e41cf2b02d5a4c79686d6feac8c6f4d402c` |
| `harness/carried-container-root.js` | `2e4db9a29fffd0523cfeb4f9c768eacfde474709ba854d28baf836a739d1d7f2` |
| `work/investigations/carried-container/INVESTIGATION-claude.md` | `2ea582bdadbaf8279255818154aca9ceb3c13ab80de6369bf8291799ee57480b` |

The implementation adds the carried-holder rejection both before the successful-Take learner records an insertion destination and when a previously learned root is consumed. It follows physical parents to the resolved player or an existing learned root, with a bounded traversal and cycle guard. The actual player/holder itself remains eligible. It does not change object attributes, move objects, or infer capability from inventory prose. Existing room/world checks remain in force. `ZRamProvider.resolveInventoryRootId` can therefore fall back to the real player after a carried-container root is rejected.

## Independent checks

- Ran `node harness/carried-container-root.js`: **10 PASS / 0 FAIL** on the current files. The fresh browser follows ordinary Advent commands through TAKE BIRD and INVENTORY; no VM state writes. Native inventory includes the cage and bird; payload player remains20; cage58 is carried rather than learned/confirmed as player. All five named inventory checks pass. Equipment has eight rows: Yourself, lantern, keys, bottle, bottled water, food, cage, bird.
- Eight additional bounded constructed controls pass: direct carried holder, nested carried holder, actual player eligibility, alternate in-room holder eligibility, nesting under the known root while the player probe is unresolved, suppression of a persisted carried root, rejection of a successful nested-Take insertion, and replacement of a prior bad root by a subsequent successful insertion into the actual player. The two learner controls explicitly change the observed object's parent from room40 to the insertion destination and verify success=true.
- An initial learner-control attempt used a frozen parent stub and therefore did not model an actual successful transition; its expectation failed. That fixture was corrected before either learner control was counted. This was not a reproduced product failure.

### Persisted-root wording

`confirmedInventoryRootId` **returns null** for a stale carried-container value; it does not erase the stored `table.inventoryRootId`. Verified that the stale value58 remains stored but is not returned, and that the next successful actual-player Take replaces it with20. The investigation/plan wording saying it “clears” a stale learned value should be read or corrected to “ignores/rejects.” No migration or additional runtime repair is needed for the demonstrated failure.

## Retained gate audit and limits

Read the existing raw files in:

`C:/Users/hymlo/AppData/Local/Temp/claude/7305ef1578f6f2f9/aff5db1d-28f7-4d83-89a7-bee59c2081ee/scratchpad/`

| Pair | Rows per side | SHA256 (same on both sides) |
|---|---:|---|
| `crb.jsonl` / `crc.jsonl` | 91 | `24530a1896e3f27f615dc2b4f7c89a273bbc3bdafe2db2839da7d4a2330010b2` |
| `crt-b.jsonl` / `crt-c.jsonl` | 8 | `bd5aba0ecb3e3f7102342f0e65f6ae4c01dfe2632e2d7ed565f61f7e90516b11` |

Both pairs are byte-identical. Independently compared the six gate fields (`rooms`, `exits`, `marks`, `inv1`, `inv2`, `error`): zero differences. The union is **99 distinct games**, with no overlap between the91 and8. BeingSteve has paired `no-prompt` errors and remains a coverage gap; these are not99 functional passes.

Retained `cr-base` / `cr-cand` source copies differ semantically in only `js/AttrCalibrator.js`. Base matches `fd1b3310^` after CRLF normalization; candidate AttrCalibrator matches current bytes exactly. Their AttrCalibrator hashes are respectively `14db4bb7873da64a7f422a2b0e21c40dae52f6be7c399a1634ac4633d222db83` and `de700fd4678ccc9c097b4a8e81a71e41cf2b02d5a4c79686d6feac8c6f4d402c`.

Current62 JS files versus the retained candidate:31 exact byte matches,30 CRLF-only differences, and one declared Build metadata change in `Consts.js` (`BUILD=84` to `BUILD=85`, commit4039ee00). No other semantic JS drift found. This is a present-time retained-copy binding; no independent pre/post-run manifest was supplied, so this review does not invent execution-time immutability certification.

The investigation reports11 related suites passing; their raw logs were not found or independently audited here. The independent live regression and constructed checks above are directly observed. The operator's November7 waiver of the remaining full309 run is explicit in the release handoff; this review does not reinstate that run or claim the missing coverage passed. No catalog, operator, or eleven-suite rerun was requested by this reviewer.

The evidence folder's investigation references `GATE.md`, but that file was absent during review; the actual retained raw locations and their qualified results are recorded above instead. This documentation gap does not alter the independently verified zero differences or the operator waiver.
