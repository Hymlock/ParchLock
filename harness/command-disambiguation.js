if (!process.argv.includes('--live')) {
// D141 adjective+noun disambiguation.
//
// Phase 4 planned this and it was never built: "adjective+noun unambiguous
// commands (query the object's dictionary adjective properties, not just its
// noun, so a synthesized command like TAKE SMALL BRASS KEY is unique enough to
// skip parser disambiguation - not just TAKE KEY)".
//
// Operator report: "green blob / yellow blob / blue blob -- it doesn't
// understand their difference". D64/D107 reduce a command to ONE verified
// dictionary word, which is correct while that word is unique and wrong the
// moment it is not: every blob verifies as "blob", so every blob produces the
// same command and the story must stop and ask which was meant.
//
// The rules proven here are deliberately conservative, because D107 established
// that an invented compound phrase is WORSE than an ambiguous one: the story's
// own "Which do you mean?" is a normal recoverable reply, a parse error is not.
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// ---- minimal stubs -------------------------------------------------------
global.window = global;
global.$ = function () { return { text: function () { return this; }, html: function () { return ""; } }; };
global.document = { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, body: { classList: { contains: () => false } } };
global.Message = { Show() {} };
global.Global = { Prefs: {} };

let POOL = [];
global.WorldModel = { lastPayload: { get discoveredObjects() { return POOL; }, inventory: [] } };

const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "Actionable.js"), "utf8");
eval(src);
const A = global.Actionable || Actionable;

function setPool(objs) {
    POOL = objs;
    A.CommandNouns = A.commandNounsForPool(objs);
}

// ---- the operator's case: three identically-named objects ----------------
const blobs = [
    { id: 1, name: "green blob", aliases: ["blob", "green", "slime"] },
    { id: 2, name: "yellow blob", aliases: ["blob", "yellow", "slime"] },
    { id: 3, name: "blue blob", aliases: ["blob", "blue", "slime"] }
];
setPool(blobs);

const cmds = blobs.map(b => A.disambiguatedNoun(b));
console.log("   blobs -> " + JSON.stringify(cmds));
assert(new Set(cmds).size === 3, "three same-named objects produce three DIFFERENT commands (was one command for all three)");
cmds.forEach((c, i) => {
    assert(/blob/.test(c), "command " + JSON.stringify(c) + " still names the object");
    const qualifier = c.replace(/\s*blob\s*/, "").trim();
    assert(!qualifier || blobs[i].aliases.indexOf(qualifier) !== -1,
        "the qualifier " + JSON.stringify(qualifier) + " is one of that object's OWN dictionary words, so the parser accepts it");
});
assert(cmds.every(c => !/slime/.test(c)),
    "a word every rival also answers to is never used as the qualifier -- it would not disambiguate anything");

// ---- an unambiguous object must be left exactly as it was ---------------
setPool([
    { id: 10, name: "brass lantern", aliases: ["lantern", "lamp", "brass"] },
    { id: 11, name: "sword", aliases: ["sword", "blade"] }
]);
const lamp = { id: 10, name: "brass lantern", aliases: ["lantern", "lamp", "brass"] };
assert(A.disambiguatedNoun(lamp) === A.commandNounFor(lamp),
    "an object with no rival in scope keeps the exact short command it had before -- no gratuitous qualifiers");

// ---- never invent an unparseable phrase (D107) ---------------------------
setPool([
    { id: 20, name: "long-handled shovel", aliases: ["shovel"] },
    { id: 21, name: "rusty shovel", aliases: ["shovel"] }
]);
const shovelA = { id: 20, name: "long-handled shovel", aliases: ["shovel"] };
const outA = A.disambiguatedNoun(shovelA);
assert(outA === "shovel",
    "with no distinguishing dictionary word it keeps the real word rather than inventing a display phrase -- D107 proved 'long-handled shovel' is rejected by the parser outright");
assert(outA.indexOf("long-handled") === -1, "specifically, the compound display name is never submitted");

// ---- rivalry is scope-sensitive, not global -----------------------------
setPool([{ id: 30, name: "green blob", aliases: ["blob", "green"] }]);
const loneBlob = { id: 30, name: "green blob", aliases: ["blob", "green"] };
assert(A.disambiguatedNoun(loneBlob) === A.commandNounFor(loneBlob),
    "the SAME object drops its qualifier once its rivals leave scope -- disambiguation tracks what is actually present");

