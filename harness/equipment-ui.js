// D122 EquipmentUI: model, sorting, filtering, arbitrary-depth nesting and
// drop legality. Pure Node -- js/EquipmentUI.js is eval'd against stubs, the
// same technique harness/qol-download-text.js uses, so the tree/sort/drop
// rules are proven without a browser.
//
// The fixture is the operator's own reported inventory, which is THREE levels
// deep (trenchcoat > keyring > key to the house). Sub-containers were the
// specific thing called out as easy to get wrong, so they are the fixture.
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// ---- stubs ----------------------------------------------------------------
const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};
global.document = { readyState: "complete", addEventListener() {}, getElementById: () => null, querySelectorAll: () => [], body: { classList: { contains: () => false, add() {}, remove() {} } } };
global.window = {};
global.ParchLock = { GameFilename: "anchor.z8" };
global.AttributeSchema = { isTrulyWorn: a => !!(a && a.worn) };
const submitted = [];
global.Actionable = { Submit: c => submitted.push(c) };

const ITEMS = [
    { id: 1, name: "trenchcoat", parentId: 99, attrs: { worn: true, container: true, open: true } },
    { id: 2, name: "towel", parentId: 1, attrs: {} },
    { id: 3, name: "keyring", parentId: 1, attrs: { container: true, open: true } },
    { id: 4, name: "key to the house", parentId: 3, attrs: {} },
    { id: 5, name: "key to the cellar", parentId: 3, attrs: {} },
    { id: 6, name: "faculty card", parentId: 1, attrs: {} },
    { id: 7, name: "flask", parentId: 1, attrs: {} },
    { id: 8, name: "old tin", parentId: 1, attrs: { container: true, open: false } },
    { id: 9, name: "clothes", parentId: 99, attrs: { worn: true } },
    { id: 10, name: "wedding ring", parentId: 99, attrs: { worn: true } },
    { id: 11, name: "umbrella", parentId: 99, attrs: {} },
    { id: 12, name: "lantern", parentId: 99, attrs: {} }
];
global.WorldModel = { lastPayload: { playerId: 99, inventory: ITEMS } };

const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "EquipmentUI.js"), "utf8");
eval(src);
const E = global.EquipmentUI || EquipmentUI;

// ---- model ---------------------------------------------------------------
const m = E.model();
assert(m.playerId === 99, "the self container (payload.playerId) is picked up as the inventory root");
assert(m.topLevel.length === 5, "top level is what the player directly holds/wears, not everything (got " + m.topLevel.length + ")");
assert(E.isWorn(m.byId["1"]) && !E.isWorn(m.byId["2"]), "worn state comes from AttributeSchema, matching Actionable.RenderInventory");
assert(E.isContainer(m.byId["3"]) && !E.isContainer(m.byId["4"]), "containers are identified from the container/supporter bits");

// ---- arbitrary-depth nesting --------------------------------------------
E.Prefs.containerView = true;
E.Prefs.sort = "alpha";
E.Prefs.filter = "";
let rows = E.rows(m);
const depthOf = name => { const r = rows.find(r => r.obj.name === name); return r ? r.depth : -1; };

assert(rows[0] && rows[0].self, "the self container is rendered as a real base-level node, so worn gear reads as 'on you'");
assert(depthOf("trenchcoat") === 1, "worn container sits under the self node");
assert(depthOf("keyring") === 2, "a container INSIDE a container nests one level further");
assert(depthOf("key to the house") === 3, "a SUB-container's contents nest again -- depth is not capped at one level");
assert(depthOf("umbrella") === 0, "loose carried items stay at the base level");

// every child is exactly one step deeper than its parent, at every depth
let structural = true;
rows.forEach((r, i) => {
    if (r.self || r.depth === 0) return;
    for (let j = i - 1; j >= 0; j--) {
        if (rows[j].depth === r.depth - 1) {
            const parent = rows[j].self ? 99 : rows[j].obj.id;
            if (String(r.obj.parentId) !== String(parent)) structural = false;
            return;
        }
    }
});
assert(structural, "every row's parent is the nearest row exactly one level shallower (the tree is really a tree)");

