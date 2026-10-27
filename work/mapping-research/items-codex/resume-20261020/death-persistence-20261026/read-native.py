import json
from pathlib import Path
j=json.loads(Path('work/mapping-research/items-codex/resume-20261020/death-persistence-20261026/native-r3.json').read_text());print(j['rows'][-1]['text'][-2000:])
