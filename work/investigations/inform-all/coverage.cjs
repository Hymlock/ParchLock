// Flag-mapping coverage for ALL Z-machine games (309 minus Glulx), split by the app's own D198 classification.
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');const root=process.cwd();
const story=require(root+'/work/investigations/zil-attr-analyzer.js').story;
const FLAGS=['container','open','openable','supporter','animate','worn','light'];
const out={zil:[],nonzil:[]};
for(const file of fs.readdirSync(root+'/games').filter(f=>/\.(z[1-8]|zblorb)\.js$/.test(f))){
  let bytes;try{bytes=Uint8Array.from(story(file));}catch(e){out.nonzil.push({file,err:'load '+e.message});continue;}
  const mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex'),header=Array.from(bytes.slice(0,28));
  const c=vm.createContext({console:{log(){},warn(){}},window:{},document:{readyState:'loading',addEventListener(){}},UndoRestoreSync:{generation:1},
    ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header})},ZRamProvider:{getMem:()=>mem}});
  try{for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync(root+'/js/'+f+'.js','utf8'),c);}catch(e){out.nonzil.push({file,err:'ctx '+e.message});continue;}
  let g=null;try{g=c.GrammarProvider.decodeD198(mem);}catch(e){}
  const zil=!!(g&&g.classification==='confirmed-zil-family');
  const names=c.ZRamReader.informAttributeNames(mem),F=c.ModuleStatFactsClaude[digest];
  const mapped=[],unmapped=[];
  for(const f of FLAGS){let src=null;
    if(names&&Object.prototype.hasOwnProperty.call(names.bits,f))src='names';
    else if(f==='worn'?(F&&Number.isInteger(F.wornAttribute)):(F&&F.attributeMap&&Object.prototype.hasOwnProperty.call(F.attributeMap,f)))src='fact';
    let got=null;try{got=c.AttributeSchema.bitFor(f,mem);}catch(e){}
    (src?mapped:unmapped).push(f+(src?'':(got!=null?'(runtime:'+got+')':'')));}
  (zil?out.zil:out.nonzil).push({file,v:bytes[0],names:!!names,fact:!!F,mapped:mapped.length,unmapped});
}
const full=out.nonzil.filter(r=>!r.err&&!r.unmapped.length),part=out.nonzil.filter(r=>!r.err&&r.unmapped.length&&r.mapped),none=out.nonzil.filter(r=>!r.err&&!r.mapped),err=out.nonzil.filter(r=>r.err);
fs.writeFileSync(root+'/work/investigations/inform-all/coverage.json',JSON.stringify(out,null,1));
console.log('ZIL',out.zil.length,'nonZIL',out.nonzil.length,'| complete',full.length,'partial',part.length,'none',none.length,'err',err.length);
console.log('names-table titles',out.nonzil.filter(r=>r.names).length,'fact titles',out.nonzil.filter(r=>r.fact).length);
