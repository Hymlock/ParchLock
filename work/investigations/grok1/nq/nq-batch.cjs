// grok1 N? batch (operator standard 2026-10-24 9:52 ET): for each N? cell of the ledger, (1) source check against the
// historicalsource ZIL tree: mapped ZIL flag(s) carried by no <OBJECT>/<ROOM> FLAGS and absent from the compiled
// object-table match (2026-10-11-zil-source-flags.json); unmapped profile keys: candidate ZIL names grepped whole-source.
// (2) marks player-visible keys that additionally need the in-app check. Usage: node nq-batch.cjs <srcRoot> <ledger.md> <source-flags.json> [games,..]
const fs=require('fs'),path=require('path'),cp=require('child_process');
const [srcRoot,ledgerP,sfP,only]=process.argv.slice(2);
const SF=JSON.parse(fs.readFileSync(sfP,'utf8'));
const MAP={animate:['ACTORBIT','PERSONBIT'],absent:null,clothing:['WEARBIT'],wearable:['WEARBIT'],concealed:['INVISIBLE'],container:['CONTBIT'],door:['DOORBIT'],edible:['FOODBIT'],enterable:['VEHBIT'],general:null,light:['ONBIT'],lockable:null,locked:['LOCKEDBIT','LOCKED'],moved:['TOUCHBIT'],on:['ONBIT'],open:['OPENBIT'],isOpen:['OPENBIT'],openable:['OPENBIT','DOORBIT'],proper:['NARTICLEBIT'],scenery:['NDESCBIT'],scored:null,static:['TRYTAKEBIT'],supporter:['SURFACEBIT'],switchable:['LIGHTBIT'],talkable:['ACTORBIT','PERSONBIT'],transparent:['TRANSBIT'],visited:['TOUCHBIT'],workflag:null,worn:['WORNBIT'],male:null,female:['FEMALE','FEMALEBIT'],neuter:null,pluralname:['PLURALBIT'],takeable:['TAKEBIT']};
const CAND={absent:['ABSENTBIT'],general:['GENERALBIT'],lockable:['LOCKABLEBIT','LOCKBIT'],scored:['SCOREBIT','SCOREDBIT'],workflag:['WORKFLAG','WORKBIT'],male:['MALEBIT','MALE'],neuter:['NEUTERBIT','NEUTER']};
const VIS=new Set('animate talkable container supporter transparent door openable open isOpen locked lockable edible enterable switchable on light lightSource wearable clothing worn takeable static scenery concealed openCapability'.split(' '));
const L=fs.readFileSync(ledgerP,'utf8').split(/\r?\n/);const hdr=L.find(l=>l.startsWith('| Title')).split('|').map(s=>s.trim()).slice(2,-1);
const titles=Object.keys(SF);const out={};
for(const row of L.filter(l=>/^\| [A-Z]/.test(l)&&!l.startsWith('| Title'))){
  const c=row.split('|').map(s=>s.trim()).slice(1,-1);const short=c[0];const g=titles.find(t=>t.replace(/\.z\d\.js$/,'')===short);if(!g)continue;
  if(only&&!only.split(',').includes(short))continue;
  const repo=SF[g].repo,dir=path.join(srcRoot,repo);if(!fs.existsSync(dir)){out[short]={error:'no source '+repo};continue}
  const commit=cp.execSync('git rev-parse --short HEAD',{cwd:dir}).toString().trim();
  const files=fs.readdirSync(dir).filter(f=>/\.zil$/i.test(f));const text=files.map(f=>[f,fs.readFileSync(path.join(dir,f),'latin1')]);
  // FLAGS clauses of OBJECT/ROOM definitions, and any other occurrence (FSET/FSET?/FCLEAR, etc.)
  function scan(name){const re=new RegExp('(^|[^A-Z0-9?-])'+name.replace(/\?/g,'\\?')+'(?![A-Z0-9?-])','g');let inFlags=[],other=[],writes=[],comment=[];
    for(const [f,t] of text){const lines=t.split('\n');let curObj=null;lines.forEach((ln,i)=>{const m=ln.match(/^<(OBJECT|ROOM)\s+([A-Z0-9?-]+)/);if(m)curObj=m[2];
      if(!re.test(ln)){re.lastIndex=0;return}re.lastIndex=0;const loc=f+':'+(i+1);const pre=ln.slice(0,ln.search(re));re.lastIndex=0;
      if(/;/.test(pre)){comment.push(loc);return}
      if(new RegExp('<FSET\\s+[^>?]*,'+name+'>').test(ln)){writes.push(loc+' '+ln.trim().slice(0,80));return}
      if(/\(FLAGS\b/.test(ln)||(curObj&&/^\s+[A-Z]/.test(ln)&&!/^\s*</.test(ln)&&lines.slice(Math.max(0,i-3),i+1).some(x=>/\(FLAGS\b/.test(x))))inFlags.push(loc+' '+curObj);else other.push(loc+' '+ln.trim().slice(0,80))})}
    inFlags=inFlags.filter(x=>!/ GLOBAL-OBJECTS$/.test(x));return {inFlags,other,writes,comment}}
  const cells=[];
  c.slice(1).forEach((v,k)=>{if(v!=='N?')return;const key=hdr[k];const mapped=MAP[key];const names=mapped||CAND[key]||[];
    const res=names.map(n=>{const s=scan(n);const tbl=SF[g].flags&&SF[g].flags[n];return {flag:n,flagsCarriers:s.inFlags.length,flagsExamples:s.inFlags.slice(0,3),otherRefs:s.other.length,otherExamples:s.other.slice(0,3),writes:s.writes.length,writeExamples:s.writes.slice(0,3),commentedOut:s.comment.length,objectTable:tbl?{bit:tbl.bit,positives:tbl.positives}:null}});
    const carried=res.some(r=>r.flagsCarriers>0||(r.objectTable&&r.objectTable.positives>0));const written=res.some(r=>r.writes>0);
    const playerOnly=carried&&res.every(r=>r.flagsExamples.every(x=>/ (PROTAGONIST|PLAYER|ME|ADVENTURER)$/.test(x)));
    const referenced=res.some(r=>r.otherRefs>0);
    cells.push({key,kind:mapped?'mapped-absent':'unmapped',zilNames:names,visible:VIS.has(key),sourceCheck:(carried&&!playerOnly)?'NOT-NA: static object carrier':written?'NOT-NA: set at runtime (FSET)':playerOnly?'REVIEW: only the player object carries it':'PASS'+(referenced?' (read/FIND/syntax only, never carried or set)':''),inApp:VIS.has(key)?'PENDING':'not required (invisible)',res})});
  out[short]={game:g,repo,commit,source:'https://github.com/historicalsource/'+repo+'@'+commit,zilFiles:files.length,cells};
}
fs.writeFileSync(process.argv[6]||'/dev/stdout',JSON.stringify(out,null,1));
