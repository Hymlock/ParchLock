const fs=require('fs'),D=__dirname,crypto=require('crypto'),A=require('../../zil-attr-analyzer.js');
const F=require('../../2026-10-11-zil-source-flags.json');
const T={
 'Zork2-TheWizardofFrobozz.z3.js':{R1:'Foot Bridge (228)',R1obj:'bridge',R2:'Great Cavern (227)',R2obj:'mosses',extra:'Narrow Tunnel 229 stream positive; Shallow Ford 226 water positive, mosses refused',dark:'Dark Tunnel (225): lit=false, no GLOBAL prop, "It is pitch black"',status:'CONFIRMED',caveat:'INVISIBLE bit 9 is not exact in source-flags (tp6 fn1)'},
 'Sorcerer.z3.js':{R1:'Hallway (67)',R1obj:'heavy wooden door',R2:'Lobby (18)',R2obj:'road',extra:'Hallway 50 doorway positive; Your Quarters bed positive after FROTZ BOOK (room lit bit clear, lit by carried source)',dark:'Your Quarters (17): lit=false, before FROTZ "examine bed" => "It\'s too dark to see!"',status:'CONFIRMED',caveat:'Lobby/Cellar/Turret list stairs 177 whose parent is 31, not holder 55'},
 'Infidel.z3.js':{R1:'Your Tent (71)',R1obj:'flap',R2:'River Bank (82)',R2obj:'quantity of water ("water")',extra:'Outside Supply Tent 68 thicket positive; NOTE thicket out of its rooms replies "I see no thickets here." and takes a turn (custom handler/other resolver), so thicket is NOT used as a negative (run-thicket.json)',dark:'not reached (dark rooms are tomb/barge, far)',status:'CONFIRMED'},
 'HollywoodHijinx.z3.js':{R1:'Front Porch (185)',R1obj:'oak door',R2:'Southwest Junction (31)',R2obj:"Aunt Hildegarde's garden (\"garden\")",extra:'',dark:'not reached cheaply (Foyer route needs key; skipped)',status:'CONFIRMED'}};
for(const s in T){const st=JSON.parse(fs.readFileSync(D+'/'+s+'.static.json'));const run=JSON.parse(fs.readFileSync(D+'/'+s+'.run.json'));
 const prop=JSON.parse(fs.readFileSync(D+'/../../r4-grok2/localscope/'+s+'.json'));
 const exe=crypto.createHash('sha256').update(A.story(s)).digest('hex');
 const fl=F[s].flags;const pick=k=>{const{examples,...r}=fl[k];return r};
 fs.writeFileSync(D+'/'+s.replace(/\.z3\.js$/,'')+'.json',JSON.stringify({story:s,executableDigest:exe,proposalDigest:prop.digest,digestMatch:exe===prop.digest,fileSha256:run.sha256,
  localScope:prop.localScope,sourceFlags:{INVISIBLE:pick('INVISIBLE'),ONBIT:pick('ONBIT')},summary:T[s],
  holderChildren:st.kids,roomsListingProperty:st.rooms,commands:run.log.filter(x=>x.cmd).length,log:run.log},null,1));
 console.log(s,exe===prop.digest,run.log.filter(x=>x.cmd).length);}
