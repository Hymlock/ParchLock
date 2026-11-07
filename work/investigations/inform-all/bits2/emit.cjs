// Emits per-title JSON + SUMMARY.md from raw.json and the layouts inferred in bits.cjs analysis.
const fs=require('fs');const r=require('./raw.json');
const L={animate:0,clothing:1,wearable:1,concealed:2,container:3,door:4,edible:5,enterable:6,light:9,lockable:10,locked:11,open:14,isOpen:14,openable:15,proper:16,scenery:17,static:19,supporter:20,switchable:21,transparent:23,worn:26};
const shift=(m,f)=>Object.fromEntries(Object.entries(m).map(([k,v])=>[k,f(k,v)]));
const TOY=shift(L,(k,v)=>v+(v>=4?1:0)); // extra attr inserted after container
const WIN=shift(TOY,(k,v)=>v+1);        // TOY + one game attribute at 0
const TH=shift(L,(k,v)=>v+2);           // two game attributes before library
const P={clothing:2,concealed:3,container:4,door:5,edible:6,light:9,lockable:10,locked:11,open:14,openable:15,supporter:20,worn:26};
const ev={
 L:'anchors compass=concealed 2, walls=scenery 17, yourself 0,2,16,23 (animate,concealed,proper,transparent), rooms light 9; doors carry 4+15(+10,11); containers 3+15 or 3+14; hats/clothes 1; food 5; supporters 20. Bits 1..8 are PROFILE-1 (no `absent` at 1, an extra attr at 8); 9..23 equal PROFILE.',
 TOY:'compass 2, walls 18, yourself 0,2,17,24, Toyshop room 10; oak chest 3,11,12,16,20 (container,lockable,locked,openable,static); hamper 3,15; baguette/mushroom/egg 6. = L with one extra attr after container (bits>=4 +1). door/clothing/supporter not directly seen (dress 2,27 is odd; 27 likely worn).',
 WIN:'compass 3, walls 19, yourself 1,3,18,25, rooms 11 = TOY+1 (game attr at 0). windhal1 doors 6,17,19 (door,openable,scenery); tinder box 4,17; basket 4,8,16,21,25; counter 19,22; cloak 2. tube: dispensing tray 4,16,19; hat/cap 2; chocolate 7; tramp 1.',
 TH:'compass 4, walls 19, yourself 2,4,18,25, rooms 11 = L+2. trapdoor 6,16,17,21 (door,open,openable,static); iron door 6,12,13,17,19 (door,lockable,locked,openable,scenery); bin/locker 5,17,21 (container,openable,static); beds 8,21,22 (enterable,static,supporter); ring/gas mask 3.'};
const T={'Enemies.z8':'L','Gumshoe.z5':'L','SoFar.z8':'L','break-in.z5':'L','godot.z5':'L','heist.z8':'L','library.z5':'L','lists.z5':'L','lost.z5':'L','magic-toyshop.z5':'TOY','minster.z5':'L','spirit.z5':'L','sutwin.z5':null,'theatre.z5':'TH','tube.z5':'WIN','wedding.z5':'L','windhal1.z8':'WIN'};
const maps={L,TOY,WIN,TH};
const conf={L:'high',TOY:'medium',WIN:'high (windhal1) / medium (tube, few objects)',TH:'high'};
const desc={L:'SHIFTED (low block -1)',TOY:'SHIFTED (container..3 as L; door+ +1 vs L)',WIN:'SHIFTED (TOY +1)',TH:'SHIFTED by +2 vs L'};
const PAT=/door|gate|hatch|box|bag|chest|cupboard|drawer|case|cabinet|crate|locker|lamp|lantern|torch|candle|hat|cloak|coat|cap|ring|uniform|dress|egg|cake|sweet|bun|chocolate|table|desk|bed|shelf|counter|compass|yourself|wall$/i;
let rows=[];
for(const [t,k] of Object.entries(T)){const o=r[t].objs;const out={title:t,sha256:r[t].sha,objects:o.length,layout:k,verdict:k?desc[k]:'NO EXEMPLARS',confidence:k?conf[k]:'n/a',
 evidence:k?ev[k]:'Object table has class objects (Class/Object/Routine) and no attribute bits set on any object; nothing to infer. Flags must come from elsewhere.',
 proposedAttributeMap:k?Object.fromEntries(['door','open','isOpen','openable','container','supporter','light','edible','clothing','wearable','worn','lockable','locked','concealed','animate','scenery','static','enterable','transparent'].map(x=>[x,maps[k][x]])):null,
 bitEvidence:k?{door:'doors',openable:'doors+containers',open:'open containers (bag/jar/basket/tray)',container:'containers',supporter:'tables/desks',light:'rooms (lit)',edible:k==='L'?'food (carrot,sweet,cake,pizza)':'food',clothing:'hats/clothes',lockable:'locked doors',locked:'locked doors',worn:'NOT observed statically; inferred from library order (PROFILE 26 / layout shift)',enterable:'beds (theatre/windhal) else inferred'}:null,
 profileWrongFor:k?Object.keys(P).filter(x=>maps[k][x]!==P[x]):[],
 exemplars:o.filter(x=>PAT.test(x.name)).slice(0,60).map(x=>({n:x.n,name:x.name,parent:x.parent,bits:x.bits}))};
 if(t==='heist.z8')out.note='No heist entry exists in js/ModuleStatFactsClaude.js (no hash match, no "heist" mention); the Holmes container 9/open 5 map there is a different game.';
 fs.writeFileSync(t.replace(/\.z\d$/,'')+'.json',JSON.stringify(out,null,1));rows.push(out);}
let md=`# No-name-table Inform titles: static attribute-bit layout (2026-10-24, read-only)\n\nScripts: bits.cjs (object table + names -> raw.json), emit.cjs (this file + <title>.json). Static object table only; candidates for native verification, not facts.\n\nPROFILE (6.12.2): clothing 2, concealed 3, container 4, door 5, edible 6, light 9, lockable 10, locked 11, open 14, openable 15, supporter 20, worn 26.\n\n## Layouts found\n`;
for(const k in maps)md+=`- **${k}**: ${ev[k]}\n  map: ${JSON.stringify(Object.fromEntries(['door','open','openable','container','supporter','light','edible','clothing','worn','lockable','locked','concealed','animate'].map(x=>[x,maps[k][x]])))}\n`;
md+=`\n| Title | Verdict | Layout | Confidence | PROFILE wrong for |\n|---|---|---|---|---|\n`;
for(const x of rows)md+=`| ${x.title} | ${x.verdict} | ${x.layout||'-'} | ${x.confidence} | ${x.profileWrongFor.join(' ')||'-'} |\n`;
md+=`\n## Notes\n- No title is PROFILE OK. 13 share layout L (older library: no \`absent\` at 1). In L, light/lockable/locked/open/openable/supporter/static/scenery already equal PROFILE; only clothing, concealed, container, door, edible (and enterable/general) are off by -1.\n- worn is never observable statically (nothing starts worn); values are library-order inference only. Verify with WEAR on device.\n- magic-toyshop door/clothing/supporter are inferred, not seen (no door object; dress 2,27 is unexplained).\n- heist: there is NO existing attributeMap for it in ModuleStatFactsClaude.js; the brief's assumption looks wrong.\n- sutwin: no attribute bits on any object -> NO EXEMPLARS.\n`;
fs.writeFileSync('SUMMARY.md',md);console.log(md);