// ---- sorting applies at EVERY level --------------------------------------
const sibs = p => rows.filter(r => !r.self && String(r.obj.parentId) === String(p)).map(r => r.obj.name);
const sorted = a => a.slice().sort((x, y) => x < y ? -1 : x > y ? 1 : 0).join("|") === a.join("|");
assert(sorted(sibs(1)), "trenchcoat's contents are alphabetised among themselves: " + sibs(1).join(", "));
assert(sorted(sibs(3)), "the sub-container's contents are independently alphabetised: " + sibs(3).join(", "));

E.Prefs.sort = "za";
rows = E.rows(m);
assert(sibs(3).join("|") === sibs(3).slice().sort().reverse().join("|"), "Z-A reverses within a sub-container too");

E.Prefs.sort = "recent";
rows = E.rows(m);
const rec = sibs(3);
E.Prefs.sort = "oldest";
rows = E.rows(m);
assert(rec.join("|") === sibs(3).slice().reverse().join("|"), "most-recent and least-recent are exact inverses (first-seen order is tracked, since the payload has no timestamps)");

// ---- flat view -----------------------------------------------------------
E.Prefs.sort = "alpha";
E.Prefs.containerView = false;
rows = E.rows(m);
assert(rows.length === ITEMS.length && rows.every(r => r.depth === 0), "with container view off every item is one flat, evenly-ranked list");
assert(sorted(rows.map(r => r.obj.name)), "the flat list honours the dropdown's sort");

// ---- search / filter -----------------------------------------------------
E.Prefs.containerView = true;
E.Prefs.filter = "cellar";
rows = E.rows(m);
const names = rows.map(r => r.obj.name);
assert(names.indexOf("key to the cellar") !== -1, "searching finds the matching item");
assert(names.indexOf("keyring") !== -1 && names.indexOf("trenchcoat") !== -1, "a match keeps its whole container path, so a hit inside a sub-container is still reachable");
assert(names.indexOf("lantern") === -1, "non-matching branches are dropped");
E.Prefs.filter = "";

// ---- drop legality -------------------------------------------------------
assert(E.dropCommand(m, m.byId["11"], m.byId["3"]) === "put umbrella in keyring", "dropping onto an open container issues a real put-in command");
assert(E.dropCommand(m, m.byId["11"], m.byId["8"]) === null, "a CLOSED container refuses the drop");
assert(E.dropCommand(m, m.byId["4"], { id: 99, name: "Yourself", self: true, attrs: {} }) === "take key to the house", "dropping onto the self node takes the item out of its container");
assert(E.dropCommand(m, m.byId["1"], m.byId["3"]) === null, "a container cannot be dropped into its own descendant (no cycles)");
assert(E.dropCommand(m, m.byId["3"], m.byId["3"]) === null, "a container cannot be dropped into itself");
assert(E.isDescendant(m, m.byId["1"], 4), "descendant detection reaches through sub-containers, not just direct children");

// ---- D125: grab handle + non-stacking sheets (source contract) ----------
const eqJs = fs.readFileSync(path.resolve(__dirname, "..", "js", "EquipmentUI.js"), "utf8");
const mapJs = fs.readFileSync(path.resolve(__dirname, "..", "js", "Map.js"), "utf8");
const plCss = fs.readFileSync(path.resolve(__dirname, "..", "css", "ParchLock.css"), "utf8");

