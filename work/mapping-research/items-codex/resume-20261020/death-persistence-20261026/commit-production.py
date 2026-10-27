from pathlib import Path
import subprocess,os,json,hashlib
root=Path.cwd();d=root/'work/mapping-research/items-codex/resume-20261020/death-persistence-20261026';m=json.loads((d/'shared-r2/immutable-manifest.json').read_text());g=json.loads((d/'shared-r2/gate-classification.json').read_text());assert g['rowsEach']==309 and g['unresolved']==0
assert '13 PASS / 0 FAIL' in (d/'shared-r2/operator.txt').read_text()
t=[json.loads(s) for s in (d/'shared-r2/three-engine.jsonl').read_text().splitlines()];assert len(t)==3 and all(not x.get('error') for x in t)
assert json.loads((d/'shared-r2/packaged-native-r2.json').read_text())['status']=='PASS'
for f,h in m['hashes'].items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h['candidate'],f
for f,h in m['nativeHashes'].items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h,f
files=m['changed']+['android/app/build.gradle','android/app/src/main/java/com/parchlock/app/RotatingIconWidget.java','harness/death-persistence/native.cjs','harness/death-persistence/stat-integration.cjs']
def git(*args,env=None):return subprocess.check_output(['git',*args],env=env)
staged=git('diff','--cached','--name-only').decode().splitlines();unrelated=[f for f in staged if f not in files];prior={f:git('ls-files','-s','--',f).decode() for f in unrelated}
idx=d/'production-commit-index';assert not idx.exists();env=os.environ.copy();env['GIT_INDEX_FILE']=str(idx)
try:
 git('read-tree','HEAD',env=env);git('add','--',*files,env=env)
 git('commit','-m','Persist cumulative playthrough death history with game saves','-m','Keep each saved playthrough history across quit/reopen and older restores; use separate histories for explicit new games. Preserve ending qualification and current-reading invalidation. Validate transactional packages and late executable identity, including null-ready startup. Build75/code48/cache173; native API guard metadata matches previously delivered build.','-m','Seat: codex',env=env)
 commit=git('rev-parse','HEAD').decode().strip()
finally:
 if idx.exists():idx.unlink()
 lock=Path(str(idx)+'.lock')
 if lock.exists():lock.unlink()
git('reset','-q','HEAD','--',*files)
assert prior=={f:git('ls-files','-s','--',f).decode() for f in unrelated},'Unrelated staging changed'
for f in files:
 a=git('show',commit+':'+f).replace(b'\r\n',b'\n');b=(root/f).read_bytes().replace(b'\r\n',b'\n');assert a==b,'Committed content differs '+f
(d/'shared-r2/production-commit.json').write_text(json.dumps({'commit':commit,'files':files,'unrelatedStagedPreserved':unrelated,'gitNormalization':'Only repository standard CRLF->LF text normalization; committed tokens verified against executed bytes','runtimeFrozenFiles':531},indent=2))
print(commit)
