# Surface 2 independent visual review

Read existing D104/D108/D123/D156/D168/D203/D211 records and current CSS/CharCell before proposing changes. Native Anchorhead startup at320,390,1280 each dark/light; TEMP surface2-width-theme.png. No horizontal overflow; input/Send/mic/direction targets44px. Both handle placements are operator-fixed. Existing speech speed and input/VM geometry changes are not beautification opportunities.

V1: mobile input blank line, Send and crossed unavailable-mic affordance are coherent, theme colors work, focus remains visible. Desktop presentation likewise usable. Do not redesign working controls solely for consistency.
V2: 320 narrow view shows a bottom exit destination label below Send/mic at viewport edge (Alley/Southeast) partially obscured. Side/bottom rail placement belongs surface4; measure actual overlap there before changing input geometry.
V3: mobile story text looks small compared to desktop; mobile CharCell intentionally uses VM cell size plus reading-scale (CSS CharCell94), so this is not evidence for replacing fonts globally. Status grid characters on resized Anchorhead appear overwritten (real-estate/day); respect D203 VM-owned cell rendering, investigate only if fresh isolated mobile startup reproduces. Cosmetic changes cannot invent status fields or alter cell metrics.
V4: directory handle remains faint center dot by established operator preference. Preserve location and visibility behavior. Existing captions/accessibility labels present on fixed controls.

Proposal: no cosmetic runtime changes to surface2 without peer evidence of a concrete remaining defect. Defer rail overlap tosurface4, preserve input/character grid/read aloud contracts. Blind comparison next.
