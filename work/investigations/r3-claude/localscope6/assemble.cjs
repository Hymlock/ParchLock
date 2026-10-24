// Same shape as localscope5/assemble.cjs. Adds: observed property/holder override (census-ambiguous titles), optional run2 merge, missing-run tolerance, missing source-flags tolerance.
const fs=require('fs'),D=__dirname,crypto=require('crypto'),A=require('../../zil-attr-analyzer.js');
const F=require('../../2026-10-11-zil-source-flags.json');
const T={
 'Deadline.z3.js':{property:15,width:1,holder:254,invisible:31,R1:'South Lawn (249)',R1obj:'house / lawn',R2:'East Lawn (238)',R2obj:'shed / lawn',
  negatives:'South Lawn 249: "examine shed" (237, listed by 232/233/238) => "You aren\'t in that room!"; reciprocal positive "There\'s nothing special about the shed." at 238; East of Front Door 242: "examine shed" => same refusal; 249 and 238: "examine roses" (230, listed by 228/231) => "You can\'t see that here."; 249: "examine sink" => "You can\'t see any sink here."',
  extra:'Census/proposal property 16 holder 253 is the ROOMS list (values are rooms); GLOBAL is property 15, holder 254 (every listed id has parent 254). Both evidence rooms lit (bit 23). Shed refusal text is a room-object handler ("You aren\'t in that room!"), still a refusal. INVISIBLE holder children: hidden doors 179/184 (Master Bedroom/Hidden Closet/Library) - not probed.',
  dark:'none: every listing room is lit',status:'CONFIRMED'},
 'Moonmist.z3.js':{property:7,width:1,holder:44,invisible:6,R1:'driveway (9)',R1obj:'ocean / front gate',R2:'courtyard (13)',R2obj:'ocean / front gate',R3:'foyer (132)',R3obj:'oil painting',
  negatives:'driveway 9 and courtyard 13: "examine fireplace" (226) and "examine oil painting" (28, listed by 12/32/132) => "(You can\'t see any ... right here!)"; foyer 132: "examine ocean" (230, listed by 9/13/140) and "examine front gate" (52, listed by 9/13) => can\'t see; reciprocal positives at 9/13 and 132',
  extra:'Census/proposal property 8 holder 37 is the room list; GLOBAL is property 7, holder 44 ("stone" short name). GLOBAL also lists room objects (parent 37) - not holder children, not used. Gate opened by the name/colour dialogue (honk horn; Ms. Jane Smith; yes; red; yes). All evidence rooms lit (bit 10). INVISIBLE holder child: brick hole 122 (secret crypt) - not probed.',
  dark:'not reached',status:'CONFIRMED'},
 'Suspect.z3.js':{property:10,width:1,holder:248,invisible:10,R1:'Ballroom, Near Bar (118)',R1obj:'window / food',R2:'Ballroom, Near French Door (123)',R2obj:'window / french door',
  negatives:'Near Bar 118: "examine telephone" (236), "examine french door" (122, listed by 113/123) => "You can\'t see the ... here."; Near Fireplace 120 (lists food only): "examine window" (243) => "You can\'t see any window here." while "examine food" succeeds; reciprocal french door positive at 123',
  extra:'Census/proposal property 14 holder 255 is the ROOMS list; GLOBAL is property 10, holder 248. Game starts at 118 (the "@" dumps lag one turn; roomIdAfter on each command is authoritative). Rooms do NOT carry bit 11 (ONBIT per source flags): Suspect has no dark rooms, lit gate unexercised; reported as observed. No INVISIBLE holder children.',
  dark:'none (no room has bit 11)',status:'CONFIRMED'},
 'TheWitness.z3.js':{property:12,width:1,holder:247,invisible:12,R1:'driveway entrance (224)',R1obj:'bamboo woods / fence',R2:'front porch (228)',R2obj:'front gate',
  negatives:'NONE HOLD. At driveway entrance 224 (not listing them): "examine front gate" (232) => "There\'s nothing special about the front gate."; "examine French door" (235), "examine sink" (246), "examine lamp" (159), "examine office window" (212) all resolve; "examine toilet" (245) => handler reply. At front porch 228: "examine bamboo woods" (223, not listed) resolves. Only refusals: "set of footprints" (222, INVISIBLE bit 12) at 228 and "grandfather clock" (112) at 224.',
  extra:'Census/proposal property 9 is not GLOBAL; GLOBAL is property 12, holder 247 (parent 249). Local-global children resolve from rooms that do not list them: The Witness does NOT restrict local globals to listing rooms. D232 room-scope prediction CONTRADICTED for this title.',
  dark:'n/a',status:'CONTRADICTED'},
 'Stationfall.z3.js':{property:8,width:1,holder:48,invisible:null,R1:'Robot Pool (106)',R1obj:'keypad / equipment',R2:'Cargo Bay (108)',R2obj:'spacetruck / window',
  negatives:'Robot Pool 106: "examine spacetruck" (73) / "examine window" (14) => "You can\'t see any ... here!"; Cargo Bay 108: "examine keypad" (151) / "examine equipment" (84) => can\'t see; Deck Twelve 198 / Cargo Bay Entrance 54 (no property): auto-door, village, keypad, spacetruck all refused',
  extra:'Behaviour matches D232 room scope; both evidence rooms lit (bit 30).',
  dark:'not reached',status:'BLOCKED-INVISIBLE',caveat:'2026-10-11-zil-source-flags.json has no INVISIBLE flag for Stationfall (proposal invisible=null); no bit invented.'},
 'Sherlock.z5.js':{property:40,width:1,holder:161,invisible:null,R1:'221-B Baker Street (38)',R1obj:'streetlight / window',R2:'vestibule (3)',R2obj:'study door / stairway',
  negatives:'38: "examine stairway" (34) / "examine study door" (70) => "You cannot see any ... here."; entry hall 111 and vestibule 3: "examine streetlight" (97) => can\'t see; 3: "examine front door" (35, listed by 38/111) => can\'t see; reciprocal stairway positives at 111 and 3',
  extra:'v5 but GLOBAL uses 1-byte ids (property 40, width 1, holder 161). Census/proposal property 50 holder 152 is not GLOBAL (152 = rooms). GLOBAL also lists room objects (parent 152) - excluded. ONBIT unknown so the lit column is meaningless (probe run with bit 0).',
  dark:'n/a',status:'BLOCKED-INVISIBLE',caveat:'No Sherlock entry in 2026-10-11-zil-source-flags.json: neither INVISIBLE nor ONBIT known (also BLOCKED-LIT); no bits invented. Positives/negatives otherwise behave as D232 predicts.'},
 'Borderzo.z5.js':{property:48,width:2,holder:54,invisible:17,R1:null,R2:null,negatives:'not run',
  extra:'Static only: property 48 width 2 (proposal said width 1), holder 54 "LocGlo"; all listed ids parent 54. The game opens on a single-key chapter menu (1/2/3/R) the line-input probe cannot drive.',
  dark:'n/a',status:'BLOCKED-LIT',caveat:'No ONBIT in 2026-10-11-zil-source-flags.json (proposal roomLitAttribute=null); no bit invented. Also INCOMPLETE: no in-game run.'},
 'Suspended.z3.js':{property:14,width:1,holder:190,invisible:13,R1:null,R2:null,negatives:'not run',
  extra:'Static only: census/proposal property 5 holder 189 is the room list; GLOBAL is property 14, holder 190 (10 children). "extensions" 171 listed by robot pseudo-rooms is under 191, not 190. The player is a disembodied FC; physical scope belongs to the robots, so ordinary EXAMINE does not test room scope.',
  dark:'n/a',status:'INCOMPLETE'}};
