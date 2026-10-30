from pathlib import Path
import hashlib,json
m=json.loads(Path('work/mapping-research/items-codex/resume-20261020/review-20261025/suspect-event-plan-source-binding.json').read_text())
for entry in m['files']:
 p=Path(entry['file']);assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'],str(p)
print('Retained Suspect source3file hashes unchanged; read-only route planning only')
