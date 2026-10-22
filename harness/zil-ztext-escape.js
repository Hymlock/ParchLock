// Actual original Sherlock vectors plus constructed packed-text boundary controls.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
const c=vm.createContext({console});vm.runInContext(fs.readFileSync(process.env.ZTEXT_SOURCE||'js/ZRamReader.js','utf8'),c);const R=c.ZRamReader;
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
const original=new DataView(Uint8Array.from(story('Sherlock.z5.js')).buffer);
for(const [addr,expected]of [[21410,'$refre'],[21418,'$ver'],[21426,'$verif']])check('original Sherlock dictionary '+addr,()=>assert.equal(R.decodeZsc(original,addr,3),expected));
function packed(zs,maxWords){const mem=new Uint8Array(512);mem[0]=5;const data=zs.slice();while(data.length%3)data.push(5);for(let i=0;i<data.length;i+=3){const w=(data[i]<<10)|(data[i+1]<<5)|data[i+2]|(i+3===data.length?0x8000:0);mem[128+i/3*2]=w>>8;mem[129+i/3*2]=w&255;}return {mem,raw:()=>R._decodeZscRaw(mem,128,maxWords||data.length/3)};}
for(const [units,want]of [[[5,6,1,4,6],'$a'],[[6,5,6,1,4,7],'a$b'],[[5,6,0,0,6],'a'],[[5,6,0,13,6],'\na'],[[5,6,0,31,6],'a'],[[5,6,1,0,6],' a'],[[5,6,3,30,6],'~a'],[[5,6,3,31,6],'a'],[[5,6,4,27,6],'a'],[[5,6,1,4,5,6,1,4,6],'$$a']])check('packed escape '+units.join(','),()=>assert.equal(packed(units).raw(),want));
check('final-word incomplete escape emits nothing',()=>assert.equal(packed([6,5,6]).raw(),'a'));
check('final-word single payload emits nothing',()=>assert.equal(packed([5,6,1]).raw(),''));
check('maxWords does not read escape continuation',()=>assert.equal(packed([5,6,1,4,6,6],1).raw(),''));
check('ordinary alphabet and shift unchanged',()=>assert.equal(packed([6,7,8,4,6,5,8]).raw(),'abcA0'));
check('D143 raw abbreviation trailing space survives recursive decode',()=>{const x=packed([1,0,7]);x.mem[24]=0;x.mem[25]=64;x.mem[64]=0;x.mem[65]=96;const tail=packed([6,0,5]);x.mem[192]=tail.mem[128];x.mem[193]=tail.mem[129];assert.equal(x.raw(),'a b');assert.equal(R.decodeZsc(x.mem,128,1),'a b');});
check('D143 public normalization runs once',()=>{const x=packed([0,6,0,0,7,0]);assert.equal(x.raw(),' a  b ');assert.equal(R.decodeZsc(x.mem,128,2),'a b');});
for(const [game,sentinel,rooms]of [['WiR2.zblorb.js',313872,[[64,'Grim Hallway'],[76,'Office on Floor Fifty-One']]],['TheWarblersNest.zblorb.js',313232,[[51,'Among the reeds']]]]){
 const mem=new DataView(Uint8Array.from(story(game)).buffer);
 check(game+' exact compiler sentinel',()=>assert.equal(R.decodeZsc(mem,sentinel,9),'<unknown attribute>'));
 check(game+' declared attribute/property tables survive correct text',()=>{assert(R.informAttributeNames(mem));assert(R.informPropertyNames(mem).names.short_name);});
 for(const [id,name]of rooms)check(game+' actual direct room name '+id,()=>assert.equal(R.storyShortName(mem,id),name));
 check(game+' malformed non-sentinel remains rejected (constructed decoder control)',()=>{const fresh=new DataView(mem.buffer.slice(0)),decode=R.decodeZsc;R.decodeZsc=(m,a,n)=>{const text=decode(m,a,n);return text==='<unknown attribute>'?'<unknown property>':text;};try{assert.equal(R.informAttributeNames(fresh),null);assert.equal(R.informPropertyNames(fresh),null);}finally{R.decodeZsc=decode;}});
}
check('dictionary complete printable escape keeps lexical text',()=>{const x=packed([6,5,6,1,4]);assert.equal(R.decodeDictionaryText(x.mem,128,3),'a$');});
check('dictionary supported null no-op remains supported',()=>{const x=packed([6,5,6,0,0]);assert.equal(R.decodeDictionaryText(x.mem,128,2),'a');});
check('dictionary incomplete escape cannot own standalone prefix',()=>{const x=packed([6,5,6]);assert.equal(R.decodeZsc(x.mem,128,1),'a');assert.equal(R.decodeDictionaryText(x.mem,128,1),'');});
check('dictionary unsupported completed escape cannot own prefix',()=>{const x=packed([6,5,6,4,27]);assert.equal(R.decodeZsc(x.mem,128,2),'a');assert.equal(R.decodeDictionaryText(x.mem,128,2),'');});
check('dictionary ordinary full-width word truncation remains valid',()=>{const x=packed([6,7,8,9,10,11,12,13,14]);assert.equal(R.decodeDictionaryText(x.mem,128,3),'abcdefghi');});
check('dictionary recursive incomplete escape propagates failure',()=>{const x=packed([1,0,7]);x.mem[24]=0;x.mem[25]=64;x.mem[64]=0;x.mem[65]=96;const tail=packed([6,5,6]);x.mem[192]=tail.mem[128];x.mem[193]=tail.mem[129];assert.equal(R.decodeDictionaryText(x.mem,128,1),'');assert.equal(R.decodeZsc(x.mem,128,1),'ab');});
const acorn=new DataView(Uint8Array.from(story('acorncourt.z5.js')).buffer);
vm.runInContext(fs.readFileSync('js/GrammarProvider.js','utf8'),c);
check('original Acorn incomplete dictionary entry is prose prefix only',()=>{assert.equal(R.decodeZsc(acorn,10687,3),'tennis');assert.equal(R.decodeDictionaryText(acorn,10687,3),'');});
check('standalone tennis has a different encoded parser key',()=>{const encoded=Array.from(R.encodeDictWord(acorn,'tennis'));assert.notDeepEqual(encoded,Array.from(new Uint8Array(acorn.buffer,10687,6)));});
check('Acorn valid ball alias survives without invented tennis alias',()=>{const words=Array.from(R.parserWordsAny(acorn,33));assert(words.includes('ball'));assert(!words.includes('tennis'));assert(!words.includes('tennisb'));assert(!R.hasDictionaryWord(acorn,'tennis'));});
check('both dictionary owners reject prefix while retaining raw grammar entry',()=>{const h=R.header(acorn),dict=c.GrammarProvider._d198RawDictionary(acorn,h,acorn.byteLength),entry=dict.byAddress[10687];assert(entry);assert.equal(entry.word,'');assert.equal(dict.entries.length,(R.u16(acorn,h.dict+1+R.u8(acorn,h.dict)+1)));assert(!R.parseDictionary(acorn).words.tennis);assert(entry.data.length);});
console.log(checks+' Z-text escape checks passed');
