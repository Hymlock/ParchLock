from pathlib import Path
import subprocess,os,json
r=Path.cwd();d=r/'work/mapping-research/items-codex/resume-20261020/death-persistence-20261026'
files=['PRODUCTION_PLAN.md','ARCHITECTURE_UML.md','docs/DECISION-INDEX.md','work/mapping-research/items-codex/resume-20261020/death-persistence-20261026','work/mapping-research/items-codex/resume-20261020/checkpoint.md','work/mapping-research/items-codex/resume-20261020/reconciled-queue.md','work/mapping-research/items-codex/resume-20261020/ongoing-efficiency-auditor.md']
def git(*a,env=None):return subprocess.check_output(['git',*a],env=env)
idx=Path(git('rev-parse','--git-path','codex-death-evidence-index').decode().strip()).resolve();assert not idx.exists();env=os.environ.copy();env['GIT_INDEX_FILE']=str(idx)
try:
 git('read-tree','HEAD',env=env);git('add','--',*files,env=env);git('commit','-m','Record accepted death-history contract and APK75 evidence','-m','D243 and architecture89 supersede only the old module-load history reset. Preserve failed-candidate and UI-test diagnostics, independent source/artifact audits, corrected frozen gate with baseline reuse and explicit coverage gaps, packaged native proof and exact APK/source hashes. Resume full26 ZIL without an overall completion claim.','-m','Seat: codex',env=env)
finally:
 if idx.exists():idx.unlink()
 lock=Path(str(idx)+'.lock')
 if lock.exists():lock.unlink()
git('reset','-q','HEAD','--',*files)
print(git('rev-parse','HEAD').decode().strip())
