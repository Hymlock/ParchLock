// grok inform-plan inventory: read-only. Run from repo root: node work/investigations/zil-titles/grok-lane-1031/inform-plan/inventory.cjs
const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const root=process.cwd();
const md=fs.readFileSync('GAMES_INCLUDED.md','utf8');
const rows=[];for(const line of md.split(/\r?\n/)){const m=line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*`games\/([^`]+)`\s*\|/);if(m)rows.push({title:m[1],author:m[2],licence:m[3],file:m[4]});}
const c=vm.createContext({console,setTimeout,clearTimeout,window:{},document:{readyState:'loading',addEventListener(){}}});
for(const f of ['ModuleStatFactsClaude','ZRamReader','GrammarProvider','AttributeSchema'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);
const Z=vm.runInContext('ZRamReader',c),A=vm.runInContext('AttributeSchema',c),F=vm.runInContext('ModuleStatFactsClaude',c);
const PROF=A.PROFILE;const profByBit={};for(const k of Object.keys(PROF)){const n=PROF[k];if(typeof n==='number'&&!(n in profByBit)&&!['wearable','isOpen','non_floating'].includes(k))profByBit[n]=k;}
const STD=['animate','absent','clothing','concealed','container','door','edible','enterable','general','light','lockable','locked','moved','on','open','openable','proper','scenery','scored','static','supporter','switchable','talkable','transparent','visited','workflag','worn','male','female','neuter','pluralname'];
function bytesOf(file){const raw=fs.readFileSync(path.join(root,'games',file),'utf8');const m=raw.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/)||raw.match(/['"]([A-Za-z0-9+\/=\s]{2000,})['"]/);if(!m)return null;const b=Buffer.from(m[1].replace(/\s+/g,''),'base64');return b;}
const out=[];
for(const r of rows){
  const o=Object.assign({},r,{ext:r.file.replace(/^.*?\.(z\d|zblorb|gblorb|ulx)\.js$/,'$1')});
  try{
    const b=bytesOf(r.file);if(!b){o.err='no payload';out.push(o);continue;}
    let story=b;
    if(b.slice(0,4).toString()==='FORM'){const kz=b.indexOf(Buffer.from('ZCOD')),kg=b.indexOf(Buffer.from('GLUL'));if(kz>=0)story=b.subarray(kz+8,kz+8+b.readUInt32BE(kz+4));else if(kg>=0){story=b.subarray(kg+8,kg+8+b.readUInt32BE(kg+4));}}
    o.digest=crypto.createHash('sha256').update(story).digest('hex');
    if(story.slice(0,4).toString()==='Glul'){o.vm='glulx';o.hasFacts=!!F[o.digest];out.push(o);continue;}
    const mem=new DataView(Uint8Array.from(story).buffer);
    o.vm='z'+story[0];o.release=story.readUInt16BE(2);o.serial=story.slice(0x12,0x18).toString('latin1');o.compiler=story.slice(0x3c,0x40).toString('latin1').replace(/[^\x20-\x7e]/g,'.');
    o.informCompiled=!!Z.isInformCompiled(mem);
    let fam=null;try{fam=A._familyOf(mem);}catch(e){}o.family=fam&&fam.classification||null;
    const names=Z.informAttributeNames(mem);
    if(names&&names.bits){o.nameTable=true;const bits=names.bits;o.namedCount=Object.keys(bits).length;
      const mism=[];for(let i=0;i<STD.length;i++){const nm=STD[i];if(bits[nm]!==i)mism.push(nm+':'+(bits[nm]===undefined?'absent':bits[nm])+'!='+i);}
      o.stdOrder=mism.length===0?'exact':(mism.every(x=>/absent/.test(x))?'subset':'shifted');o.mismatch=mism;
      o.extraNames=Object.keys(bits).filter(k=>!STD.includes(k)).map(k=>k+':'+bits[k]);    } else o.nameTable=false;
    o.hasFacts=!!F[o.digest];
  }catch(e){o.err=String(e&&e.message||e).slice(0,160);}
  out.push(o);
}
fs.writeFileSync(path.join(__dirname,'inventory.json'),JSON.stringify(out,null,1));
const tally={};for(const o of out){const k=[o.vm,o.ext,o.nameTable?'names:'+o.stdOrder:'nonames',o.family||'-'].join(' ');tally[k]=(tally[k]||0)+1;}
console.log('rows',rows.length);console.log(JSON.stringify(tally,null,1));
for(const o of out)console.log([o.title,o.file,o.vm,o.release+'.'+o.serial,o.compiler,o.family,o.nameTable?o.stdOrder:'nonames',o.hasFacts?'FACTS':'',o.err||''].join(' | '));

