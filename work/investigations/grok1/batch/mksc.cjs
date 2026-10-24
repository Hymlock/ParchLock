const fs=require('fs');const f='js/ModuleStatFactsClaude.js';const raw=fs.readFileSync(f,'utf8');const EOL=raw.includes('\r\n')?'\r\n':'\n';const L=raw.split(EOL);
const j=require(process.argv[2]);
const E=[[176,'ballyhoo',6,'9f779e8 verbs.zil:3084 PRINT-CONTENTS',46920],[248,'spellbrkr',19,'6f83ba4 verbs.zil:1889 PRINT-CONT',54920],[434,'stationfall',10,'5d05d5e verbs.zil:2893 DESCRIBABLE?',52787],[595,'starcross',23,'3ceaa9f verbs.zil:134 PRINT-CONT',24111],[945,'zork1',14,'97b7b3d gverbs.zil:1780 PRINT-CONT',36719]];
E.sort((a,b)=>b[0]-a[0]);
for(const [ln,k,bit,cite]of E){const i=ln-1;if(!/"attributeMap"/.test(L[i]))throw k;if(/"scenery"/.test(L[i]))throw 'dup '+k;const g=j[k];if(g.verdict!=='PASS')throw 'nopass '+k;
const pcs=[...new Set(g.detail.filter(d=>[...g.pos,...g.neg].map(s=>+s.split(':')[0]).includes(d.id)).flatMap(d=>d.pcs))].join('/');
const ind=L[i].match(/^\s*/)[0];
L[i]=L[i].replace(/\s*\}(\s*,?\s*)$/,', "scenery": '+bit+' }$1');
L.splice(i,0,ind+`// scenery ${bit} = NDESCBIT (grok1 2026-10-24, user ruling 11:45 ET): native look in Jericho, object directly in room with NDESCBIT set, look omits it, trace shows the listing routine (historicalsource ${cite}) testing NDESCBIT on that object at pc ${pcs} during that look, examine works. Positives ${g.pos.join(', ')}; negative ${g.neg.join(', ')} (listed, bit clear, same pc). work/investigations/grok1/batch/cache-scenery3 run-${k}.json, judge-scenery.json. Take unaffected (D214 TAKEBIT owns takeable).`);}
fs.writeFileSync(f,L.join(EOL));console.log('ok',EOL.length);
