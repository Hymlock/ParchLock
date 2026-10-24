const fs=require('fs'),D=process.argv[2];const out={};
for(const f of fs.readdirSync(D).filter(f=>/^run-.*\.json$/.test(f))){const k=f.slice(4,-5);const R=Object.values(JSON.parse(fs.readFileSync(D+'/'+f,'utf8'))).filter(r=>r.tag==='scenery');const by={};
for(const r of R){const v=by[r.id]||(by[r.id]={id:r.id,name:r.name,expect:r.expect});if(r.cmd==='look'){v.look=r.verdict;v.direct=r.parent===r.here;v.trunc=r.text.length>=300;const nm=r.name.toLowerCase();v.nTxt=r.text.toLowerCase().includes(nm);v.hasPr=Array.isArray(r.printedObjs);v.named=v.hasPr&&r.printedObjs.includes(r.id);v.lookStep=r.step;v.pcs=[...new Set((r.opsOnId||[]).filter(o=>o[1]===r.bit).map(o=>o[3]))];}else{v.exam=!/can't see|don't see|don't know the word|cannot see|not here/i.test(r.text);v.examText=r.text.split('\n')[0].slice(0,60);}}
const L=Object.values(by);const negPcs=new Set(L.filter(x=>!x.expect&&x.look==='FALSE'&&x.named).flatMap(x=>x.pcs||[]));for(const x of L)x.samePc=(x.pcs||[]).some(p=>negPcs.has(p));const pos=L.filter(x=>x.expect&&x.look==='TRUE'&&x.direct&&x.hasPr&&!x.named&&x.exam&&x.samePc),neg=L.filter(x=>!x.expect&&x.look==='FALSE'&&x.named);
const bad=L.filter(x=>x.direct&&((x.expect&&x.look==='TRUE'&&x.named)));
out[k]={bad:bad.map(x=>x.id+':'+x.name),verdict:pos.length>=2&&neg.length>=1&&!bad.length?'PASS':'FAIL',pos:pos.map(x=>x.id+':'+x.name),neg:neg.map(x=>x.id+':'+x.name),detail:L};
console.log(k.padEnd(12),out[k].verdict,'pos',pos.length,'neg',neg.length,'|',L.map(x=>`${x.name}${x.expect?'+':'-'} look=${x.look} d=${x.direct?1:0} pr=${x.named?1:0} t=${x.nTxt?1:0} ex=${x.exam?1:0} pc=${(x.pcs||[]).join('/')}`).join('; '));}
fs.writeFileSync(D+'/judge-scenery.json',JSON.stringify(out,null,1));



