const fs=require('fs'),path=require('path'),Module=require('module');
const f=path.resolve('zil-profile-ledger.js');let s=fs.readFileSync(f,'utf8');
const out=path.resolve('zil-titles/grok-lane-1031/wear-sub/ledger-now.md');
s=s.replace("fs.writeFileSync(path.join(D, '2026-10-16-zil-profile-ledger.md'), md)","fs.writeFileSync("+JSON.stringify(out)+", md)");
const m=new Module(f,null);m.filename=f;m.paths=Module._nodeModulePaths(path.dirname(f));m._compile(s,f);
const md=fs.readFileSync(out,'utf8');const lines=md.split('\n');const hdr=lines.find(l=>l.startsWith('| Title |')).split('|').map(x=>x.trim()).slice(2,-1);
for(const l of lines){if(!l.startsWith('| ')||l.startsWith('| Title')||l.startsWith('| key'))continue;const c=l.split('|').map(x=>x.trim());const t=c[1];c.slice(2,-1).forEach((v,i)=>{if(/^(U|N\?|B|L:U)$/.test(v))console.log(t,hdr[i],v)})}
