const fs=require('fs');const J=JSON.parse(fs.readFileSync('cache-scenery4/judge-scenery.json'));const out='cache-scenery5';fs.mkdirSync(out,{recursive:true});
for(const k of process.argv.slice(2)){const R=Object.values(JSON.parse(fs.readFileSync('cache-scenery4/run-'+k+'.json')));const P=JSON.parse(fs.readFileSync('cache-scenery4/plan-'+k+'-scenery.json'));const bit=P.bit;
 const posSteps=[...new Set(R.filter(r=>r.cmd==='look'&&r.expect&&r.verdict==='TRUE'&&r.parent===r.here).map(r=>r.step))];
 const pr=JSON.parse(fs.readFileSync('cache-scenery2/presence-'+k+'.json'));const bitOf=(h,b)=>!!(parseInt(h.substr((b>>3)*2,2),16)&(128>>(b&7)));
 const SF=JSON.parse(fs.readFileSync('../../2026-10-11-zil-source-flags.json','utf8'))[P.game]||{};const NO=SF.ramObjects||255;const used=new Set(R.map(r=>r.id));const order=[...posSteps,...pr.steps.map(x=>x.step).filter(x=>!posSteps.includes(x))];let tot=0;const tests=[];
 for(const s of order){if(tot>=6)break;const st=pr.steps.find(x=>x.step===s);if(!st)continue;let n=0;for(const [id,hex] of st.present){const nm=pr.names[id];if(id>NO||id===st.here||used.has(id)||!nm||!/^[a-z0-9 '\-]+$/i.test(nm)||/^(you|yourself|me|self|cretin|adventurer)$/i.test(nm.trim())||bitOf(hex,bit))continue;tests.push({id,name:nm,step:s,expect:0,bit,cmd:'look'});used.add(id);tot++;if(++n>=2||tot>=6)break;}}
 fs.writeFileSync(out+'/plan-'+k+'-scenery.json',JSON.stringify({key:k,game:P.game,bit,tmpl:'look',tag:'scenery',tests},null,1));fs.copyFileSync('cache-scenery4/run-'+k+'.json',out+'/run-'+k+'.json');console.log(k,'posSteps',posSteps.join(','),'neg',tests.map(t=>t.name+'@'+t.step).join('|'));}


