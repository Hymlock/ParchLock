from pathlib import Path
for file,a,b in [('js/Consts.js',b'const BUILD = 72;',b'const BUILD = 75;'),('service-worker.js',b'parchlock-shell-v171',b'parchlock-shell-v173'),('android/app/build.gradle',b'versionCode 46',b'versionCode 48')]:
 p=Path(file);s=p.read_bytes();assert s.count(a)==1,(file,a);p.write_bytes(s.replace(a,b))
p=Path('work/mapping-research/items-codex/resume-20261020/death-persistence-20261026/prepare-final.cjs');s=p.read_text();s=s.replace("const changed=['js/SaveState.js'", "const changed=['js/Consts.js','js/SaveState.js'");p.write_text(s)
