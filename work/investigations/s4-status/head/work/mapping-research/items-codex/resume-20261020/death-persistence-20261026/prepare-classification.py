from pathlib import Path
p=Path('harness/death-persistence/native.cjs');s=p.read_text();s=s.replace("document.querySelector('#equipment-stats')?.innerText || document.querySelector('#equipment-panel')?.innerText || document.body.innerText", "document.querySelector('#pl-stats .pl-stat-deaths')?.innerText || ''");p.write_text(s)
p=Path('work/mapping-research/items-codex/resume-20261020/death-persistence-20261026/shared-r2/classify-gate.cjs');p.write_bytes(Path('work/mapping-research/items-codex/resume-20261020/sherlock-ztext-r3-shared/classify-gate.cjs').read_bytes())
