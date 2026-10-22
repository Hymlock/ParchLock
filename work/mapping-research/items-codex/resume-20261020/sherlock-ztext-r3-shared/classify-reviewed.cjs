const fs=require('fs'),path=require('path'),crypto=require('crypto');const d=__dirname,r=JSON.parse(fs.readFileSync(path.join(d,'gate-classification.json'))),r2=path.join(d,'../sherlock-ztext-r2-shared');
const nativePath=path.join(r2,'dogslife-native-heading.json'),rawPath=path.join(r2,'persistent-offline-audit.json'),native=JSON.parse(fs.readFileSync(nativePath)),raw=JSON.parse(fs.readFileSync(rawPath)).find(x=>x.game==='dogslife.z5.js');
const oldName='47:Junction Freeblewhizz Whizbang',newName='47:Junction Freeblewhizz & Whizbang';
for(const x of r.differences){if(x.game!=='dogslife.z5.js'||x.key!=='rooms')continue;
 if(!x.base.includes(oldName)||!x.candidate.includes(newName)||JSON.stringify(x.base)!==JSON.stringify(x.candidate.map(s=>s===newName?oldName:s)))throw Error('Intended field expanded beyond exact room47 correction');
 if(!native.samples.some(s=>s.room===47&&s.reply.includes('Junction Freeblewhizz & Whizbang')))throw Error('Missing native heading');
 if(raw.variants.candidate.objects.find(o=>o.id===47).name!=='Junction Freeblewhizz & Whizbang')throw Error('Raw proof mismatch');
 x.classification='INTENDED';x.review='Independent non-author zil_food_independent explicitly ACCEPTED room47 name field only: raw ZSCII38 and untouched native NORTH/NORTH/LOOK';
 x.proof={nativeSha256:crypto.createHash('sha256').update(fs.readFileSync(nativePath)).digest('hex'),rawSha256:crypto.createHash('sha256').update(fs.readFileSync(rawPath)).digest('hex'),storyDigest:raw.digest};
}
r.unresolved=r.differences.filter(x=>x.classification==='UNRESOLVED').length;
r.reviewScope='Generic paired classifier retained separately; only exact reviewed room47 ampersand correction added as INTENDED. No other difference waived.';
fs.writeFileSync(path.join(d,'gate-classification-reviewed.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({rowsEach:r.rowsEach,differences:r.differences.map(({game,key,classification})=>({game,key,classification})),unresolved:r.unresolved,coverageGaps:r.coverageGaps.length}));
