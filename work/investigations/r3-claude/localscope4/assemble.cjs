// Same shape as localscope3/assemble.cjs; adds width and per-child attrs/listedBy (from static.cjs).
const fs=require('fs'),D=__dirname,crypto=require('crypto'),A=require('../../zil-attr-analyzer.js');
const F=require('../../2026-10-11-zil-source-flags.json');
const T={
 'Wishbringer.z3.js':{width:1,invisible:null,R1:'Hilltop (95)',R1obj:'Post Office door',R2:'Post Office (166)',R2obj:'Post Office door',
  negatives:'Outside Cemetery 246: "examine post office door" => can\'t see; Hilltop 95: "examine iron gate" (247, listed by 246/222 only) => can\'t see; reciprocal positive iron gate at 246; Post Office 166: "examine hill" => can\'t see (hill positive at 95 and 246 via room-description handler)',
  extra:'tower 111 is listed by Hilltop 95 with parent==holder but "examine tower" => "You can\'t see any tower here!"; its attributes (16 only) are identical to hill 186 which resolves, so the refusal is not an attribute bit - no INVISIBLE bit is inferred',
  dark:'not reached (dark listing rooms are Underground/Grue\'s Nest/Museum, far)',status:'BLOCKED-INVISIBLE',
  caveat:'2026-10-11-zil-source-flags.json has no INVISIBLE flag for Wishbringer (flags present: '+Object.keys(F['Wishbringer.z3.js'].flags).join(',')+'); no bit invented. Room-scope positives/negatives otherwise behave as D232 predicts.'},
 'Planetfall.z3.js':{width:1,invisible:19,R1:'Deck Nine (235)',R1obj:'stairway',R2:'Gangway (222)',R2obj:'stairway',
  negatives:'Gangway 222: "examine escape pod" (228, listed by 235/216 only) => can\'t see; reciprocal positive at 235; Deck Nine 235: "examine slot" (209 not listed) => can\'t see',
  extra:'INVISIBLE witnesses: wide bulkhead 230 (listed by 235, invisible) => can\'t see at 235; narrow bulkhead 229 (listed by 222, invisible) => can\'t see at 222',
  dark:'not reached (only dark listing room is Reactor Access Stairs 129, far)',status:'CONFIRMED'},
 'Hitchhik.z5.js':{width:2,invisible:21,R1:'Front of House (71)',R1obj:'tree',R2:'Back of House (72)',R2obj:'tree',
  negatives:'Front Porch 174: "examine tree" => can\'t see; Front of House 71 and Back of House 72: "examine stairs" (162, positive at Front Porch 174) => can\'t see; 72: "examine door" (205) => can\'t see',
  extra:'v5 property 47 holds 2-byte words (sz even, every id parent==holder 37); r4-grok2 proposal says width 1 - that is WRONG, width is 2. Bedroom 150 lit attribute 45 flips true after "turn on light".',
  dark:'Bedroom (150): lit=false at start, lists window 11; "examine window" => "It\'s too dark to see!"',status:'CONFIRMED',
  caveat:'proposal localScope.width=1 must be corrected to 2'},
 'Seastalker.z3.js':{width:1,invisible:12,R1:'lab center (65)',R1obj:'alarm bell',R2:'north part (92)',R2obj:'alarm bell',
  negatives:'lab center 65 and north part 92: "examine intercom" (87) and "examine lab door" (88, at 65) => "(You can\'t see any intercom/lab door here!)"; reciprocal positives intercom and lab door at east part 89; 65: "examine scimitar" => can\'t see',
  extra:'east part 89 alarm bell positive (third room). Name prompt answered Ann/Smith/yes. "examine control panel" in 92 is ambiguous with docking tank control panel - not used.',
  dark:'none: every listing room is lit',status:'CONFIRMED'},
 'Spellbreaker.z3.js':{width:1,invisible:12,R1:'Cliff Middle (29)',R1obj:'cliff / rock',R2:'Cliff Top (109)',R2obj:'cliff',
  negatives:'Packed Earth 156 (lit by burin): "examine cliff" => can\'t see; Cliff Middle 29: "examine stone hut" (226, positive at Cliff Top 109) and "examine hole" (117, positive at 156) => can\'t see; Cliff Top: "examine water" => can\'t see',
  extra:'"examine cliff" and "examine rock" both reply "The rocks look very precariously balanced." - rock 23 and cliff 96 are both listed by 29 and 109, so either resolution is a holder child; Packed Earth hole 117 positive after FROTZ BURIN. Cube obtained by waiting for the smoke (lesoch fails randomly).',
  dark:'Packed Earth (156): lit=false, lists hole 117; before FROTZ "examine hole" => "It\'s too dark to see!"',status:'CONFIRMED'}};
for(const s in T){const st=JSON.parse(fs.readFileSync(D+'/'+s+'.static.json'));const run=JSON.parse(fs.readFileSync(D+'/'+s+'.run.json'));
 const prop=JSON.parse(fs.readFileSync(D+'/../../r4-grok2/localscope/'+s+'.json'));
 const exe=crypto.createHash('sha256').update(A.story(s)).digest('hex');
 const fl=F[s].flags;const pick=k=>{if(!fl[k])return 'ABSENT';const{examples,...r}=fl[k];return r};
 const ls={...prop.localScope,width:T[s].width,invisible:T[s].invisible};
 fs.writeFileSync(D+'/'+s.replace(/\.z[35]\.js$/,'')+'.json',JSON.stringify({story:s,executableDigest:exe,proposalDigest:prop.digest,digestMatch:exe===prop.digest,fileSha256:run.sha256,
  localScope:ls,proposalLocalScope:prop.localScope,sourceFlags:{INVISIBLE:pick('INVISIBLE'),ONBIT:pick('ONBIT')},summary:T[s],
  holderChildren:st.kids,roomsListingProperty:st.rooms,commands:run.log.filter(x=>x.cmd).length,log:run.log},null,1));
 console.log(s,exe===prop.digest,exe,run.log.filter(x=>x.cmd).length);}
