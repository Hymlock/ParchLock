const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const d=__dirname,source=path.join(require('os').tmpdir(),'hs-src/infidel/historicalsource-infidel-dca8235');
const bytes=Buffer.from(require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story('Infidel.z3.js'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const c=vm.createContext({console});vm.runInContext(fs.readFileSync('js/ZRamReader.js','utf8'),c);
const mem=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),R=c.ZRamReader,h=R.header(mem),first=h.objTable+h.defaultsWords*2,firstProperty=mem.getUint16(first+h.entrySize-2),count=(firstProperty-first)/h.entrySize;
if(!Number.isInteger(count)||count!==249)throw Error('Unexpected bounded domain');
const owners=[];for(let id=1;id<=count;id++){const o=R.objectLinks(mem,id);if(R.attr(o,7))owners.push({id,name:R.shortName(mem,id),parent:o.parent});}
const files=fs.readdirSync(source).filter(x=>/\.zil$/i.test(x)),manifest=[],hits=[];
for(const file of files){const b=fs.readFileSync(path.join(source,file));manifest.push({file,sha256:hash(b)});b.toString().split(/\r?\n/).forEach((text,i)=>{if(/FOODBIT/i.test(text))hits.push({file,line:i+1,text});});}
const p=path.join(d,'infidel-food-native-current.json'),native=JSON.parse(fs.readFileSync(p));
const summary=Object.entries(native).map(([key,v])=>({key,reply:v.nativeI,food:v.objs.find(x=>x.id===34),tests:v.ops.filter(x=>x[1]===7),menu:v.ui.find(x=>x.id===34)}));
if(owners.length!==1||owners[0].id!==34||!summary.some(x=>x.key.endsWith(':eat beef')&&x.tests.some(t=>t[0]===34&&t[2]===1)&&x.food.parent===0)||!summary.some(x=>x.key.endsWith(':eat shovel')&&x.tests.some(t=>t[0]===33&&t[2]===0)))throw Error('Native proof assertions');
fs.writeFileSync(path.join(d,'infidel-food-evidence.json'),JSON.stringify({scope:'Research qualification of missing edible7, not production integration or title closure',assetSha256:hash(fs.readFileSync('games/Infidel.z3.js')),storySha256:hash(bytes),version:bytes[0],release:mem.getUint16(2),serial:bytes.subarray(18,24).toString(),domain:{first,firstProperty,count,bit:7,owners},source:{cache:source,revisionPrefix:'dca8235',exactBuildUnproven:true,files:manifest,hits},captureSha256:hash(fs.readFileSync(p)),routeSha256:hash(fs.readFileSync(path.join(d,'infidel-food-original-route.json'))),native:summary,limits:'Current native consumer lacks edible metadata; proposed data-only field needs independent design acceptance, candidate consumer and separate gates after current shared candidate. FOODBIT is not consumed state.'},null,2)+'\n');
console.log('Infidel current sole-owner/native positive+negative assertions PASS; source files '+files.length);
