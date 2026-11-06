# Underlining, Yourself menu: combined proposal (claude, after both seals)

Inputs:
- `2026-10-09-claude-underline-blind.md` (claude, sealed);
- `2026-10-08-codex-underlining-blind.md` (codex, sealed);
- codex corrections #1918 and #1920, all accepted below.

## Agreed facts

1. **Lifetime fault (both, measured).** `Actionable.Refresh` stales EVERY mark
   on each signature change, then rebuilds marks only in `RoomLines` + `latest`.
   Intermediate replies lose their marks (the HHG GET ALL -> EXAMINE CARPET
   screenshot). The same behaviour exists on Oct 4, Oct 1 and the first commit
   (Sep 25, Zork I), so it is not a lag-fix or transcript regression, and the
   cache on/off results are identical. The operator's intended model is
   per-word tracking: a mark stays until its word appears again in newer text,
   then moves there.
2. **Truncated vocabulary (both).** `promoteUnnamed` rejects aliases at the
   dictionary width and demands exact word boundaries. Treasures'
   `flashligh`/`absorbent`/`robodroid` (9 characters) and the punctuated
   `space-ra` never match their printed words. The native dictionary keys ARE
   equal (codex measured `flashlight`=`flashligh`, `space-rag`=`space-ra`).
3. **Reply observation gap (codex).** The promotion and descriptor pool reads
   lastLookText, lastInventoryText and RoomLines only, never ordinary replies
   (EXAMINE POST banners, GET ALL listings).
4. **Pronoun and possessive marks (both).** HHG objects 14 and 202 have the
   compiled short name `it`. Object 14 also carries real washbasin
   vocabulary, so it is NOT junk. Names like `your gown` make `your` a
   trigger. Every "It"/"it"/"your" in the prose is marked.
5. **Yourself (both).** No regression is demonstrated: the current gates are
   looser than the original D205. The pool is 11 curated RPG verbs plus
   ActionSynth, both gated by the dictionary. In Treasures that leaves
   examine/use/drop. The real dictionary verbs light/turn/hold/hit/attack are
   never considered.
6. **ActionSynth invented verbs (claude).** Treasures' dictionary lacks
   `give` and `put`, yet the full item radial offers "give X to" and
   "put X in" (a D24/D147 violation).

## Not in this change (evidence first, per #1920)

- **NPC-held TWO-HANDED SWORD.** D206/D57 prohibit actor-inventory recursion.
  The sword's RAM id and visible-ownership evidence are needed before any
  scope change. That is an investigation item.
- **Castle, bridge, cliff, road.** The compiler alias `castlevis` cannot
  license prose guesses. No change.
- **DarkScope's history-based dark verdict.** A separate item: it needs
  current-turn evidence before it gates anything.

## Proposed changes

**U1 Per-word mark lifetime** (Actionable). Replace "stale all, rebuild two
blocks" with tracking:
- A live mark STAYS live while its owner is still valid: the objectId is in
  the current pool (discovered, inventory or promoted), or, for direction
  marks, the exit is current. Ownership is re-checked every refresh; an owner
  that is no longer valid stales only that mark.
- When the mark's phrase appears in text NEWER than the mark (any line after
  it, not only activeLines), the mark moves to the newest occurrence. This
  extends `relocateExactMarks` beyond activeLines, using the same
  exact-phrase, boundary and exclusion rules (commands, `Style_input`,
  subheaders, hidden probe lines, links).
- A newly in-scope object is marked at its newest printed occurrence (newest
  text first), not the oldest room line.
- D146 one-mark-per-object is unchanged.
- Epoch invalidation is unchanged: restore, restart, a new story and hidden
  probe lines stale everything as today.
- **Performance:** only lines after a mark's line, or new or changed lines,
  are scanned, via BufferRevision versions. There is no full-transcript walk
  per tick.

**U2 Reply observation** (Actionable). The admitted latest ordinary reply
joins the promotion/descriptor observation pool, with lifecycle ownership.
Commands, hidden probes and instruction lines are excluded.

**U3 Dictionary-equivalent matching** (Actionable). A printed word matches an
alias when their dictionary encodings are equal: the existing ZVM
encode-and-truncate used by the E5 references, never a raw prefix. This
covers the 9-character and punctuated (`space-ra`) cases. Aliases below the
width keep exact matching.

**U4 Trigger tokens, not scope** (Actionable). A token that is a parser
pronoun or possessive (`it, its, them, they, him, her, his, your, yours, my,
mine, our, their`) never TRIGGERS a mark. A name made only of such tokens
contributes no name trigger. The object keeps its other vocabulary (washbasin
14 stays markable as "washbasin"), and scope is untouched.

**U5 Yourself suggestion lane** (EquipmentUI/AttrCalibrator). The editable
lane (Enter:false) widens from the 11 RPG verbs to a curated item-verb list
intersected with the module dictionary: light, turn on, turn off, switch on,
switch off, hold, wave, throw, read, wear, remove, eat, drink, open, close,
clean, rub, show, push. Submit-ready forms keep today's gates exactly. These
are never auto-submitted; the operator asked for breadth "dealing with
yourself and an item".

**U6 No invented two-object verbs** (ActionSynth). "give X to" and "put X in"
(and any instrumental) are offered only when the verb is in the story's
dictionary (the D147 rule extended).

## Ownership (accepting #1919, one owner per file)

- **Codex:** `js/Actionable.js` (U1-U4) plus a focused underline harness.
- **Claude:** `js/EquipmentUI.js`, `js/AttrCalibrator.js` (U5),
  `js/ActionSynth.js` (U6) and their tests, plus the canonical
  PRODUCTION_PLAN, ARCHITECTURE and OPEN_WORK amendments (docs before code).
- Each audits the other.

## Proof (focused)

- **HHG save:** GET ALL then EXAMINE CARPET keeps the GET ALL marks.
  "It"/"your" are not marked; "washbasin" still is.
- **Treasures:** a new-game route `south,in` marks ABSORBENT SPACE-RAG,
  FLASHLIGHT, and ROBODROID outside.
- **Zork I:** "mailbox" moves to the newest mention.
- **Negative cases:** restore stales everything; an object leaving scope
  stales its mark; hidden probe text never takes a mark.
- **Yourself in Treasures** gains light/turn for the flashlight (dictionary
  permitting); HHG gains its real verbs.
- **Full item radial** in Treasures: no give/put.
- **Existing suites:** d170, d201-unnamed-identity, command-disambiguation,
  equipment-ui, buffer-revision.
