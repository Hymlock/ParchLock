// x2 classification: REAL = base1==base2, cand1==cand2, base!=cand for a field; else FLAKY when any diff.
const fs=require('fs'),D=__dirname,rd=f=>Object.fromEntries(fs.readFileSync(D+'/'+f,'utf8').trim().split('\n').map(l=>{try{return JSON.parse(l)}catch(e){return null}}).filter(r=>r&&r.game).map(r=>[r.game,r]));
const b1=rd('base-1.jsonl'),b2=rd('base-2.jsonl'),c1=rd('cand-1.jsonl'),c2=rd('cand-2.jsonl'),J=JSON.stringify;const real=[],flaky=new Set();
for(const g of Object.keys(b1).sort())for(const k of ['rooms','exits','marks','inv1','inv2','error']){const v=[b1,b2,c1,c2].map(x=>J((x[g]||{})[k]));
 if(v[0]===v[2]&&v[1]===v[3]&&v[0]===v[1])continue; if(v[0]===v[1]&&v[2]===v[3])real.push([g,k,v[0],v[2]]);else flaky.add(g);}
console.log('games',Object.keys(b1).length,Object.keys(b2).length,Object.keys(c1).length,Object.keys(c2).length);
console.log('REAL (stable in both runs, base != cand): '+real.length);for(const [g,k,a,b] of real)console.log('  '+g+' '+k+'\n    base: '+a.slice(0,600)+'\n    cand: '+b.slice(0,600));
console.log('FLAKY (differs between same-tree runs): '+[...flaky].join(', '));
