import json,hashlib,zipfile,pathlib,re
root=pathlib.Path.cwd();d=root/'work/mapping-research/items-codex/resume-20261020/death-persistence-20261026';m=json.loads((d/'shared-r2/immutable-manifest.json').read_text());
for f,v in m['hashes'].items():
 assert hashlib.sha256((root/f).read_bytes()).hexdigest()==v['candidate'],f+' changed since freeze'
for f,h in m['nativeHashes'].items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h,f+' native source changed since freeze'
apk=pathlib.Path('C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-dev.apk');source=apk.with_name('ParchLock-source.zip')
assets=[];sources=[]
with zipfile.ZipFile(apk) as z:
 for name in z.namelist():
  if not name.startswith('assets/public/') or name.endswith('/'):continue
  rel=name[len('assets/public/'):]; data=z.read(name);generated=root/'android/app/src/main/assets/public'/rel
  assert generated.is_file() and data==generated.read_bytes(),'Generated asset mismatch '+rel
  if rel in m['hashes']:assert hashlib.sha256(data).hexdigest()==m['hashes'][rel]['candidate'],'Accepted asset mismatch '+rel
  assets.append(rel)
 assert b'const BUILD = 75;' in z.read('assets/public/js/Consts.js')
 assert b'parchlock-shell-v173' in z.read('assets/public/service-worker.js')
 for f in ['js/SaveState.js','js/StatTracker.js','js/Transcript.js','js/Qol.js','js/Tutorial.js','js/WorkspaceUI.js']:assert f in assets
 assert not any(f.endswith(('.apk','.zip','.exe')) for f in assets)
with zipfile.ZipFile(source) as z:
 for name in z.namelist():
  if name.endswith(('/','\\')):continue
  rel=name.replace('\\','/'); assert not re.search(r'(^|/)(games|node_modules|work|\.ai-bus|\.git|\.gradle|build)/|local\.properties$|\.(apk|keystore|jks)$',rel),'Excluded source '+rel
  file=root/rel;assert file.is_file() and z.read(name)==file.read_bytes(),'Corresponding source mismatch '+rel
  sources.append(rel)
import xml.etree.ElementTree as ET
lint=ET.parse(root/'android/app/build/reports/lint-results-debug.xml').getroot();lint_errors=[x for x in lint.findall('issue') if x.get('severity') in ('Error','Fatal')];assert not lint_errors,'Lint errors remain';lint_warnings=sum(x.get('severity')=='Warning' for x in lint.findall('issue'))
out=pathlib.Path('C:/Users/hymlo/Documents/Codex/2026-10-20/well-i-can-t-find-the/outputs/ParchLock-build75');out.mkdir(parents=True,exist_ok=True)
import shutil
for src,name in [(apk,'ParchLock-build75.apk'),(source,'ParchLock-source-build75.zip')]:
 dest=out/name;assert not dest.exists(),'Refuse overwrite '+str(dest);shutil.copy2(src,dest)
result={'build':75,'versionCode':48,'cache':173,'packagedAssetsVerified':len(assets),'correspondingSourceFilesVerified':len(sources),'apk':str(out/'ParchLock-build75.apk'),'apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'lintErrors':0,'lintWarnings':lint_warnings,'frozenRuntimeFiles':len(m['hashes']),'status':'asset/source parity PASS; signature/version/lint independently checked in adjacent logs'}
(d/'shared-r2/package-validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
