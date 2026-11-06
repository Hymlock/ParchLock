from pathlib import Path
import json,datetime
root=Path('work/mapping-research/items-codex/resume-20261020');d=root/'death-persistence-20261026'
(d/'focused-r1'/'results.json').write_text(json.dumps({'source':'draft after fix-pending-selection.py, before independent final acceptance','guards':{'death-terminal':{'pass':40,'fail':0,'exit':0},'save-state':{'pass':34,'fail':0,'exit':0},'stat-tracker':{'pass':211,'fail':0,'exit':0},'e4-transcript':{'pass':15,'fail':0,'exit':0},'stat-integration':{'pass':10,'fail':0,'exit':0}},'native':'native-r2.json PASS; native-r1 picker mismatch preserved diagnostic','note':'Captured from actual tool command outputs; no rerun or invented full regression acceptance'},indent=2))
(d/'checkpoint.md').write_text('''# Current death-persistence priority checkpoint

Operator requests cumulative save-linked playthrough death counts survive quitting/reopening and earlier-save restores, separate independent editorial/testing session, then stable tested APK and resume ZIL. APK build authorized; no installation inferred.

Blind root/independent investigations and comparison complete. R2+R3 adversarial design consensus exists in independent/proposal-r3-consensus.md. Production implementation under verified codex claims: SaveState/StatTracker/Transcript/Qol/WorkspaceUI/Tutorial; MapTopology claimed but unchanged. USER_GUIDE, SW171 and Android versionCode46 changed before final freeze. Preserve unrelated dirty/staged work.

Implementation audit R1 caught pending SAVE→RESTORE→reload selecting stale disk run and silent export omission. fix-pending-selection.py applied; independent current-source re-audit requested. No implementation ACCEPT yet. Public-lifecycle19/extended23 passed before targeted failing ordering repro; must not call those final coverage. Root existing guards actual PASS death40/save34/stat211/transcript15. Integrated StatTracker+SaveState10 PASS. Real browser native-r2.json PASS: Zork ordinary saveA→grue death1→native restoreA retains1→second grue death2→reload retains2→restoreA retains2. native-r1 picker mismatch preserved as diagnostic, not runtime defect. No VM/RNG writes in native probe.

Need current-source independent acceptance/fixes, meaningful importer/UI/failure coverage, final immutable runtime+catalog manifests, single full309x2 pair with classified differences, operator13/0 and three-engine check, then scoped commit and stable dev APK. No full shared gate run for death candidate yet. Verify build deletion targets stay within explicitly named output paths before build. APK source/packaged-byte parity/hash/signature/build evidence required. No physical device testing inferred.

Existing continuation heartbeat ACTIVE15min with updated priority, no duplicate. Standing efficiency auditor requested bounded new-actionable-only milestone. Authenticated ALLpages mailbox empty at request codex-death-inbox-0239. Claims remain owned; no other-seat execution inferred. After APK deliver, resume full26 ZIL from main checkpoint; Z3 worn/Drop consumer remains REVISE (Equipment provenance seam), no approved consumer patch.
''',encoding='utf-8')
for file in ['checkpoint.md','reconciled-queue.md']:
 p=root/file;s=p.read_text(encoding='utf-8');s=s.replace('No production implementation yet; proposal under review.', 'Implementation underway after R2+R3 consensus; independent audit/focused native validation in progress. See death task checkpoint for exact results.');p.write_text(s,encoding='utf-8')

