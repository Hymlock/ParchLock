const fs=require('fs');
let s=fs.readFileSync('work/mapping-research/items-codex/resume-20261020/gate.cjs','utf8');
const needle="if (await settle()) {";
if(s.split(needle).length!==2)throw Error('gate anchor');
s=s.replace(needle,"if (g === 'Borderzo.z5.js') { const c=p.locator('.Input.CharInput'); await c.first().focus(); await p.keyboard.press('2'); await p.waitForTimeout(1500); }\n            "+needle);
fs.writeFileSync(__dirname+'/gate.cjs',s);