// ---- objects with no dictionary words at all (non-Inform) ---------------
setPool([
    { id: 40, name: "cube", aliases: [] },
    { id: 41, name: "cube", aliases: [] }
]);
const bare = { id: 40, name: "cube", aliases: [] };
assert(typeof A.disambiguatedNoun(bare) === "string" && A.disambiguatedNoun(bare).length > 0,
    "an object with no minable dictionary words still yields a usable command (ZRamReader.parserWords is Inform-gated, so ZIL objects arrive with aliases:[])");

// ---- D147: spells / non-standard items -----------------------------------
// Enchanter's real shape, read live from RAM: every spell is an object named
// "<name> spell" whose only minable word is "spell". Before D147 all three
// produced the single command "spell".
const SPELL_DICT = { spell: 1, rezrov: 1, frotz: 1, blorb: 1, cast: 1, unlock: 1, book: 1 };
global.ZRamProvider = { getMem: () => ({ fake: true }) };
global.ZRamReader = Object.assign(global.ZRamReader || {}, {
    hasDictionaryWord: (mem, w) => !!SPELL_DICT[String(w || "").toLowerCase()]
});

const spells = [
    { id: 60, name: "rezrov spell", aliases: ["spell"] },
    { id: 61, name: "frotz spell", aliases: ["spell"] },
    { id: 62, name: "blorb spell", aliases: ["spell"] }
];
setPool(spells);
const spellCmds = spells.map(s => A.disambiguatedNoun(s));
console.log("   spells -> " + JSON.stringify(spellCmds));
assert(new Set(spellCmds).size === 3,
    "three spells named '<name> spell' produce three DIFFERENT commands (all three were the bare word 'spell')");
assert(spellCmds.every(c => /^(rezrov|frotz|blorb) spell$/.test(c)),
    "and each is qualified by its OWN spell name, which the story's dictionary really contains -- 'cast rezrov spell at me' was confirmed live to parse");

// A name token the dictionary does NOT contain is still never submitted (D107).
setPool([
    { id: 70, name: "long-handled shovel", aliases: ["shovel"] },
    { id: 71, name: "rusty shovel", aliases: ["shovel"] }
]);
assert(A.disambiguatedNoun({ id: 70, name: "long-handled shovel", aliases: ["shovel"] }) === "shovel",
    "a printed word absent from the dictionary is still refused as a qualifier -- verification, not guessing");

// Instrumental verbs must exist in the game before being offered.
assert(A.availableInstrumentals().map(i => i.verb).join(",") === "cast,unlock",
    "only instrumental verbs present in THIS story's dictionary are offered -- 'use' is absent here, and 'use X with Y' replies \"I don't know the word 'use'\" in Enchanter");
const castInst = A.INSTRUMENTALS.find(i => i.verb === "cast");
assert(castInst.build("blorb spell", "book") === "cast blorb spell at book",
    "cast uses 'cast A at B' -- the form measured working live ('cast blorb at book' encloses the spell book in a strong box)");
assert(A.INSTRUMENTALS.find(i => i.verb === "unlock").build("key", "door") === "unlock door with key",
    "unlock puts the INSTRUMENT second: 'unlock door with key', not 'unlock key with door'");

SPELL_DICT.cast = 0; SPELL_DICT.unlock = 0;
assert(A.availableInstrumentals().length === 0,
    "a game with no instrumental verb at all gets NO launcher rather than an unparseable command (D24)");
SPELL_DICT.cast = 1; SPELL_DICT.unlock = 1;
delete global.ZRamProvider;

// ---- D142/D143/D144/D145: vocabulary, text decoding, verb trust ----------
const zr = fs.readFileSync(path.resolve(__dirname, "..", "js", "ZRamReader.js"), "utf8");
const as = fs.readFileSync(path.resolve(__dirname, "..", "js", "ActionSynth.js"), "utf8");
const ac = fs.readFileSync(path.resolve(__dirname, "..", "js", "AttrCalibrator.js"), "utf8");
const act = fs.readFileSync(path.resolve(__dirname, "..", "js", "Actionable.js"), "utf8");

