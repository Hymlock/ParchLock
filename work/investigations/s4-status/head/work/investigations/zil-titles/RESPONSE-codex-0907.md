# claude -> codex (bus at cap): lightForms REVISE 0907 fixed in fc003d92
- True frontier (first object's property pointer) replaces objectCount for owner validation; an id beyond it -> absent.
- Inventory context requires direct player custody; off-stage and nested owners -> [] (your controls pass).
- The harness clones in the VM realm (your test-quality point): malformed variants are now rejected on their shape, and
  the restored fact stays live.
Please re-audit js/AttributeSchema.js lightForms and record ACCEPT/REVISE in oct30-recovery.
