// Research-only observation of unchanged decoder; no product files written.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let reader=fs.readFileSync('js/ZRamReader.js','utf8'),grammar=fs.readFileSync('js/GrammarProvider.js','utf8');
let source=grammar.replace('entryLen < textBytes + 3','entryLen < textBytes + 2');
const anchor='        var prepByIndex = {}, prepositions = [];';
if(source.split(anchor).length!==2)throw Error('anchor drift');
source=source.replace(anchor,'        GrammarProvider.boundary={grammarEnd,actionBase,actionCount,maxAction,prepBase,prepCount,prepType,prepEntrySize,syntaxByIndex,pointers};\n'+anchor);
let c={};vm.createContext(c);vm.runInContext(reader,c);vm.runInContext(source,c);
let bytes;vm.runInNewContext(fs.readFileSync('games/Sherlock.z5.js','utf8'),{processBase64Zcode:s=>bytes=new Uint8Array(Buffer.from(s,'base64'))});
let h=c.ZRamReader.header(bytes),d=c.GrammarProvider._d198RawDictionary(bytes,h,bytes.length);
const result=c.GrammarProvider._d198InfocomGrammar(bytes,h,bytes.length,d),q=c.GrammarProvider.boundary,u=a=>(bytes[a]<<8)|bytes[a+1];
function evaluate(size){let seen=new Set(),rows=[],firstFailure=null;for(let i=0;i<q.prepCount;i++){let a=q.prepBase+2+i*size,da=u(a),entry=d.byAddress[da],ix=size===4?u(a+2):bytes[a+2];let errors=[];if(!entry?.word)errors.push('dictionary-crosslink');if(ix<128)errors.push('index-below-128');if(seen.has(ix))errors.push('duplicate-index');seen.add(ix);let row={i,address:a,raw:Array.from(bytes.slice(a,a+size)),dictionaryAddress:da,word:entry?.word,index:ix,errors};rows.push(row);if(errors.length&&!firstFailure)firstFailure=row;}let required=[...new Set(q.syntaxByIndex.flatMap(lines=>lines.flatMap(l=>l.prepIndices)))].sort((a,b)=>a-b);return{entrySize:size,end:q.prepBase+2+size*q.prepCount,allChecksPass:rows.every(r=>!r.errors.length),dictionaryCrosslinksValid:rows.every(r=>!r.errors.includes("dictionary-crosslink")),indicesInRange:rows.every(r=>r.index>=128),indicesUnique:rows.every(r=>!r.errors.includes("duplicate-index")),required,unmappedRequired:required.filter(x=>!seen.has(x)),firstFailure,rows};}
function routines(base){let invalid=[];for(let i=0;i<q.actionCount;i++){let packed=u(base+2*i),addr=packed*4,locals=bytes[addr];if(packed&&(addr<h.himem||addr>=bytes.length||locals>15))invalid.push({i,packed,addr,locals});}return{base,end:base+q.actionCount*2,invalid};}
const report={scope:'Research only: dictionary minimum relaxation permits boundary observation, not classifier acceptance',hashes:{reader:hash(reader),grammar:hash(grammar),story:hash(bytes)},header:h,decoderReturned:!!result,ranges:{grammarRoot:h.staticMem,grammarEnd:q.grammarEnd,lastPointer:q.pointers.at(-1),actionBase:q.actionBase,actionCount:q.actionCount,maxAction:q.maxAction,prepBase:q.prepBase,prepCount:q.prepCount,selectedPrepSize:q.prepEntrySize},actions:routines(q.actionBase),preactions:routines(q.actionBase+q.actionCount*2),alternatives:[evaluate(3),evaluate(4)]};
fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,alternatives:report.alternatives.map(({rows,...rest})=>rest)},null,2));