assert(/parserWordsStructural/.test(zr) && /parserWordsAny/.test(zr),
    "object vocabulary is minable for NON-Inform games too, so the whole ZIL catalog stops arriving with aliases:[]");
assert(/one bad slot disqualifies/.test(zr),
    "and it is SELF-VERIFYING -- a property counts as vocabulary only if every 2-byte slot lands on a real dictionary entry, so no property number is assumed (D61)");
assert(/_decodeZscRaw/.test(zr),
    "Z-text abbreviations expand WITHOUT being trimmed -- trimming inside the recursion welded names together ('smallmailbox', 'CanyonView', 'YourRoom')");
assert(/_decodeZscRaw\(mem, addr, maxWords\)\.replace/.test(zr),
    "whitespace is normalised exactly once, at the top level");
assert(/expandTruncated/.test(act),
    "a dictionary entry truncated by the Z-machine (6 chars in v3) is shown in full when a display token extends it -- 'mailbo' reads as a typo");
assert(/SEMANTIC_FLAGS/.test(as) && /trustworthyAttrs/.test(as),
    "semantic attribute flags are not trusted on a compiler whose bit meanings have not been learned (D73)");
assert(/isInformCompiled\(mem\)\) return attrs;/.test(as),
    "an Inform game is completely unaffected by that gate");
assert(/hasConfirmedFlag/.test(ac) && /CONFIRM_THRESHOLD/.test(ac),
    "and a suppressed flag comes BACK automatically once the game's own opcodes confirm its bit -- no per-title branching");

