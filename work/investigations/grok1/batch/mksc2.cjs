const fs=require('fs');const f='js/ModuleStatFactsClaude.js';let s=fs.readFileSync(f,'utf8');const eol=s.includes('\r\n')?'\r\n':'\n';const L=s.split(eol);
const E=[
[554,19,'Moonmist','c85885f castle.zil:781 DESCRIBE-CONTENTS','dragon\'s eye 187, dragon 190 (look omits, pc 41980 tests 19, examine ok); neg Tamara 178 (no 19, listed via print_obj at same pc)'],
[526,16,'Hollywood','e93d085 verbs.zil:211 DESCRIBABLE?','small pond 14, orchids 104, bazooka 114, doorbell 228 (look omits, pc 36783); neg business card 63, Status Line 181 (listed, same pc)'],
[509,8,'Planetfall','7e7af12 verbs.zil:162 PRINT-CONT','crevice 159, padlock 172, safety web 215 (look omits, pc 48473); neg old battery 7, towel 214 (listed, same pc)'],
[142,25,'Zork III','3ec9ed4 gverbs.zil:1824','tree 32, rope 33, shiny object 35, reeds 44, runes 132 (look omits, pc 25769); neg man 27 (listed, same pc)'],
[91,9,'Plundered Hearts','f3db372 verbs.zil:3056 DESCRIBABLE?','ledge 27, coffer 69 (look omits, pc 42969); neg Crulley 8, pile of clothes 125 (listed, same pc)']];
for(const [n,b,g,cite,ev] of E){const i=n-1;if(!/"attributeMap": \{/.test(L[i]))throw new Error('no map at '+n);if(/"scenery"/.test(L[i]))throw new Error('dup '+n);
L[i]=L[i].replace(/("attributeMap": \{[^}]*?)\s*\}/,(m,a)=>a+', "scenery": '+b+' }');
L.splice(i,0,'// scenery '+b+' = NDESCBIT (grok1 2026-10-24 user scenery ruling 11:45; g1-batch look + test_attr/print_obj trace, grok1/batch/cache-scenery4|5 judge-scenery.json): pos '+ev+'. Listing routine: historicalsource '+cite+'.');}
fs.writeFileSync(f,L.join(eol));console.log('ok',eol.length);
