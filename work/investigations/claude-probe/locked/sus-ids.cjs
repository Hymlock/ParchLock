// list Suspect object ids by short name (helper for plan ids)
const fs=require('fs'),vm=require('vm'),crypto=require('crypto');const an=require(process.cwd()+'/work/investigations/zil-attr-analyzer.js');
const bytes=Uint8Array.from(an.story('Suspect.z3.js')),mem=new DataView(bytes.buffer),digest=crypto.createHash('sha256').update(bytes).digest('hex');
const c=vm.createContext({console,window:{},ModuleLibrary:{currentExecutableDigest:()=>digest,currentExecutableIdentity:()=>({digest,header:Array.from(bytes.slice(0,28))})},ZRamProvider:{getMem:()=>mem}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
for(let i=1;i<=255;i++){const n=c.ZRamReader.shortName(mem,i);if(/chest|trunk|door|garage/i.test(n))console.log(i,n,c.ZRamReader.attr(c.ZRamReader.objectLinks(mem,i),17)?1:0)}