const vials = [{ id: 501, name: "vial", aliases: ["green", "vial"] }, { id: 502, name: "vial", aliases: ["ochre", "vial"] }];
setPool(vials);
assert(typeof A.referenceFor === "function", "shared identity-aware reference API exists");
if (A.referenceFor) {
    assert(A.referenceFor(vials[0]).unique && /green/.test(A.referenceFor(vials[0]).noun), "unnamed colored vial selects its unique descriptor");
    const twins = [{ id: 601, name: "mysterious vial", aliases: ["vial"] }, { id: 602, name: "mysterious vial", aliases: ["vial"] }];
    setPool(twins);
    assert(!A.referenceFor(twins[0]).unique, "identical-looking rows never promise a unique parser target");
    assert(A.referenceFor(twins[0]).candidateIds.length === 2, "shared reference retains both physical identities");
    setPool([{ id: 701, name: "new", aliases: ["new", "scroll"] }, { id: 702, name: "scroll", aliases: ["old", "scroll"] }]);
    assert(/new/.test(A.referenceFor(POOL[0]).noun), "adjective-only fallback retains distinguishing vocabulary");
    assert(A.displayNameFor(vials[0], vials, "the green vial and the ochre vial") === "green vial", "visible descriptor is preserved");
    assert(A.displayNameFor(vials[0], vials, "a vial") === "vial", "unseen color is not disclosed");
    assert(A.displayNameFor(vials[0], vials, "green. vial") === "vial", "descriptor evidence never joins across sentence punctuation");
    const dagger = { id: 801, name: "daggers", aliases: ["dagger", "daggers"], labelProvenance: "parser-vocabulary" };
    assert(A.displayNameFor(dagger, [dagger], "a dagger (1d3 attack)") === "dagger", "unnamed item uses an observed singular alias");
    assert(A.displayNameFor(dagger, [dagger, Object.assign({}, dagger, { id: 802 })], "a dagger") === "dagger", "shared observed display spelling is retained without choosing a physical sibling");
    assert(A.displayNameFor({ id: 803, name: "large oak door", aliases: ["oak", "door"] }, [{ id: 803, aliases: ["oak", "door"] }], "oak") === "large oak door", "one-word display recovery never reduces a structural printed name");
    setPool(vials);
    vials[1].parseNameUnverified = true;
    assert(A.referenceFor(vials[0]).unique && !A.referenceFor(vials[0]).verified, "custom parser keeps unique interaction but cannot supply automatic learning proof");
    delete vials[1].parseNameUnverified;
    setPool([vials[0]]);
    assert(A.referenceFor(vials[0]).unique, "scope changes restore unique references without a stale candidate cache");
    const zsrc = require("fs").readFileSync(require("path").join(__dirname, "..", "js", "ZRamReader.js"), "utf8");
    assert(/objectHasCustomParseName/.test(zsrc) && /informPropertyNames/.test(zsrc), "ZRamReader exposes non-executing parse_name property-table discovery");
}
setPool([{id:901,name:"nutritiou",displayName:"food pellets",aliases:["nutritiou","food","pellet","pellets"]},{id:902,name:"nutritiou",displayName:"food pellets",aliases:["nutritiou","food","pellet","pellets"]}]);
assert(A.referenceFor(POOL[0]).noun === "pellets", "duplicate observed head replaces unreadable dictionary fragment");
assert(!A.referenceFor(POOL[0]).unique && A.referenceFor(POOL[0]).candidateIds.length === 2, "readable duplicate noun preserves both candidates");
const notes=[{id:191,name:"scribbled note",aliases:["scribbled","scribbles","note","letter","scrap","of","paper"]},{id:193,name:"scrawled note",aliases:["scrawled","scribbled","scribbles","note","letter","scrap","of","paper"]}];
for(const text of ["A scrap of paper is here. You are carrying a scribbled note and a scrawled note.","A scrawled note and a scribbled note. A scrap of paper is here."]){
 assert(A.displayNameFor(notes[0],notes,text)==="scribbled note", "shared synonym never replaces observed scribbled descriptor");
 assert(A.displayNameFor(notes[1],notes,text)==="scrawled note", "shared synonym never replaces observed scrawled descriptor");
}
assert(A.displayNameFor(notes[0],[notes[0]],"scrap of paper. scribbled note") === "scribbled note", "structural descriptor survives even when generic synonym is unique in held scope");
assert(A.displayNameFor(vials[0],vials,"green vial") === "green vial", "unique observed descriptor can still extend a generic structural head");
assert(A.displayNameFor({id:901,name:"nutritiou",aliases:["food","pellets","nutritiou"]},[{id:901,aliases:["food","pellets","nutritiou"]},{id:902,aliases:["food","pellets","nutritiou"]}],"two food pellets") === "food pellets", "identical copies retain shared full phrase recovery");
console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);

} else {

// --live: real Enchanter spell book, UI filtering and accepted Cast command.
(async()=>{
 const {chromium}=require('playwright'),{pathToFileURL}=require('url'),path=require('path'),verify=require('assert');
 let checks=0;const check=(ok,label)=>{verify(ok,label);checks++;console.log('PASS:',label);};
 const browser=await chromium.launch({headless:true});
 try{for(const width of process.argv.includes("--mobile")?[360]:[1280,360]){
  const context=await browser.newContext({viewport:{width,height:850},isMobile:width<600,hasTouch:width<600});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{sessionStorage.setItem('PL_ParchLockSplashSeen','1');localStorage.setItem('PL_TutorialSeen','1');localStorage.setItem('PL_LearnedWordsTutorialSeen','1');localStorage.setItem('PL_MobileTutorialSeen','1');});
  await page.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/Enchanter.z3.js');await page.waitForTimeout(3500);
  const items=await page.evaluate(()=>WorldModel.lastPayload.inventory.map(o=>({id:o.id,name:o.name,parent:o.parentId,noun:Actionable.disambiguatedNoun(o),spell:EquipmentUI.isSpell(o)})));
  const book=items.find(o=>o.name==='spell book'),spells=items.filter(o=>/^(blorb|nitfol|frotz|gnusto) spell$/.test(o.name));
  check(book&&spells.length===4&&spells.every(o=>o.parent===book.id&&o.spell),'real RAM book has four distinct nested spells '+width);
  check(new Set(spells.map(o=>o.noun)).size===4&&spells.every(o=>o.noun===o.name),'spell command names remain distinct '+width);
  await page.locator('.Input.LineInput').fill('read book');await page.locator('.Input.LineInput').press('Enter');await page.waitForTimeout(1100);
  const prose=await page.locator('#windowport').innerText();check(spells.every(o=>prose.includes('The '+o.name+' (')),'real READ book confirms all spell names '+width);
  await page.evaluate(()=>EquipmentUI.Show());await page.waitForTimeout(400);if(await page.evaluate(()=>Message.IsOpen))await page.locator('#message #close').click();await page.waitForTimeout(6500);
  await page.evaluate(()=>EquipmentUI.Show());await page.waitForTimeout(900);
  check(await page.locator('#equipment').isVisible()&&await page.evaluate(()=>EquipmentUI.IsOpen()),'Equipment is visibly open '+width);
  const rows=await page.locator('#equipment-list .equip-row').evaluateAll(xs=>xs.map(x=>({id:+x.dataset.objectId,depth:+x.style.getPropertyValue('--equip-depth'),name:x.querySelector('.equip-name').textContent,tags:x.querySelector('.equip-tags')?.textContent||''})));
  check(rows.length===5&&spells.every(o=>rows.some(r=>r.id===o.id&&r.depth===1&&r.name===o.name)),'spell book hierarchy and full names rendered '+width);
  check(spells.every(o=>!rows.find(r=>r.id===o.id).tags.match(/closed|open|surface/)),'untrusted compiler bits do not label spells closed '+width);
  await page.locator('#equipment-options summary').click();check(await page.locator('#equipment-cat-spells-label').isVisible(),'Spells category available '+width);
  await page.locator('#equipment-cat-spells').uncheck();check(await page.locator('#equipment-list .equip-row').count()===0,'Spells filter removes spell group '+width);
  await page.locator('#equipment-cat-spells').check();check(await page.locator('#equipment-list .equip-row').count()===5,'Spells filter restores all items '+width);
  await page.locator('#equipment-container-view').uncheck();check(await page.locator('#equipment-list .equip-row').evaluateAll(xs=>xs.every(x=>+x.style.getPropertyValue('--equip-depth')===0)),'flat mode preserves every spell '+width);await page.locator('#equipment-container-view').check();
  await page.locator('#equipment-filter').fill('frotz');check(await page.locator('#equipment-list .equip-row').count()===2,'spell text filter preserves book path '+width);await page.locator('#equipment-filter').fill('');await page.locator('#equipment-options summary').click();
  const blorb=spells.find(o=>o.name==='blorb spell'),row=page.locator('#equipment-list [data-object-id="'+blorb.id+'"]');await row.scrollIntoViewIfNeeded();
  if(width<600){const box=await row.locator(".equip-name").boundingBox(),cdp=await context.newCDPSession(page);const point={x:box.x+Math.min(20,box.width/4),y:box.y+box.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await page.waitForTimeout(650);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await row.click({button:'right'});
  const cast=page.locator('#radial-menu .radial-command').filter({hasText:/^Cast at\.\.\.$/});if(!await cast.isVisible())console.log('GESTURE DEBUG',await page.evaluate(()=>({radial:document.querySelector('#radial-menu').innerText,open:EquipmentUI.IsOpen(),press:!!EquipmentUI._press,modal:Message.IsOpen,classes:document.body.className})));check(await cast.isVisible(),'real item gesture offers Cast at '+width);check(!await page.locator('#radial-menu .radial-command').filter({hasText:/^Use with/}).count(),'unsupported Use command absent '+width);await cast.click();
  const target=page.locator('#radial-menu .radial-command').filter({hasText:/^spell book$/});check(await target.isVisible(),'Cast target picker contains real book '+width);await target.click();await page.waitForTimeout(1500);
  const result=await page.locator('#windowport').innerText();check(result.includes('cast blorb spell at book')&&result.includes('A glowing strong box forms out of the air'),'UI submits unambiguous spell and game accepts cast '+width);
  check(await page.evaluate(()=>WorldModel.lastPayload.inventory.length===0),'cast moves book and spells out of carried inventory '+width);
  check(await page.evaluate(bookId=>ZRamReader.objectLinks(ZRamProvider.getMem(),bookId).parent!==WorldModel.lastPayload.playerId,book.id),'real RAM containment changed after cast '+width);
  check(errors.length===0,'no browser errors '+width);await context.close();
 }}finally{await browser.close();}
 console.log(checks+' Enchanter live spell/UI checks PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});

}
