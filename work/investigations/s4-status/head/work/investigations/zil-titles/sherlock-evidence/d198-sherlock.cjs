const fs=require('fs'),path=require('path'),vm=require('vm');const root=process.argv[2];
const sb={console,window:{},setTimeout:()=>0};vm.createContext(sb);
for(const f of ['js/ZRamReader.js','js/GrammarProvider.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sb,{filename:f});
const raw=fs.readFileSync(path.join(root,'games/Sherlock.z5.js'),'utf8');const b=Buffer.from(raw.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]/)[1].replace(/\s+/g,''),'base64');
const r=sb.GrammarProvider.decodeD198(new Uint8Array(b));console.log(r.classification,'|',r.evidence,'|',r.reason||r.rejectReason||'');