assert(/equip-grip/.test(eqJs), "each draggable item bar carries a dedicated grab handle");
assert(/bindDrag\(grip, o, m, el\)/.test(eqJs), "drags start from the handle only, not from anywhere on the row");
assert(/\.equip-row \{[^}]*touch-action: pan-y/.test(plCss), "the item row keeps vertical panning, so the sheet stays scrollable");
assert(/\.equip-grip \{[^}]*touch-action: none/.test(plCss), "only the handle opts out of touch scrolling");
assert(/\.equip-grip \{[^}]*position: absolute/.test(plCss), "the handle FLOATS above the bar, out of flow, so it interrupts nothing and costs the name no width");
assert(/\.equip-name \{[^}]*flex: 1 1 auto/.test(plCss), "the item name gets the full width of the bar");
assert(/\.equip-grip \{[^}]*opacity: 0\.1[0-9]/.test(plCss), "the handle is faint at rest so it cannot compete with the item description");
assert(!/\.equip-dragging \{[^}]*opacity:/.test(plCss), "dragging outlines the row rather than fading the text being read");
assert(/removeClass\("equip-open"\)\.addClass\("map-open"\)/.test(mapJs), "opening the map swaps away from equipment instead of stacking on top of it");
assert(/body\.map-open\.equip-open #map \{ display: none/.test(plCss), "a structural backstop guarantees the two sheets can never render stacked");

// ---- D127: drag auto-scroll + mid-drag render deferral -------------------
// A deep tree is taller than the sheet, so the row you need (often Yourself,
// i.e. "take it out of its container") is routinely off screen. Holding the
// dragged line at an edge must scroll the list to reach it.
const R = { top: 100, bottom: 400 };   // a 300px-tall sheet
assert(E.edgeDelta(R, 250) === 0, "no auto-scroll while the pointer is in the middle of the sheet");
assert(E.edgeDelta(R, 110) < 0, "holding near the top edge scrolls the list up");
assert(E.edgeDelta(R, 390) > 0, "holding near the bottom edge scrolls the list down");
assert(E.edgeDelta(R, 101) < E.edgeDelta(R, 150), "speed ramps with depth into the edge zone: deeper is faster");
assert(Math.abs(E.edgeDelta(R, 100)) <= E.EDGE_MAX + 0.001, "scroll speed is capped at EDGE_MAX per frame");
assert(Math.abs(E.edgeDelta(R, -500)) <= E.EDGE_MAX + 0.001, "dragging far past the edge does not run away");
assert(E.edgeDelta(R, R.top + E.EDGE + 1) === 0, "the edge zone ends exactly where it should");
assert(E.edgeDelta(null, 250) === 0, "a missing scroller is handled rather than throwing");

assert(/_renderPending/.test(eqJs), "a re-render arriving mid-drag is deferred, not applied");
assert(/if \(EquipmentUI\._drag \|\| EquipmentUI\._press\)[\s\S]{0,120}_renderPending = true;[\s\S]{0,40}return;/.test(eqJs),
    "Render bails out while a drag is active -- rebuilding the list would detach the grip holding the pointer capture and abort the player's drag mid-gesture");
assert(/updateHover\(d, d\.lastX, d\.lastY\)/.test(eqJs),
    "the drop target is re-resolved on each auto-scroll frame, since rows move under a stationary pointer");
assert(/stopAutoScroll\(\)/.test(eqJs) && /cancelAnimationFrame/.test(eqJs), "the auto-scroll loop is cancelled on drop and on cancel");

// ---- D128: tutorial example ("ghost") items ------------------------------
// The tour runs over a REAL module, and plenty of modules start you with
// nothing. A container tree cannot be taught by pointing at a blank panel.
assert(Array.isArray(E.DEMO_ITEMS) && E.DEMO_ITEMS.length > 0, "a sample inventory exists for modules that start you empty-handed");
assert(E.DEMO_ITEMS.every(o => o.demo === true), "every sample item is flagged as an example");

// It must demonstrate the hard part: a container inside a worn container.
const dParent = {};
E.DEMO_ITEMS.forEach(o => { (dParent[String(o.parentId)] = dParent[String(o.parentId)] || []).push(o); });
function demoDepth(id, seen) {
    seen = seen || {}; if (seen[id]) return 0; seen[id] = true;
    return 1 + Math.max(0, ...(dParent[id] || []).map(k => demoDepth(String(k.id), seen)));
}
assert(demoDepth("demo-self") >= 4, "the sample nests three levels under Yourself, so sub-containers are actually demonstrable");
assert(E.DEMO_ITEMS.some(o => o.attrs && o.attrs.worn && o.attrs.container), "the sample includes a WORN container, mirroring the real trenchcoat > keyring > key case");
assert(E.DEMO_ITEMS.some(o => o.attrs && o.attrs.container && !o.attrs.open), "the sample includes a closed container, so the refuse-drop rule has something to point at");

// Examples must never displace a module that really does start you with gear.
E._demo = true;
global.WorldModel.lastPayload = { playerId: 99, inventory: ITEMS };
assert(E.demoActive() === false, "a module that DOES start you with items never shows examples");
global.WorldModel.lastPayload = { playerId: 99, inventory: [] };
assert(E.demoActive() === true, "examples are used only when the player genuinely has nothing");
E._demo = false;
assert(E.demoActive() === false, "examples never appear outside the tutorial");
global.WorldModel.lastPayload = { playerId: 99, inventory: ITEMS };

const tutJs = fs.readFileSync(path.resolve(__dirname, "..", "js", "Tutorial.js"), "utf8");
assert(/SetDemo\(true\)/.test(tutJs) && /SetDemo\(false\)/.test(tutJs), "the tour turns examples on for the equipment steps and off again when it leaves");
assert(/emptyBody/.test(tutJs) && /mapIsEmpty/.test(tutJs), "steps about an unexplored map use different wording instead of describing a blank panel as though it were full");

// A quiet status turn may temporarily own the prompt at pointer release.
const oldTimeout = global.setTimeout, oldClear = global.clearTimeout;
let retry = null;
global.setTimeout = fn => { retry = fn; return 1; };
global.clearTimeout = () => { retry = null; };
global.Message = { IsOpen: false };
global.UndoRestoreSync = { generation: 1 };
global.StatTracker = { _probeActive: {} };
const input = { value: '' };
document.querySelector = () => input;
const oldOpen = E.IsOpen;
E.IsOpen = () => true;
const sentBefore = submitted.length;
E.submitDrop(7, 1);
assert(submitted.length === sentBefore && typeof retry === 'function', 'drop waits for silent status ownership without losing the gesture');
StatTracker._probeActive = null;
retry();
assert(submitted[submitted.length - 1] === 'put flask in trenchcoat', 'pending drop revalidates and submits after the probe');
StatTracker._probeActive = {};
E.submitDrop(7, 1);
UndoRestoreSync.generation++;
const beforeCancel = submitted.length;
StatTracker._probeActive = null;
retry();
assert(submitted.length === beforeCancel, 'restore generation cancels a pending drop');
input.value = 'unfinished command';
E.submitDrop(7, 1);
assert(submitted.length === beforeCancel && input.value === 'unfinished command', 'drop never overwrites a player draft');
E.IsOpen = oldOpen;
global.setTimeout = oldTimeout; global.clearTimeout = oldClear;

// D205 exercises the same analyzer/persistence path, not a canned allowedVerbs stub.
eval(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'ActionSynth.js'), 'utf8'));
eval(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'AttrCalibrator.js'), 'utf8'));
global.ActionSynth = ActionSynth;
global.AttrCalibrator = AttrCalibrator;
let gameKey = 'd205-fixture';
const dictCalls = [], dictionary = new Set(['take','drop','examine','wear','remove','wield','switch','on','off','apply']);
Actionable.isGameWord = word => { dictCalls.push(word); return dictionary.has(word); };
Actionable.referenceFor = obj => ({noun: obj.name, unique: true, verified: true});
Actionable.disambiguatedNoun = obj => obj.name;
Actionable.payloadPool = () => WorldModel.lastPayload.inventory;
AttributeSchema._getMem = () => new Uint8Array(128);
AttributeSchema._findIdByName = () => 12;
global.ZRamReader = {gameIdentityKey: () => gameKey};
AttrCalibrator.hydratedForGame = null;
const prepare = (id, command) => {
    const turn = {submissionId:id, command, source:'player', analyzerSnapshots:{'diag-verbSuccess':'You wield the lantern.'}};
    const prepared = AttrCalibrator.analyzers.verbSuccess.prepare(turn);
    return {turn, prepared};
};
let learned = prepare(1, 'wield lantern');
assert(!!learned.prepared, 'new dictionary-owned wield command reaches bounded analyzer with exact physical object');
AttrCalibrator.analyzers.verbSuccess.analyze(learned.turn);
assert(!AttrCalibrator.exactFormsFor(12).includes('wield'), 'one unconfirmed behavior does not license auto-submit');
learned = prepare(2, 'wield lantern');
AttrCalibrator.analyzers.verbSuccess.analyze(learned.turn);
assert(AttrCalibrator.exactFormsFor(12).includes('wield'), 'two independent accepted wield submissions confirm exact object form');
AttrCalibrator.analyzers.verbSuccess.analyze(learned.turn);
assert(AttrCalibrator.table.objects['12'].exactForms.wield.confirmations === 2, 'analyzer replay cannot double-count exact-form evidence');
AttrCalibrator.hydratedForGame = null;
AttrCalibrator.table = {version:2,verbs:{},objects:{}};
assert(AttrCalibrator.exactFormsFor(12).includes('wield'), 'new wield form survives real localStorage hydrate roundtrip');
gameKey = 'other-module';
assert(!AttrCalibrator.exactFormsFor(12).includes('wield'), 'new exact form cannot leak across module identity');
gameKey = 'd205-fixture';
assert(AttrCalibrator.dictionaryForm('switch on') && !dictCalls.includes('switch on'), 'multiword form checks separate literal tokens, never phrase lookup');
assert(!AttrCalibrator.dictionaryForm('turn on'), 'missing synonym head is not rewritten into an emitted form');
const rejected = prepare(3, 'apply lantern');
rejected.turn.analyzerSnapshots['diag-verbSuccess'] = 'Which do you mean, the lantern or the lamp?';
AttrCalibrator.analyzers.verbSuccess.analyze(rejected.turn);
assert(!AttrCalibrator.exactFormsFor(12).includes('apply'), 'ambiguous wrong-arity response cannot train a lexical suggestion');
const ordinaryRules = JSON.stringify(ActionSynth.rules);
assert(!Object.values(ActionSynth.rules).flat().includes('wield'), 'learner does not widen generic ActionSynth rules');
const model = E.model(), lantern = model.byId['12'];
let menu = E.yourselfCommands(lantern, model);
assert(menu.some(x=>x.Form==='wield'&&x.Enter) && menu.some(x=>x.Form==='apply'&&!x.Enter), 'confirmed exact form submits while lexical-only apply remains editable');
dictionary.delete('wield');
assert(!E.yourselfCommands(lantern, model).some(x=>x.Form==='wield'), 'dictionary absence removes wield without invented alternative');
dictionary.add('wield');
const wearable = {id:20,name:'hat',parentId:99,attrs:{wearable:true}};
assert(!E.yourselfCommands(wearable, model).some(x=>x.Form==='remove'), 'held not worn candidate suppresses remove');
assert(E.yourselfCommands({...wearable,attrs:{worn:true,wearable:true}},model).every(x=>['remove','examine'].includes(x.Form)), 'worn candidates preserve positional suppression');
assert(E.yourselfCommands(model.byId['2'],model).every(x=>x.Form==='take'), 'nested item still offers provider take rather than conflicting RPG forms');
const filled=[];global.Input={Inject:(c,enter)=>filled.push([c,enter])};
input.value='';E.IsOpen=()=>true;
E.selectYourselfAction(12,'apply',false,UndoRestoreSync.generation,E.seqKey());
assert(filled.some(x=>x[0]==='apply lantern'&&x[1]===false), 'lexical suggestion fills without submitting');
input.value='draft';
const filledBefore=filled.length;
E.selectYourselfAction(12,'apply',false,UndoRestoreSync.generation,E.seqKey());
assert(filled.length===filledBefore,'suggestion cannot overwrite player draft');
input.value='';StatTracker._probeActive={};
assert(!E.interactionReady(UndoRestoreSync.generation,E.seqKey()),'probe owns input and blocks hold');
StatTracker._probeActive=null;Message.IsOpen=true;
assert(!E.interactionReady(UndoRestoreSync.generation,E.seqKey()),'modal blocks hold');
Message.IsOpen=false;
assert(!E.interactionReady(UndoRestoreSync.generation-1,E.seqKey()),'generation mismatch blocks selection');
const realRowAt=E.rowAt, realOpen=E.openYourselfRadial, realNow=Date.now;
let now=0, opened=0, overSelf=true;
Date.now=()=>now;
E.rowAt=()=>overSelf?{_equipObj:{self:true,id:99},classList:{add(){}}}:null;
E.openYourselfRadial=()=>opened++;
const drag={id:'12',obj:lantern,model,el:{},generation:UndoRestoreSync.generation,moduleKey:E.seqKey()};
E.updateHover(drag,0,0);now=749;E.updateHover(drag,0,0);
assert(!opened,'short dwell preserves ordinary drop');
overSelf=false;E.updateHover(drag,0,0);overSelf=true;now=800;E.updateHover(drag,0,0);now=1500;E.updateHover(drag,0,0);
assert(!opened,'leaving and retargeting reset dwell');
now=1550;E.updateHover(drag,0,0);
assert(opened===1,'continuous Yourself dwell opens at documented750ms threshold');
Date.now=realNow;E.rowAt=realRowAt;E.openYourselfRadial=realOpen;E.IsOpen=oldOpen;
assert(JSON.stringify(ActionSynth.rules)===ordinaryRules,'all ordinary rule lists remain unchanged');

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
