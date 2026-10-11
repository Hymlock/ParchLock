/* Per-key locks and per-title prior attempts for per-(title,key) rules entries (operator 3299, Codex 3300). */
const K={
container:['D25 sourced bits; c33f396/5ec4c95 Zork I map (13 under review -> 19); 1e54a58 fail-closed; D148 held containers (Enchanter); R2.4 container != openable','AttributeSchema.bitFor -> attributeMap fact','static rule + live: object with children shows contents after OPEN; d31 nested inventory unchanged'],
open:['c33f396 (open 11 Zork I); 1e54a58; D73 allowedVerbs learner owns offered verbs (R2.4)','attributeMap open/isOpen','native transition: bit flips on OPEN and clears on CLOSE of a real object (Codex proved Zork I mailbox)'],
transparent:['none specific; D148 visibility of closed containers','attributeMap transparent','static rule + live: closed transparent container contents visible; D148 harness'],
door:['D61/D134 + Z1-R1: doors never become route destinations; ExitCalibrator owns exits (R2.1)','attributeMap door (object semantics only, never exit authority)','static rule + live OPEN/CLOSE of a door object; map gate unchanged'],
supporter:['5ec4c95 SURFACEBIT 10 Zork I (live-proven)','attributeMap supporter','PUT ON PRSI test + live: items on table underlined'],
animate:['D204/D205 Yourself; hasConfirmedFlag animate (observedPossessions); D214 P1 possession','attributeMap animate (AttrCalibrator.hasConfirmedFlag still checked)','ATTACK precondition + live: actor attack/talk reply; possessions only when animate trusted'],
talkable:['R3.1: separate from animate, no derivation','attributeMap talkable','TALK/ASK/TELL precondition + live conversational reply'],
edible:['ActionSynth SEMANTIC_FLAGS','attributeMap edible','EAT precondition + live eat of food object (save/undo isolated)'],
light:['DarkScope darkness; M11 fail-closed (804af63)','attributeMap light','LIGHT precondition + live: lamp is light source; DarkScope unchanged'],
on:['DarkScope','attributeMap on','set by LIGHT, cleared by EXTINGUISH, live flip'],
enterable:['MapTopology posture verbs; vehicles','attributeMap enterable','BOARD/ENTER precondition + live board of vehicle'],
wearable:['D59 wear/remove radial; equipment (applyEquipmentState)','attributeMap wearable/clothing','WEAR precondition + live wear'],
worn:['R2.5: owned by wornAttribute fact path (wornBitFallback/wornOwnedAboveCalibration); existing facts HHG 24, Border Zone 39, Planetfall 12','fact wornAttribute (NOT attributeMap)','WEAR set + TAKE OFF clear + live flip; matches existing facts where present'],
locked:['per-object LOCK routines in most titles','attributeMap locked','LOCK set / UNLOCK clear + live'],
takeable:['D214 d214TakeAttribute; R3.2 objectOverrideFor wins last','derived (not mapped)','no new work'],
};
const notes={
'Ballyhoo.z3.js':'no prior ZIL facts.','Borderzo.z5.js':'existing facts playerGlobal 186, inventoryHiddenAttribute 29, wornAttribute 39 (matrix worn 39 agrees). v5 bit range < 48.','Cutthroats.z3.js':'no prior facts.','Deadline.z3.js':'D167/D204 headless stats; mystery group.','Enchanter.z3.js':'D148 held containers (d31 harness), D184 unnamed objects; must not regress d31.','Hitchhik.z5.js':'wornAttribute 24 (matrix agrees); M11 dark bed (804af63 fail-closed); M09 ZIL boot admission (1d494a6).',
'HollywoodHijinx.z3.js':'no prior facts.','Infidel.z3.js':'Codex #3289: trunk shows open=true while native padlock holds shut, so open rows need native proof per object (R2.4).','LeatherGoddessesofPhobos.z3.js':'#3265: LGOP false open/close on body parts under PROFILE; rows talkable/edible/light all 31 = SUSPECT generic first test.','Moonmist.z3.js':'no OPEN/CLOSE-derived rows: all unknown.',
'Planetfall.z3.js':'wornAttribute 12 (matrix agrees); Codex: uniform pocket refuses OPEN (R2.4).','PlunderedHearts.z3.js':'no rows derivable: unknown.','Seastalker.z3.js':'inventoryHiddenAttribute 17; no rows derivable.','Sherlock.z5.js':'classification unknown (invalid-dictionary): no facts; classifier resolution is Codex-owned.','Sorcerer.z3.js':'Enchanter trilogy.','Spellbreaker.z3.js':'control-flow analyzer finds NO container; the earlier draft 27 is withdrawn.',
'Starcross.z3.js':'no prior.','Stationfall.z3.js':'Planetfall pair; differs from Planetfall, so no group sharing.','Suspect.z3.js':'classification unknown (unvalidated-grammar-family); inventoryHiddenAttribute 19 + preservesWorn; b45d4a8 Q0 CustomPlayer inventory.','Suspended.z3.js':'Grok #3268: multi-body player; player row needs per-body proof.','TheLurkingHorror.z3.js':'control-flow analyzer finds NO container; the earlier draft 27 is withdrawn.','TheWitness.z3.js':'Grok #3268: G1=20 is a white wire, not the player; reverted Q0 INV learner (e988c98 -> 12c35d6). talkable/light both 31 = SUSPECT.',
'Wishbringer.z3.js':'only open derivable.','Zork1-TheGreatUndergroundEmpire.z3.js':'c33f396/5ec4c95 shipped map; Codex #3287 native evidence: container 19, open 11, supporter 10.','Zork2-TheWizardofFrobozz.z3.js':'Zork group; bits differ from Zork I, so no group sharing.','Zork3-TheDungeonMaster.z3.js':'Zork group; bits differ.'};
K.isOpen=K.open; K.isWorn=K.worn; K.clothing=K.wearable;
module.exports={K,notes};
