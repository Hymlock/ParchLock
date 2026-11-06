// Bounded offline compiled/source census, not native travel or candidate acceptance.
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const story=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js').story;
const bytes=Uint8Array.from(story('Moonmist.z3.js')),mem=new DataView(bytes.buffer),c=vm.createContext({console});
const reader=fs.readFileSync('js/ZRamReader.js','utf8');vm.runInContext(reader,c);const R=c.ZRamReader,h=R.header(mem),heuristicObjectCount=R.objectCount(mem,h),first=R.objectBase(h,1),firstProperty=R.u16(mem,first+7),count=(firstProperty-first)/h.entrySize;
if(count!==253)throw Error('Compiled domain changed');
const rows=[];for(let id=1;id<=count;id++){const o=R.objectLinks(mem,id);rows.push({id,name:R.shortName(mem,id),parent:o.parent,bits:[21,29].filter(n=>R.attr(o,n)),properties:R.listProps(mem,id).map(p=>p.num)});}
const sourceDir='C:/Users/hymlo/AppData/Local/Temp/hs-src/moonmist/historicalsource-moonmist-c85885f';
const scanner=fs.readFileSync('work/investigations/zil-titles/source-search/zilscan.js','utf8'),s=vm.createContext({require,process});vm.runInContext(scanner.slice(0,scanner.indexOf('const out = []')),s);
const sourceDeclarations=[],warnings=[],sourceHashes={};
for(const file of fs.readdirSync(sourceDir).filter(x=>x.endsWith('.zil')).sort()){
 const raw=fs.readFileSync(path.join(sourceDir,file)),parsed=s.parse(raw.toString('latin1'));sourceHashes[file]=crypto.createHash('sha256').update(raw).digest('hex');if(parsed.unbalanced)warnings.push({file,unbalanced:parsed.unbalanced});
 for(const form of parsed.top){if(form.type!=='form'||form.open!=='<')continue;const head=form.items[0]?.atom;if(!['ROOM','OBJECT'].includes(head))continue;
 const inForm=form.items.find(x=>x.type==='form'&&x.open==='('&&x.items[0]?.atom==='IN'),flagForm=form.items.find(x=>x.type==='form'&&x.open==='('&&x.items[0]?.atom==='FLAGS');
 sourceDeclarations.push({file,line:form.line,kind:head,name:form.items[1]?.atom,in:inForm?.items[1]?.atom||null,flags:flagForm?.items.slice(1).filter(x=>x.type==='atom').map(x=>x.atom)||[]});
 }
}
const root=rows.find(x=>x.id===37),rootChildren=rows.filter(x=>x.parent===37),overloaded=rows.filter(x=>x.bits.length);
const report={scope:'Original bounded253-object boot domain plus comment-aware historical-source declarations; not proof of all dynamic room mutations or exact recompilation',digest:crypto.createHash('sha256').update(bytes).digest('hex'),readerSha256:crypto.createHash('sha256').update(reader).digest('hex'),count,first,firstProperty,heuristicObjectCount,root,rootChildren,overloadedInside:overloaded.filter(x=>x.parent===37),overloadedOutside:overloaded.filter(x=>x.parent!==37),source:{revision:'c85885f',sourceHashes,warnings,roomDeclarations:sourceDeclarations.filter(x=>x.kind==='ROOM'),inRooms:sourceDeclarations.filter(x=>x.in==='ROOMS'),outsideRoomFlagCarriers:sourceDeclarations.filter(x=>x.in!=='ROOMS'&&x.flags.some(f=>f==='WEARBIT'||f==='WORNBIT'))},limits:'Common parent and authored declarations are corroboration; no name-based ID matching, title closure or candidate map-safety claim. Existing heuristic objectCount is recorded separately, never used as bounded census.'};
fs.writeFileSync(path.join(__dirname,'moonmist-room-root-census.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({count,rootChildren:rootChildren.length,overloadedInside:report.overloadedInside.map(x=>x.id),overloadedOutside:report.overloadedOutside.map(x=>x.id),sourceRooms:report.source.roomDeclarations.length,sourceInRooms:report.source.inRooms.length,warnings}));
