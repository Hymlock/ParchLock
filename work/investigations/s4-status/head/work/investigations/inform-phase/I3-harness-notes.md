# I3 inform-layout harness (harness/inform-layout.js)

Run: `node harness/inform-layout.js` (static, no browser, <1 s). Exit 1 on any FAIL.

Scope: 75 release Inform Z titles (inventory.json rows with family confirmed-inform and vm z*; 5 Glulx rows skipped).
Loads ModuleStatFactsClaude, ZRamReader, GrammarProvider and AttributeSchema in a vm context per title
(the zil-light-forms.js pattern), story bytes via zil-attr-analyzer story() (processBase64Zcode plus ZCOD blorb chunk).
The digest is checked against inventory.json.

Expected bit per flag (container, open, openable, supporter, animate, worn, light):
- name table present: ZRamReader.informAttributeNames(mem).bits[flag]
- otherwise the exact-digest fact: attributeMap[flag], or wornAttribute for worn
- neither: UNMAPPED (coverage gap, listed but not a FAIL)
Actual value: AttributeSchema.bitFor(flag, mem). bitFor routes worn through wornBitFallback when there are no names.

Result (2026-11-05): 75 PASS, 0 FAIL. 61 titles use names, 13 use facts, sutwin has none.
Both controls PASS. Each one mutates the consumer-side source in a VM-realm clone while the expectation keeps the
original value, then restores it:
- fact control: attributeMap.container flipped, detected as container:4!=3
- names control: declared bits.open flipped, detected as open:15!=14

Finding (coverage, not a mismatch): 12 no-name titles have partial facts. For their unmapped flags bitFor falls through
to the I6 PROFILE default (confirmed-inform), which nothing here verifies.
- library, break-in, spirit, lost, wedding: only container and animate are mapped
- minster, Enemies, Gumshoe, heist, lists, godot, SoFar: only container is mapped
- magic-toyshop, windhal1, theatre, tube: all 7 flags are mapped
- sutwin: no bits, so all 7 fall to PROFILE
Whether a PROFILE default is right for these titles is unverified. It is a candidate follow-up, not a defect shown here.

## Claude disposition of the UNMAPPED list (11-05)
Not a coverage gap. The alphabetical-layout titles had bits 8-26 (light 9, open 14, openable 15, supporter 20, worn 26) **measured equal to PROFILE** in Inform P1 (heist/library/break-in raw ops plus the census packets, commits 3f588921/722ac5c1/1064f43f). Only the shifted bits 0-7 needed facts. sutwin has no attribute bits set on any object, so PROFILE can never read true.
