from pathlib import Path
p=Path('work/mapping-research/items-codex/resume-20261020/death-persistence-20261026/verify-package.py');s=p.read_text();a="apk=pathlib.Path(";b="for f,h in m['nativeHashes'].items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h,f+' native source changed since freeze'\napk=pathlib.Path(";assert s.count(a)==1;s=s.replace(a,b);p.write_text(s)
