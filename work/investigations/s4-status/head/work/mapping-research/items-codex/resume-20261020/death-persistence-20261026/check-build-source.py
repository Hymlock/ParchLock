from pathlib import Path
import hashlib,json
m=json.loads(Path('work/mapping-research/items-codex/resume-20261020/death-persistence-20261026/shared-r2/immutable-manifest.json').read_text())
for f,h in m['hashes'].items():assert hashlib.sha256(Path(f).read_bytes()).hexdigest()==h['candidate'],f
for f,h in m['nativeHashes'].items():assert hashlib.sha256(Path(f).read_bytes()).hexdigest()==h,f
print('Accepted frozen source parity531 + native2 PASS before build')
