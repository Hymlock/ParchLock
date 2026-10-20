# Hollywood Hijinx native wear audit and scoped integration decision

Codex independently reviews the existing Grok worn14 proposal4120 and wearable22 evidence rejected by Claude4295 for constructed scenes. No new shared runtime design. Recovered unread review packets remain proposals until checked.

## Native route correction

The stored Jericho route omits a starting puzzle precondition: the oak door is locked before its first OPEN DOOR. The earlier failures occurred before entry, not at the skis and not established as an RNG defect. Native TURN STATUE WEST, TURN STATUE EAST, TURN STATUE NORTH unlocks it; source lead: historicalsource/hollywoodhijinx commit e93d08596db4297d46f3ac0065a546d27f036e74 first-floor.zil BUCK-F. Current native replies verify the click and door opening, so this does not depend on source/build equivalence.

Ring route: corrected entry prefix, then existing walkthrough0..26 obtains ring127. WEAR RING tests127:22 TRUE and127:14 FALSE, succeeds. REMOVE RING tests127:14 TRUE and succeeds. Flashlight123 tests22 FALSE and14 FALSE under WEAR FLASHLIGHT, with native refusal. Skis route: corrected entry, turn on flashlight, open closet door, in, take skis188, out. WEAR SKIS tests188:22 TRUE and188:14 FALSE, succeeds; REMOVE SKIS tests188:14 TRUE, succeeds. Each test log is scoped to its named command; unrelated parser objects are excluded. No relocation or state forcing.

Two distinct native positives plus the held flashlight negative satisfy wearable22 capability and worn14 state semantics. Raw hollywood-wear-native.txt (ring plus failed first closet attempt retained) and hollywood-skis-native.txt (successful original-scene skis route); helper hollywood-wear-native.cjs. Failed out-of-scope skis attempts never counted as negatives.

Bounded compiled table: first772, first property2968,244 objects. Bit14 at boot only global69, parent0; bit22 at boot global69, mask85, ring127, toupee142, skis188; no room owner. The exploratory heuristic objectCount393 was rejected because it scanned property bytes as objects; the retained census explicitly uses the first-property boundary and validates link IDs. Pinned source V-WEAR tests WEARBIT then sets WORNBIT, V-TAKE-OFF clears WORNBIT. Source is corroboration, not exact-build certification.

## Decision

ACCEPT existing wearable22, scoped native proof replacing4295 gap. ACCEPT Grok4120's proposed wornAttribute14 for this digest, using the new independent ring/skis evidence rather than claiming all old packets were native. Existing isTrulyWorn handles the display; no wearable/state conflation, no shared code or capability expansion. Integrate this one field only, with operator13/0, affected-title + InformZ/Glulx baseline/candidate parity and native Equipment worn/Remove proof before commit. No full-title closure, whole-source absence or other attribute acceptance.

## Current-source integration verification

One added field only: this digest's wornAttribute14. Required operator regressions13 PASS/0 FAIL. Seeded HollywoodHijinx/LostPig InformZ/Alabaster Glulx base/candidate comparison:3 rows each,0 differences. Native original skis route: Equipment row188 worn=true with Remove after WEAR; worn=false after REMOVE. Assertions pass; no forced memory state or constructed objects. Raw hollywood-worn-ui.txt, source helper, gate rows retained. Current-source ACCEPT for the Grok-authored data proposal after these checks. No other digest or algorithm changes.
