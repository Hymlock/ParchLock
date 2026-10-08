# Sealed Codex investigation — repeated Score/Quest Rate report

Operator screenshot after restored Treasures play shows Score43/500 and Quest Rate43/500, rank Lout Without a Country, turns265. Import issue withdrawn because operator succeeded.

Current code is the shipped D209 source: StatTracker.updateScoreAlias requires TWO DISTINCT equal values in the SAME completed tick, matching a SCORE-command maximum. Resync/reset erase all alias evidence. displayScoreAlias refuses to merge without that accumulated qualification. harness/d209-score-alias explicitly expects a first equal sighting to remain split.

Therefore the tested fresh route (two different score values) did not cover a restored game or a first Equipment visit at one fixed score. A user can play hundreds of turns, restore, and have only one fresh paired score value; repeated refresh at43 cannot produce a second distinct value. This mechanism explains the screenshot without a stale APK. Live saved-state reproduction remains to be performed; no runtime edit yet.

An identical numeric value at one instant does not establish semantic identity for arbitrary custom stats. Need independent investigation against current source, D209 plan, architecture, and actual Treasures output before choosing the smallest general fix. No title-specific label hack is proposed.

## Independent comparison and live evidence

Independent delegated investigator found the same reset/two-distinct-value gap and recommended executable-authenticated semantic metadata, with dynamic learning preserved elsewhere. The real user package imported successfully after native Restore establishes story identity; native Restore loaded save3. Actual SCORE reports43/500 in244turns; current grid QUEST RATE43/500 and HP26/26, PROWESS damage4–9 and81%. First and reopened Equipment both render duplicates. Digest257edae1fea429656e638fa539a65c0f4e4daeb4f9669a2a5be368e6a9aca756. Reproduction: `node work/investigations/score-restore-live.cjs` (360).

## Proposal pending adversarial review

Register `scoreAliasField: "quest rate"` in existing executable-authenticated collaboration facts, not a runtime title/filename switch. It is a measured semantic field relationship, not a numeric reading. Prior live0→3 matched pair plus actual restored43 pair support this executable's relationship. `displayScoreAlias` may use that noncanonical relationship before dynamic qualification, retaining confirmed readings, score availability, SCORE-reply max, exact current value/max agreement and all underlying metrics/rank. Unclassified executables retain two-distinct dynamic learning. Reset/restore still invalidate timeline evidence/readings. Mismatches render both rows. Main registry under Grok claim remains untouched.

This amends D209's discovery-only contract and architecture71; no extra probes, game turns, learned-state persistence or unknown-label merging. Verify real save first Equipment/reopen at360 and1280 plus canonical/unconfirmed/mismatch/max/source/unknownidentity negatives and existing statistics/equipment regressions. Implementation awaits independent adversarial verdict.

## Implemented and independently accepted

Independent adversarial proposal ACCEPT with strict declaration typing/precedence and preservation of base facts. Implemented narrow overlay and generic rendering hook. Independent implementation audit ACCEPT: alias33/0 and supplied-save real import/native Restore first Equipment without manual SCORE and reopen at360/1280 pass. Root additionally asserts rendered DOM labels/chips at both widths, one QUEST RATE43/500 and no Score/duplicate Quest chip. Rank retained (story randomizes its rank wording on SCORE); HP26/26, damage4–9 and81% hit odds remain. Stats204/0, equipment112/0. D209/ARCH71 amended, shell126, APK rebuild in progress. External Claude review request1629 and proposal1630 remain unanswered; delegated audit is independent, not a claim of Claude acceptance.
