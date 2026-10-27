from pathlib import Path
p=Path('harness/death-persistence/native.cjs')
s=p.read_text()
s=s.replace("await p.locator('#dialog_select').selectOption({label:name});", "const options=await p.locator('#dialog_select option').evaluateAll(els=>els.map(e=>({value:e.value,label:e.textContent}))); rows.push({label:'restore dialog',options});const option=options.find(o=>o.label.includes(name));assert.ok(option,'exact named native save is listed');await p.locator('#dialog_select').selectOption(option.value);")
p.write_text(s)
p=Path('USER_GUIDE.md');s=p.read_text();s=s.replace('way may not be recognised. The counts appear once they are above zero and reset\nwith a new game or RESTART.', 'way may not be recognised. The counts appear once they are above zero. They stay\nwith that playthrough when you quit, reopen the story, or restore an earlier save;\nrestoring does not erase deaths that happened later in the same playthrough. A\nnew game or RESTART begins a separate count. Loading a save from another\nplaythrough brings back that playthrough\'s count. Exported save packages carry\nthe counts for their selected saves.');p.write_text(s)
p=Path('service-worker.js');s=p.read_text().replace('parchlock-shell-v170','parchlock-shell-v171');p.write_text(s)
p=Path('android/app/build.gradle');s=p.read_text().replace('versionCode 45','versionCode 46');p.write_text(s)
