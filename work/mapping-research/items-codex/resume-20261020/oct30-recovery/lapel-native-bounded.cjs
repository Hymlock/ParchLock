// Bounded ordinary native lapel investigation. No VM/RAM/fact writes.
const fs=require('fs'),path=require('path'),Module=require('module');
const cfgF=process.argv[2],out=cfgF.replace(/\.config\.json$/,'.run.json');
if(fs.existsSync(out))throw Error('Refuse overwrite');
let driver=fs.readFileSync(__dirname+'/sherlock-pocket-native.cjs','utf8');
// Reuse its complete source pre/post binding and startup/prompt handling.
const anchor="const child=new Module(path.resolve(producer),module);";
if(!driver.includes(anchor))throw Error('Producer anchor changed');
driver=driver.replace(anchor,`
const rewrite=(a,b)=>{if(!source.includes(a))throw Error('Native producer anchor changed: '+a);source=source.replace(a,b);};
rewrite('const here=m.getUint16(m.getUint16(0x0c));','const rp=R.resolvePlayer(m);const here=R.enclosingRoom(m,rp.id);');
rewrite('for(const t of cfg.tests){',\`for(const t of cfg.tests){
 if(/^__/.test(t.cmd)){
  const d=out.tests.find(r=>r.cmd==='listen to girl');
  if(!d||!/heartbeat is incredibly (fast|slow)/i.test(d.text)){out.stopped='No current native diagnosis';break;}
  const fast=/incredibly fast/i.test(d.text),pill=fast?'orange pill':'yellow pill';
  t.cmd=t.cmd==='__OPEN_CURE_BOTTLE__'?'open '+(fast?'blue':'brown')+' bottle':t.cmd==='__TAKE_CURE_PILL__'?'take '+pill:'give '+pill+' to girl';
 }
\`);
rewrite('out.tests.push(row);',\`row.inventory=await p.evaluate(()=>({rows:(WorldModel.lastPayload?.inventory||[]).map(o=>({id:o.id,name:o.name,parent:o.parentId,suppressed:o.labelSuppressed===true})),labels:typeof EquipmentUI!=='undefined'?EquipmentUI.labelRows(WorldModel.lastPayload?.inventory||[]).map(o=>({id:o.id,name:o.name})):null,lapel:ZRamReader.children(ZRamProvider.getMem(),174).map(id=>({id,name:ZRamReader.shortName(ZRamProvider.getMem(),id),parent:ZRamReader.objectLinks(ZRamProvider.getMem(),id).parent}))}));
 out.tests.push(row);
 if(t.requireText&&!new RegExp(t.requireText,'i').test(text)){out.stopped='Native reply guard failed: '+t.cmd;break;}
\`);
source=source.replace("out.tier='Seeded fresh ordinary typed INVENTORY; no route replay, no VM/RAM/fact edits.';","out.tier='Seed0 ordinary typed short cab/cure/lapel commands; current reply-selected medicine; no VM/RAM/fact edits. Physical room from actual resolved player, not global0.';");
${anchor}`);
const m=new Module(path.resolve(__dirname+'/sherlock-pocket-native.cjs'),module);
m.filename=path.resolve(__dirname+'/sherlock-pocket-native.cjs');m.paths=module.paths;m._compile(driver,m.filename);
