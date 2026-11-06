from pathlib import Path
for file in ['suspect-open-lock-route-r2.md','write-suspect-timing-plan.py']:
 p=Path('work/mapping-research/items-codex/resume-20261020/review-20261027')/file;s=p.read_text(encoding='utf-8');s=s.replace('(11 moves)','(10 moves)').replace('no earlier than13 (11 moves from3 inclusive), Alicia no earlier than15','no earlier than12 (10 moves from3 inclusive), Alicia no earlier than14');p.write_text(s,encoding='utf-8')
