from pathlib import Path
p=Path('work/mapping-research/items-codex/resume-20261020/review-20261027/z3-custody-prototype-r1/public-resolver-controls.cjs');s=p.read_text();s=s.replace("assert.deepEqual(x.sent,['drop golden amulet']);","assert.deepEqual(Array.from(x.sent),['drop golden amulet']);");p.write_text(s)
