// Fresh ordinary INVENTORY countercheck; no route replay or VM writes.
const fs=require('fs'),path=require('path'),Module=require('module'),crypto=require('crypto');
const cfgF=process.argv[2],out=cfgF.replace(/\.config\.json$/,'.run.json');if(fs.existsSync(out))throw Error('Refuse overwrite');
const files=fs.readdirSync('js').filter(n=>n.endsWith('.js')).map(n=>'js/'+n);
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),pre=Object.fromEntries(files.map(f=>[f,sha(f)]));
fs.writeFileSync(out+'.pre.json',JSON.stringify(pre,null,2),{flag:'wx'});
const producer='work/investigations/zil-titles/lightsource-native/probe.cjs';let source=fs.readFileSync(producer,'utf8');
source=source.replace("await p.keyboard.press('Space')","await p.keyboard.press(await p.evaluate(()=>/press Y or N/i.test(Array.from(document.querySelectorAll('#windowport .BufferWindow .BufferLine')).slice(-3).map(l=>l.textContent).join(' ')))?'n':'Space')");
source=source.replace('  for(const t of cfg.tests){',`out.initialMessage=await p.evaluate(()=>{const text=document.getElementById('dialog')?.innerText||'';if(typeof Message!=='undefined'&&Message.IsOpen)Message.Hide();return text;});\n  for(const t of cfg.tests){`);
source=source.replace(' const of=cfgF.replace',`out.reader=await p.evaluate(()=>{const m=ZRamProvider.getMem(),R=ZRamReader,pl=R.resolvePlayer(m);return{player:pl.id,room:R.enclosingRoom(m,pl.id),objects:[302,287,150].map(id=>{const raw=R.objectLinks(m,id);return{id,name:R.shortName(m,id),parent:raw.parent,hidden:R.attr(raw,32),worn:R.attr(raw,34)}}),payload:(WorldModel.lastPayload?.inventory||[]).map(o=>({id:o.id,name:o.name,parent:o.parentId}))};});out.sourcePre=${JSON.stringify(pre)};out.sourcePost=Object.fromEntries(${JSON.stringify(files)}.map(f=>[f,sha(f)]));out.sourceStable=JSON.stringify(out.sourcePre)===JSON.stringify(out.sourcePost);out.tier='Seeded fresh ordinary typed INVENTORY; no route replay, no VM/RAM/fact edits.'; const of=cfgF.replace`);
const child=new Module(path.resolve(producer),module);child.filename=path.resolve(producer);child.paths=module.paths;child._compile(source,child.filename);
