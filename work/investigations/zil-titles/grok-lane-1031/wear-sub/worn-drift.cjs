const fs=require('fs'),vm=require('vm'),cp=require('child_process');
const src=cp.execSync('git show HEAD:js/ModuleStatFactsClaude.js',{encoding:'utf8',maxBuffer:1e8});
const c={};vm.createContext(c);vm.runInContext(src+';this.F=ModuleStatFactsClaude;',c);
const L=JSON.parse(fs.readFileSync('work/investigations/2026-10-11-zil-cell-ledger.json','utf8'));
for(const t of Object.keys(L)){const key=Object.keys(c.F).find(k=>{const v=c.F[k];return v&&typeof v==='object'&&(k===t||(v.story||v.file||v.storyFile||'')===t||k.toLowerCase()===t.split('.')[0].toLowerCase()||t.toLowerCase().startsWith(k.toLowerCase()))});const f=c.F[key]||{};const l=L[t];const g=k=>l[k]&&l[k].s;
console.log(t.split('.')[0].padEnd(28),'wornAttr='+f.wornAttribute,'wearable='+(f.attributeMap||{}).wearable,'| ledger worn='+g('worn'),'wearable='+g('wearable'),'clothing='+g('clothing'));}

