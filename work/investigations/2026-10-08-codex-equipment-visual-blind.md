# Independent Equipment visual review ? 2026-10-08

Reviewed live native Treasure held sword/flashlight/space-rag at390 dark,320 dark Options open,1280 actual body.light Options open. Actual inventory warning dismissed before capture; no fake objects/VM mutation. Photos in TEMP equipment-before-width-theme.png. First light capture used wrong theme class; corrected actual body.light before findings.

V1: floating center grip visibly overlays the middle of absorbent space-rag. Existing D131 gave name the full width to avoid truncation, but center handle now covers letters; full wrapping labels permit a reserved trailing grip slot. Preserve grip-only drag, pan-y on row, native IDs/radials and Yourself. Never restore ellipsis.
V2: closed Options takes73px, appears as bare text without chevron/border, despite D168 disclosure goal. Make a compact clearly actionable disclosure with44px border-box target and visible expand/collapse cue.
V3: expanded Options takes345px at320 width. Sort, container view, search and categories feel scattered; give responsive grouping/aligned controls, native select/checkbox/search semantics, keyboard focus, consistent app accent and >=44px targets. Preserve all existing IDs/events and category behavior.
V4: hidden Spells category is visibly rendered in Treasure screenshot (label.hidden true, .equip-check display:inline-flex overrules hidden UA style). A scoped hidden-attribute rule should obey the existing relevance flag, not invent new spell logic. Same for all hidden category labels inside Equipment; verify a real spell module retains visible Spells.
V5: inventory rows and overall surface are otherwise consistent with app style. Keep status cards, ordering, category logic and warning policies unchanged. Review dark/light and narrow phone widths after changes; no horizontal overflow or label clipping, count remains list-owned.

Proposal bounded CSS-only Equipment Options and grip layout polish, retaining full wrapping names. No redesign of Tools/options elsewhere, no runtime/VM changes and no APK until requested. Compare with Claude blind review before edits.
