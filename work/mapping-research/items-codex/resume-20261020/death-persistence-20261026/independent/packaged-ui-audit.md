# Packaged persisted Equipment tile investigation — PASS; harness assertion diagnosed

Executed independent/packaged-render-independent.cjs in actual Chromium using Downloads/ParchLock-dist/play.html (the packaged501asset root). Constructed public counter/history fixture ONLY; not native death classification evidence. Public saveA0 -> record2 constructed deaths -> browser reload -> public restoreA -> syncPlaythrough -> EquipmentUI.Show. No direct Tick/Render call and no full native route/catalog repeat.

At0/500/1000ms ledger/model2, actual #pl-stats .pl-stat-deaths exists with textContent 'Deaths this playthrough2' and complete correct markup. Its innerText is EMPTY because EquipmentUI.Show opens the first Equipment inventory-warning dialog. Message.IsOpen=true and body.app-dialog-open; existing modal ownership hides Equipment while warning is foreground. Thus the packaged-native assertion's empty innerText is reproducible as a sampling error, not absent persisted state or renderer.

Then clicked ACTUAL '#message #close' control through browser locator. Without forcing a render, same tile becomes visible with innerText 'DEATHS THIS PLAYTHROUGH\n2', Message.IsOpen=false, equip-open remains. Zero page errors. JSON with before/after markup/model/visibility evidence: packaged-render-independent.json. Fixture exit0.

A second assertion pitfall: existing native harness uses case-sensitive /Deaths this playthrough[\\s\\S]*2/ against innerText. CSS uppercase transforms visible label to DEATHS THIS PLAYTHROUGH, so even a correctly visible tile can fail. Use actual warning close when present, require tile visible, assert .pl-stat-value text2 plus label textContent or case-insensitive visible text. Do not suppress warning or force Render to claim automatic rendering.

No runtime source fix warranted; current packaged persisted-count rendering accepted in this constructed scope. Original native UI failing output remains diagnostic and should be annotated with reason rather than relabeled PASS. Full gate classification and final signature/archive/artifact parity acceptance remain separate.
