// Sherlock pocket R3 (codex pocket-R3-proposal; claude impl): inventoryLabelRule worn-holder-pocket.
// Native: I lists "Your pocket contains: a pound note" while coat 302 is worn; after REMOVE COAT it does not,
// yet EXAMINE POUND NOTE still works. So unworn = label withheld, scope row kept. Constructed X tier.
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const fixture=fs.readFileSync('harness/zil-light-forms.js','utf8');const prefix=fixture.split('const LIGHT=')[0];
const load=new Function('require',prefix+'\nreturn load;')(require);const T=load('Sherlock.z5.js');global.GrammarProvider=T.c.GrammarProvider;
const rows=()=>T.R.walkVisibleDescendants(T.mem,232,4,0.9);const row=id=>rows().find(o=>o.id===id);const lab=()=>rows().filter(o=>!o.labelSuppressed).map(o=>o.id);
// Rules must be built in the VM realm: the consumer's plain-object check rejects host-realm objects.
const clone=o=>o===undefined?undefined:vm.runInContext('JSON.parse('+JSON.stringify(JSON.stringify(o))+')',T.c);
let n=0;const check=(m,f)=>{f();n++;console.log('PASS '+m);};const F=T.F,keep=JSON.stringify(F.inventoryLabelRule);
T.parent(232,38);
const restore=()=>{F.inventoryLabelRule=clone(JSON.parse(keep));T.bit(302,34,1);T.parent(150,287);};
check('coat worn: note 150 labelled (parent 287); pocket/lapel labels withheld',()=>{restore();assert(lab().includes(150));assert(!lab().includes(287)&&!lab().includes(174));});
check('coat unworn: note row kept with labelSuppressed, parent 287 unchanged; coat unsuppressed',()=>{T.bit(302,34,0);const r=row(150);assert(r&&r.labelSuppressed===true&&r.parentId===287,JSON.stringify(r));assert(lab().includes(302));restore();});
check('rewear restores the label (no sticky state)',()=>{T.bit(302,34,0);rows();T.bit(302,34,1);assert(lab().includes(150));});
check('direct-held note (after TAKE) stays labelled while coat unworn',()=>{T.bit(302,34,0);T.parent(150,232);assert(lab().includes(150));restore();});
check('lapel 174 untouched by the pocket rule (unworn coat)',()=>{T.bit(302,34,0);const before=JSON.stringify(rows().filter(o=>o.id===174));F.inventoryLabelRule=undefined;const plain=JSON.stringify(rows().filter(o=>o.id===174));assert.equal(before,plain);restore();});
for(const [m,bad] of [['extra key',{kind:'worn-holder-pocket',holder:287,garment:302,wornAttribute:34,x:1}],['wrong kind',{kind:'x',holder:287,garment:302,wornAttribute:34}],['holder==garment',{kind:'worn-holder-pocket',holder:302,garment:302,wornAttribute:34}],['beyond frontier',{kind:'worn-holder-pocket',holder:65000,garment:302,wornAttribute:34}],['bit != wornAttribute',{kind:'worn-holder-pocket',holder:287,garment:302,wornAttribute:33}],['wrong garment',{kind:'worn-holder-pocket',holder:287,garment:188,wornAttribute:34}]])
  check('invalid rule ('+m+'): no suppression added',()=>{T.bit(302,34,0);F.inventoryLabelRule=clone(bad);const r=row(150);assert(!r||r.labelSuppressed!==true,JSON.stringify(r));restore();});
check('unresolved player (pristine parent 0): no suppression (fail closed)',()=>{T.bit(302,34,0);T.parent(232,0);const r=row(150);T.parent(232,38);assert(!r||r.labelSuppressed!==true);restore();});
check('WorldModel.correctPlayerId with coat unworn: suppressed note does not vote, holder stays 232',()=>{vm.runInContext(fs.readFileSync('js/WorldModel.js','utf8'),T.c);const WM=vm.runInContext('WorldModel',T.c);T.bit(302,34,0);const inv=rows();assert(inv.find(o=>o.id===150).labelSuppressed);assert.equal(Number(WM.correctPlayerId({playerId:232,inventory:inv})),232);const only=inv.filter(o=>o.id===150||o.id===302);assert.equal(Number(WM.correctPlayerId({playerId:232,inventory:only})),232,'minimal coat+note fixture');restore();});
check('malformed first-property pointer past staticMem: no suppression (codex R3 audit)',()=>{T.bit(302,34,0);const h=T.R.header(T.mem),first=T.R.objectBase(h,1),off=first+(h.version<=3?7:12),old=T.mem.getUint16(off);const bad=first+h.entrySize*Math.ceil((h.staticMem-first)/h.entrySize+2);T.mem.setUint16(off,bad);let r;try{r=T.R.inventoryLabelProjection(T.mem,232,[{id:150,parentId:287}],T.R.executableLayoutFacts(T.mem));}finally{T.mem.setUint16(off,old);}assert(!r[0].labelSuppressed);restore();});
check('childless held NODESC (rope 176) stays omitted',()=>{T.parent(176,232);T.bit(176,32,1);assert(!lab().includes(176));T.parent(176,0);});
console.log(n+' sherlock pocket checks passed');