for(const s in T){const st=JSON.parse(fs.readFileSync(D+'/'+s+'.static.json'));
 let log=[],sha=null;for(const f of [s+'.run.json',s+'.run2.json'])if(fs.existsSync(D+'/'+f)){const r=JSON.parse(fs.readFileSync(D+'/'+f));sha=r.sha256;log=log.concat(r.log);}
 const prop=JSON.parse(fs.readFileSync(D+'/../../r4-grok2/localscope/'+s+'.json'));
 const exe=crypto.createHash('sha256').update(A.story(s)).digest('hex');
 const fl=(F[s]||{}).flags||{};const pick=k=>{if(!fl[k])return 'ABSENT';const{examples,...r}=fl[k];return r};
 const ls={...prop.localScope,property:T[s].property,width:T[s].width,holder:T[s].holder,invisible:T[s].invisible};
 fs.writeFileSync(D+'/'+s.replace(/\.z[35]\.js$/,'')+'.json',JSON.stringify({story:s,executableDigest:exe,proposalDigest:prop.digest,digestMatch:exe===prop.digest,fileSha256:sha,
  localScope:ls,proposalLocalScope:prop.localScope,sourceFlags:{INVISIBLE:pick('INVISIBLE'),ONBIT:pick('ONBIT')},summary:T[s],
  holderChildren:st.kids,roomsListingProperty:st.rooms,commands:log.filter(x=>x.cmd).length,log},null,1));
 console.log(s,exe===prop.digest,exe.slice(0,16),log.filter(x=>x.cmd).length);}
