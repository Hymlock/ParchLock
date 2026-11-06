// Same shape as localscope3/assemble.cjs; adds width and per-child attrs/listedBy (from static.cjs).
const fs=require('fs'),D=__dirname,crypto=require('crypto'),A=require('../../zil-attr-analyzer.js');
const F=require('../../2026-10-11-zil-source-flags.json');
const T={
 'Ballyhoo.z3.js':{width:1,invisible:19,R1:'In the Wings (81)',R1obj:'grandstand / center pole',R2:'Performance Ring (131)',R2obj:'grandstand / center pole',
  negatives:'In the Wings 81: "examine ladder" (101, listed by 131 not 81) => "[You can\'t see any ladder here.]" before and after visiting 131; reciprocal positive ladder at 131; 81: "examine turnstile" (235) => can\'t see; Performance Ring 131: "examine path" (229, listed by 81/206 only) => can\'t see',
  extra:'All evidence rooms lit (bit 24 set in 81 and 131). INVISIBLE holder children (secret panel 212, trap door 233) are in far rooms 121/232/13 - not probed.',
  dark:'none: every listing room is lit (lit gate positive-only)',status:'CONFIRMED'},
 'Cutthroats.z3.js':{width:1,invisible:30,R1:'Your Room (183)',R1obj:'wallpaper',R2:'Upstairs Hallway (147)',R2obj:'wallpaper',
  negatives:'Your Room 183: "examine stairs" (175, listed by 147/190) => "You can\'t see any stairs here."; reciprocal positive at 147; Upstairs Hallway 147: "examine window" (179, listed by 183) => can\'t see; reciprocal positive "I see nothing special about the window." at 183',
  extra:'In bed, examine replies "You should get out of bed first." (pre-scope verb gate) - not used as evidence. Both evidence rooms lit (bit 17). INVISIBLE holder children (ferry, hole, mast, doors) are at dock/shipwreck rooms - not probed.',
  dark:'not reached (dark listing rooms are the shipwreck/underwater rooms, late game)',status:'CONFIRMED'},
 'Starcross.z3.js':{width:1,invisible:30,R1:'Bridge (202)',R1obj:'airlock / alarm / window',R2:'Airlock (122)',R2obj:'airlock',
  negatives:'Living Quarters 10: "examine airlock" (127, listed by 122/202) and "examine window" (108, listed by 15/202) => "You can\'t see any airlock/window here."; Airlock 122: "examine window" => can\'t see; reciprocal window positive at 202',
  extra:'alarm 89 (listed by 10/122/198/202) resolves in all three visited rooms; outside the Bridge the handler replies "The alarm is on the bridge, not here." - resolved, not a scope refusal. Pre-artifact ship rooms only. INVISIBLE weasel chieftain 18 is in artifact rooms - not probed.',
  dark:'not reached (dark listing rooms are Yellow Hall/Airlock in the artifact)',status:'CONFIRMED'},
 'LeatherGoddessesofPhobos.z3.js':{width:1,invisible:null,R1:"Joe\'s Bar (61)",R1obj:"gents\' restroom",R2:"Gents\' Room (160)",R2obj:"gents\' restroom",
  negatives:'Joe\'s Bar 61: "examine toilet" (212, listed by 68/160) => "You can\'t see any toilet here!"; reciprocal positive "Yechh." at 160; Gents\' Room 160: "examine window" (12, listed by 61) => can\'t see; reciprocal positive at 61',
  extra:'61 "examine gents\' restroom" reply is the room description (handler) - resolved. Holder children 83 (empty name) and 228 pseudo are abstractions.',
  dark:'not reached (dark listing rooms are Catacombs/Storehouse/Closet etc.)',status:'BLOCKED-INVISIBLE',
  caveat:'2026-10-11-zil-source-flags.json has no INVISIBLE flag for LeatherGoddessesofPhobos (proposal invisible=null); no bit invented. Room-scope positives/negatives otherwise behave as D232 predicts.'},
 'PlunderedHearts.z3.js':{width:1,invisible:20,R1:"Captain\'s Quarters (169)",R1obj:'curtain',R2:'Landing (92)',R2obj:'curtain',
  negatives:'Captain\'s Quarters 169: "examine stair" (157, listed by 92 not 169) => "You can\'t see any stair here!" before and after visiting 92; reciprocal positive at 92; Landing 92: "examine window" (10, listed by 169) => can\'t see; reciprocal positive at 169',
  extra:'Reached by the jericho walkthrough prologue (17 commands). door 217 also listed by both; the 169 reply is handler-specific (cupboard). Holder child 219 pseudo is an abstraction.',
  dark:'none: every listing room is lit',status:'CONFIRMED'}};
for(const s in T){const st=JSON.parse(fs.readFileSync(D+'/'+s+'.static.json'));const run=JSON.parse(fs.readFileSync(D+'/'+s+'.run.json'));
 const prop=JSON.parse(fs.readFileSync(D+'/../../r4-grok2/localscope/'+s+'.json'));
 const exe=crypto.createHash('sha256').update(A.story(s)).digest('hex');
 const fl=F[s].flags;const pick=k=>{if(!fl[k])return 'ABSENT';const{examples,...r}=fl[k];return r};
 const ls={...prop.localScope,width:T[s].width,invisible:T[s].invisible};
 fs.writeFileSync(D+'/'+s.replace(/\.z[35]\.js$/,'')+'.json',JSON.stringify({story:s,executableDigest:exe,proposalDigest:prop.digest,digestMatch:exe===prop.digest,fileSha256:run.sha256,
  localScope:ls,proposalLocalScope:prop.localScope,sourceFlags:{INVISIBLE:pick('INVISIBLE'),ONBIT:pick('ONBIT')},summary:T[s],
  holderChildren:st.kids,roomsListingProperty:st.rooms,commands:run.log.filter(x=>x.cmd).length,log:run.log},null,1));
 console.log(s,exe===prop.digest,exe,run.log.filter(x=>x.cmd).length);}
