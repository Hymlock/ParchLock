import pathlib,json,hashlib,zipfile,xml.etree.ElementTree as ET
root=pathlib.Path.cwd();d=root/'work/mapping-research/items-codex/resume-20261020/death-persistence-20261026';s=d/'shared-r2';m=json.loads((s/'immutable-manifest.json').read_text());validation=json.loads((s/'package-validation.json').read_text());out=pathlib.Path(validation['apk']).parent
h=lambda b:hashlib.sha256(b).hexdigest()
errors=[]
for name,entry in m['hashes'].items():
 for label in ['base','candidate']:
  if h((pathlib.Path(m[label])/name).read_bytes())!=entry[label]:errors.append('frozen drift '+label+name)
 if h((root/name).read_bytes())!=entry['candidate']:errors.append('live drift '+name)
for name,expected in m['nativeHashes'].items():
 if h((root/name).read_bytes())!=expected:errors.append('native drift '+name)
apk=pathlib.Path(validation['apk']);source=out/'ParchLock-source-build75.zip'
assert h(apk.read_bytes())==validation['apkSha256'];assert h(source.read_bytes())==validation['sourceSha256']
assets=[];sources=[]
with zipfile.ZipFile(apk) as z:
 for name in z.namelist():
  if name.startswith('assets/public/') and not name.endswith('/'):
   rel=name[len('assets/public/'):];payload=z.read(name);assets.append(rel)
   if payload!=(root/'android/app/src/main/assets/public'/rel).read_bytes():errors.append('APK/generated '+rel)
   if rel in m['hashes'] and h(payload)!=m['hashes'][rel]['candidate']:errors.append('APK/frozen '+rel)
 assert b'const BUILD = 75;' in z.read('assets/public/js/Consts.js')
 assert b'parchlock-shell-v173' in z.read('assets/public/service-worker.js')
with zipfile.ZipFile(source) as z:
 for name in z.namelist():
  if name.endswith(('/','\\')):continue
  rel=name.replace('\\','/');sources.append(rel)
  if z.read(name)!=(root/rel).read_bytes():errors.append('source/live '+rel)
 assert m['nativeHashes'].keys()<=set(sources)
assert len(assets)==501 and len(sources)==365
read=lambda name:[json.loads(x) for x in (s/name).read_text().splitlines() if x.strip()]
a=read('base-full.jsonl');b=read('candidate-full.jsonl');assert len(a)==len(b)==309
assert len({r['game'] for r in a})==len({r['game'] for r in b})==309
am={r['game']:r for r in a};bm={r['game']:r for r in b};assert am.keys()==bm.keys()
keys=['rooms','exits','marks','inv1','inv2','error'];diffs=[(g,k) for g in am for k in keys if am[g].get(k)!=bm[g].get(k)]
report=json.loads((s/'gate-classification.json').read_text());assert len(diffs)==4
assert set(diffs)=={(r['game'],r['key']) for r in report['differences']}
ra={r['game']:r for r in read('base-diff-recheck.jsonl')};rb={r['game']:r for r in read('candidate-diff-recheck.jsonl')}
assert len(ra)==len(rb)==3
for g,k in diffs:assert ra[g].get(k)==rb[g].get(k)
assert all(r['classification']=='FLAKY' for r in report['differences']) and report['unresolved']==0
gaps=[r['game'] for r in a if r.get('error') and r.get('error')==bm[r['game']].get('error')];assert len(gaps)==7
assert set(gaps)=={r['game'] for r in report['coverageGaps']}
native=json.loads((s/'packaged-native-r2.json').read_text());assert native['status']=='PASS';assert any(r['label']=='rendered persisted equipment' and '2' in r['text'] for r in native['rows'])
lint=ET.parse(root/'android/app/build/reports/lint-results-debug.xml').getroot();issues=lint.findall('issue');assert not [i for i in issues if i.get('severity') in ['Error','Fatal']]
result={'status':'PASS' if not errors else 'FAIL','errors':errors,'frozenFiles':len(m['hashes']),'apk':str(apk),'apkSha256':h(apk.read_bytes()),'sourceSha256':h(source.read_bytes()),'assets':len(assets),'sourceFiles':len(sources),'gateRowsEach':309,'flakyFields':len(diffs),'pairedRecheckedGames':len(ra),'matchingCoverageGaps':gaps,'packagedNative':'PASS','lintWarnings':sum(i.get('severity')=='Warning' for i in issues)}
(d/'independent/final-artifact-validation.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));assert not errors
