# B7 performance first look (claude, 11-07)

Desktop Chromium, 412x915 mobile emulation, no CPU throttle. Longest main-thread task per command
(look, inventory, examine me, look, wait): Zork I ~105-115 ms, Sherlock ~100-110, Anchorhead ~50-100,
Curses ~70-80. A phone CPU is several times slower, so ~0.3-0.5 s hitches per command are plausible.

CDP profile of one LOOK in Zork I: the top self time is AttributeSchema.bitFor/applyTo (~200 ms per
1.5 s window), then GrammarProvider._d198Clone (~35 ms), AttrCalibrator.hydrate (~20 ms),
ZRamReader.executableLayoutFacts (~20 ms), ModuleLibrary.identityForPath (~17 ms).

Tried: memoising bitFor per story/digest/fact. Self time moved into applyTo (inlining); per-command
longest task unchanged (Zork I 103-107 ms). Reverted: no measurable gain.

Real cost: applyTo runs every flag for every object (~250 in Zork I) on every WorldModel tick, and a
command produces several ticks. Next step, if wanted: measure on the phone (adb + Chrome tracing),
then cut work per tick (only objects in scope/changed, or one attribute decode per object per tick),
and drop the _d198Clone deep copy per collect(). Structural; needs a proposal and review.

## _d198Clone (second attempt, reverted)
GrammarProvider.decodeD198 returns a full JSON deep copy on every call; ~20 callers (ActionSynth 352/418/457/797,
Actionable 237/257/289/2866, AttributeSchema 115/237, ExitCalibrator 166/271, ZRamReader 194/2942/2966,
GrammarProvider 12/54/collect) together cost ~35-40 ms per LOOK in Zork I. Giving only collect() a
shared read-only view did not move the number. A real fix: return a deep-frozen cached decode and audit
each caller for mutation (collect() 'shadow' path mutates activation; others appear read-only). Needs a
proposal + review; not done.
