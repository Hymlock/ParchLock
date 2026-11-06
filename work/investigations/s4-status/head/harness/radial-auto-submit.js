// Operator rule (2026-10-25, bus claim #5299): a DIRECT, complete action
// chosen from ANY radial or menu runs at once. Only a genuinely incomplete
// compound/addition stem ("put X in ", "give X to ", "unlock X with ",
// "say ") is left in the command line for the player to finish.
//
// Live report: Equipment panel, hold on the Yourself row, choose "Wield" for
// the steel main gauche -> "wield gauche" was only pasted into the prompt.
// Cause: per-closure Enter:false ("unproven vocabulary") checks prefilled
// instead of submitting. Fix: one shared decision, Actionable.runChosenCommand.
//
// Pure Node: the REAL js/ActionSynth, AttrCalibrator, SemanticActions,
// Actionable, EquipmentUI and (section 6) Qol run in one vm context against
// stubs; only Actionable.Submit (the engine send) is spied. The spy returns
// submitOk so the fail-closed contract (no usage note on a refused send) is
// exercised too.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function check(v, m) { if (v) { pass++; console.log('PASS:', m); } else { fail++; console.log('FAIL:', m); } }

let sent = [], draft = '', processed = [], dismissed = 0, focused = 0, mobile = false, menu = null, learned = {};
let submitOk = true, dialogOpen = false, usage = [], qolClick = null, shownBody = '';
const input = { value: '' };
const store = {};
// Minimal jQuery: '#dialog' presence, '.qol-command' click capture and
// $(button).data('command') for the dialog-button simulation in section 6.
const $ = sel => {
    if (sel && typeof sel === 'object' && '__cmd' in sel) return { data: k => (k === 'command' ? sel.__cmd : undefined) };
    if (sel === '.qol-command') return { click(fn) { qolClick = fn; } };
    if (typeof sel === 'string' && sel.charAt(0) === '<') {
        let v = '';
        const el = { text(x) { v = String(x); return el; }, html: () => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') };
        return el;
    }
    return { length: sel === '#dialog' ? (dialogOpen ? 1 : 0) : 1 };
};
const ctx = {
    console, $, window: {}, setTimeout: () => 0, clearTimeout() {},
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    document: {
        readyState: 'complete', addEventListener() {}, getElementById: () => null, querySelectorAll: () => [],
        querySelector: () => input,
        body: { classList: { contains: c => c === 'pl-mobile' ? mobile : false, add() {}, remove() {} } }
    },
    ParchLock: { GameFilename: 'rpg.ulx' },
    AttributeSchema: { isTrulyWorn: a => !!(a && a.worn), _getMem: () => new Uint8Array(128), _findIdByName: () => 12 },
    ZRamReader: { gameIdentityKey: () => 'radial-auto-submit', isInformCompiled: () => true },
    Message: { IsOpen: false }, UndoRestoreSync: { generation: 1 }, StatTracker: { _probeActive: null },
    Input: {
        Clear() { draft = ''; }, Inject(t) { draft = t; }, Focus() { focused++; },
        Process() { processed.push(draft); draft = ''; }, DismissKeyboard() { dismissed++; }
    },
    ParchLockQol: { GetRadialCommands: () => [], OpenRadial(x, y, s, context) { menu = { s, context }; } },
    LearnedWords: {
        commands: o => learned[o.id] || [], commandCurrent: () => true,
        candidates: () => [], commandLabel: (id, f, l) => l
    },
    WorldModel: { lastPayload: {} }
};
vm.createContext(ctx);
for (const f of ['ActionSynth', 'AttrCalibrator', 'SemanticActions', 'Actionable', 'EquipmentUI'])
    vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8') + '\n;this.' + f + '=' + f + ';', ctx, { filename: f + '.js' });
const A = ctx.Actionable, E = ctx.EquipmentUI, AC = ctx.AttrCalibrator;
A.Submit = (cmd, source) => { if (submitOk) sent.push({ cmd, source }); return submitOk; };
A.noteIntentUsage = intent => { usage.push(intent); };
const dictionary = new Set(['take', 'drop', 'examine', 'wield', 'wear', 'remove', 'apply', 'put', 'in', 'give', 'to', 'rub', 'unlock', 'with']);
A.isGameWord = w => dictionary.has(w);
ctx.SemanticActions.CutoverFlag.isEnabled = () => false;
function reset() { sent = []; draft = ''; processed = []; dismissed = 0; focused = 0; menu = null; input.value = ''; usage = []; submitOk = true; dialogOpen = false; ctx.Message.IsOpen = false; }

// ---- 1. the shared decision itself -------------------------------------
reset();
check(A.runChosenCommand('wield gauche') === true && sent.length === 1 && sent[0].cmd === 'wield gauche' && draft === '',
    'complete direct command submits at once');
reset();
A.runChosenCommand('rub pellet', 'ambiguous-reference');
check(sent.length === 1 && sent[0].source === 'ambiguous-reference', 'submission source is preserved');
for (const stem of ['put gauche in ', 'give gauche to ', 'unlock door with ', 'say ', 'cast frotz at ']) {
    reset();
    check(A.runChosenCommand(stem) === false && sent.length === 0 && draft === stem && focused === 1,
        'compound/addition stem prefills and waits: "' + stem + '"');
}
reset(); mobile = true;
A.runChosenCommand('put gauche in ');
check(sent.length === 0 && draft === 'put gauche in ' && dismissed === 1 && focused === 0, 'mobile stem prefill dismisses the keyboard instead of focusing');
mobile = false;
reset();
check(A.runChosenCommand('   ') === false && sent.length === 0 && draft === '', 'empty choice does nothing');
reset();
A.runChosenCommand('/map');
check(sent.length === 0 && processed[0] === '/map', 'complete app command (/map) runs through Input.Process');
reset(); ctx.Message.IsOpen = true;
check(A.runChosenCommand('/map') === false && processed.length === 0 && draft === '', '/map is refused while a Message dialog is open (fail closed, like Submit)');
reset(); dialogOpen = true;
check(A.runChosenCommand('/map') === false && processed.length === 0, '/map is refused while #dialog is open');
reset(); submitOk = false;
check(A.runChosenCommand('wield gauche') === false && sent.length === 0, 'runChosenCommand reports false when Submit refuses');
check(A.isCompleteCommand('wield gauche') && !A.isCompleteCommand('put gauche in ') && !A.isCompleteCommand(''), 'isCompleteCommand: complete vs stem');

// ---- 2. Yourself hold radial (the reported path) -----------------------
const gauche = { id: 12, name: 'steel main gauche', aliases: ['steel', 'main', 'gauche'], parentId: 99, attrs: {} };
const vial = { id: 13, name: 'spotted vial', aliases: ['spotted', 'vial'], parentId: 99, attrs: {} };
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [gauche, vial], discoveredObjects: [] };
A.payloadPool = () => ctx.WorldModel.lastPayload.inventory.concat(ctx.WorldModel.lastPayload.discoveredObjects);
E.IsOpen = () => true;
const model = E.model();
const forms = E.yourselfCommands(model.byId['12'], model);
const wield = forms.find(x => x.Form === 'wield');
check(!!wield && wield.Enter === false, 'Wield is offered on Yourself as a lexical (Enter:false) form -- the reported case');
const noun = A.referenceFor(gauche).noun;
reset();
E.openYourselfRadial({ id: '12', generation: ctx.UndoRestoreSync.generation, moduleKey: E.seqKey(), lastX: 1, lastY: 1, pointerId: 1, el: null });
const wieldSlice = menu && menu.s.find(s => s.Form === 'wield');
check(!!wieldSlice && wieldSlice.Command === 'wield ' + noun, 'Yourself radial offers "wield ' + noun + '"');
wieldSlice.Action();
check(sent.length === 1 && sent[0].cmd === 'wield ' + noun && draft === '', 'choosing Wield from Yourself SUBMITS (no extra Send)');
const others = menu.s.filter(s => s.Form !== 'wield');
let allRan = others.length > 0;
others.forEach(s => { reset(); s.Action(); if (!(sent.length === 1 && sent[0].cmd === s.Command && draft === '')) allRan = false; });
check(allRan, 'every Yourself form submits at once: ' + others.map(s => s.Form).join(', '));
reset();
input.value = 'half typed';
E.selectYourselfAction(12, 'wield', false, ctx.UndoRestoreSync.generation, E.seqKey());
check(sent.length === 0 && draft === '', 'a player draft still blocks the Yourself radial (no overwrite, no send)');
reset();
ctx.StatTracker._probeActive = {};
E.selectYourselfAction(12, 'wield', false, ctx.UndoRestoreSync.generation, E.seqKey());
check(sent.length === 0, 'a status probe owning input still blocks the Yourself radial');
ctx.StatTracker._probeActive = null;
reset();
E.selectYourselfAction(12, 'wield', false, ctx.UndoRestoreSync.generation - 1, E.seqKey());
check(sent.length === 0, 'a stale restore generation still blocks the Yourself radial');
reset();
E.selectYourselfAction(12, 'wield', true, ctx.UndoRestoreSync.generation, E.seqKey());
check(sent.length === 0, 'a stale "proven" claim for an unproven form is still refused');

// ---- 3. object radial (the same rule from the object's own menu) ---------
const pellet = { id: 2, name: 'pellet', aliases: ['pellet'], attrs: { takeable: true }, confidence: .9, parentId: 99 };
const box = { id: 8, name: 'box', aliases: ['box'], attrs: { container: true, open: true }, parentId: 1 };
const sug = (verb, command) => ({ verb, command, objectId: 2, intent: null, Enter: false, enter: false, confidence: .8, learnedWordScope: { objectId: 2 } });
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [pellet], discoveredObjects: [] };
learned = { 2: [sug('rub', 'rub pellet')] };
reset();
A.Open('pellet', 'inventory', 1, 1, 2);
const rub = menu && menu.s.find(s => s.Command === 'rub pellet');
check(!!rub && rub.Enter === false, 'object radial carries a review-only (Enter:false) complete command');
rub.Action();
check(sent.length === 1 && sent[0].cmd === 'rub pellet' && draft === '', 'review-only complete command from the object radial SUBMITS');
learned = { 2: [sug('give to', 'give pellet to ')] };
reset();
A.Open('pellet', 'inventory', 1, 1, 2);
const giveStem = menu && menu.s.find(s => s.Label === 'Give to...');
check(!!giveStem, 'object radial carries Give to... backed by the review-only "give pellet to " stem');
giveStem.Action();
check(sent.length === 0 && draft === 'give pellet to ', 'review-only compound stem still PREFILLS');
learned = {};
reset();
A.Open('pellet', 'inventory', 1, 1, 2);
const put = menu && menu.s.find(s => /^Put in/.test(s.Label));
check(!!put, 'held object offers Put in...');
put.Action();
check(sent.length === 0 && draft === 'put pellet in ', 'Put in... with nothing to put it in PREFILLS the stem');
const porter = { id: 9, name: 'porter', aliases: ['porter'], attrs: { animate: true } };
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [pellet], discoveredObjects: [porter] };
reset();
A.Open('pellet', 'inventory', 1, 1, 2);
menu.s.find(s => s.Label === 'Give to...').Action();
const porterSlice = menu && menu.s.find(s => s.Label === 'porter');
check(!!porterSlice && sent.length === 0, 'Give to... with someone present opens the recipient picker (no send yet)');
porterSlice.Action();
check(sent.length === 1 && sent[0].cmd === 'give pellet to porter', 'choosing the recipient submits the whole compound command');
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [pellet], discoveredObjects: [box] };
reset();
A.Open('pellet', 'inventory', 1, 1, 2);
menu.s.find(s => /^Put in/.test(s.Label)).Action();
const boxSlice = menu && menu.s.find(s => s.Label === 'box');
check(!!boxSlice && sent.length === 0, 'Put in... with a container opens the target picker (no send yet)');
boxSlice.Action();
check(sent.length === 1 && sent[0].cmd === 'put pellet in box', 'choosing the target submits the whole compound command');

// ---- 3b. primary word click/tap (activatePrimary) ------------------------
const realResolve = A.resolveObjectCommands;
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [gauche], discoveredObjects: [] };
A.resolveObjectCommands = () => [{ command: 'wield gauche', Enter: false, enter: false, intent: 'i-wield' }];
reset();
check(A.activatePrimary('gauche', 'inventory', 12, 1, 1) === true && sent.length === 1 && sent[0].cmd === 'wield gauche' && draft === '' && menu === null,
    'primary click with an Enter:false complete command submits exactly once, nothing filled');
check(usage.length === 1 && usage[0] === 'i-wield', 'primary click records intent usage after an accepted send');
reset(); submitOk = false;
A.activatePrimary('gauche', 'inventory', 12, 1, 1);
check(sent.length === 0 && usage.length === 0, 'primary click records NO usage when Submit refuses');
A.resolveObjectCommands = () => [{ command: 'put gauche in ', Enter: false, intent: 'i-put' }];
reset();
check(A.activatePrimary('gauche', 'inventory', 12, 1, 1) === false && sent.length === 0 && draft === 'put gauche in ' && usage.length === 0,
    'primary click with a stem prefills and waits');
A.resolveObjectCommands = () => [];
reset();
A.activatePrimary('gauche', 'inventory', 12, 1, 1);
check(sent.length === 0 && draft === '' && !!menu, 'primary click with no primary command opens the radial');
A.resolveObjectCommands = realResolve;

// ---- 3c. target picker: no usage note when the send is refused ----------
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [pellet], discoveredObjects: [box] };
reset();
A.Open('pellet', 'inventory', 1, 1, 2);
menu.s.find(s => /^Put in/.test(s.Label)).Action();
const box2 = menu && menu.s.find(s => s.Label === 'box');
reset(); submitOk = false;
box2.Action();
check(sent.length === 0 && usage.length === 0, 'target picker records NO usage when Submit refuses');

// ---- 3d. shared-reference "Specify..." runs the inspect -------------------
const pelletA = { id: 2, name: 'pellet', aliases: ['pellet'], attrs: {}, parentId: 99 };
const pelletB = { id: 3, name: 'pellet', aliases: ['pellet'], attrs: {}, parentId: 99 };
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [pelletA, pelletB], discoveredObjects: [] };
const realShared = A.sharedObjectCommands;
A.sharedObjectCommands = () => [];
reset();
A.Open('pellet', 'inventory', 1, 1, null);
const specify = menu && menu.s.find(s => s.Label === 'Specify...');
check(!!specify, 'two identical pellets with no shared command offer Specify...');
if (specify) {
    reset();
    specify.Action();
    const insp = ctx.ActionSynth.defaultInspectVerb();
    check(sent.length === 1 && sent[0].cmd === insp + ' pellet' && sent[0].source === 'ambiguous-reference' && draft === '',
        'Specify... SUBMITS "' + insp + ' pellet" with ambiguous-reference provenance (the game asks which)');
}
A.sharedObjectCommands = realShared;

// ---- 4. More suggestions: complete commands, routed through Qol -> runChosenCommand
ctx.WorldModel.lastPayload = { playerId: 99, inventory: [gauche], discoveredObjects: [] };
ctx.ParchLockQol.GetRadialCommands = () => [{ source: 'ram-synth', Command: 'wield ' }];
const slices = [];
A.addMoreActions(slices, { kind: 'inventory', objectId: 12, noun: 'gauche' }, 1, 1);
const more = slices.find(s => s.MoreSuggestions);
reset();
more && more.Action();
const moreWield = menu && menu.s.find(s => /^wield /.test(s.Command));
check(!!moreWield && A.isCompleteCommand(moreWield.Command), 'More offers "' + (moreWield && moreWield.Command) + '" as a complete command');
reset();
A.runChosenCommand(moreWield.Command);
check(sent.length === 1 && sent[0].cmd === moreWield.Command, 'a More suggestion runs at once through the shared decision');

// ---- 5. source guards: no closure may re-introduce its own Enter:false prefill
const act = fs.readFileSync(path.join(root, 'js', 'Actionable.js'), 'utf8');
const eq = fs.readFileSync(path.join(root, 'js', 'EquipmentUI.js'), 'utf8');
const qol = fs.readFileSync(path.join(root, 'js', 'Qol.js'), 'utf8');
check(!/primaryEnter/.test(act) && /Actionable\.activatePrimary\(noun, kind, oid/.test(act) && /runChosenCommand\(primary\)/.test(act), 'primary word click routes through activatePrimary -> runChosenCommand (no private Enter gate)');
check(!/Label:"Specify\.\.\."[^\n]*Inject\(/.test(act), 'Specify... has no private Inject path');
check(!/Enter === false[^\n]*Inject\(/.test(act) && !/enter === false[^\n]*Inject\(/.test(act), 'no Actionable closure prefills on Enter:false');
check(!/Input\.Inject\(/.test(eq.slice(eq.indexOf('selectYourselfAction:'), eq.indexOf('cleanupDrag:'))) && /runChosenCommand\(/.test(eq), 'Yourself selection has no private Inject path');
const qh = qol.indexOf('T11 (operator)');
check(qh > 0 && /Actionable\.runChosenCommand\(command\)/.test(qol.slice(qh, qh + 2000)), 'Qol generic radial click (More, history-less items) uses the shared decision');

// ---- 6. Commands / History dialogs and the Tools list (real Qol.js) -------
vm.runInContext(fs.readFileSync(path.join(root, 'js', 'Qol.js'), 'utf8') + '\n;this.ParchLockQol=ParchLockQol;', ctx, { filename: 'Qol.js' });
const Q = ctx.ParchLockQol;
ctx.Message.Show = (title, body) => { shownBody = body; ctx.Message.IsOpen = true; };
ctx.Message.Hide = () => { ctx.Message.IsOpen = false; };
ctx.Input.GetAllSpecialCommands = () => ['/map', '/goto', '/history'];
ctx.ParchLockMap = { Rooms: [{ Name: 'Kitchen' }], rooms: [{ Name: 'Kitchen' }] };
function dialogButtons() {
    const out = [], re = /data-command='([^']*)'/g; let m;
    while ((m = re.exec(shownBody))) out.push(m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    return out;
}
function clickDialog(cmd) { reset(); ctx.Message.IsOpen = true; qolClick.call({ __cmd: cmd }); }
qolClick = null; shownBody = '';
Q.ShowCommands();
const cmdButtons = dialogButtons();
check(!!qolClick && cmdButtons.length > 10 && !/data-enter/.test(shownBody), 'Commands dialog renders buttons with no private data-enter gate (' + cmdButtons.length + ')');
for (const c of ['look', 'inventory', 'undo', 'n']) {
    if (!cmdButtons.includes(c)) { check(false, 'Commands dialog has "' + c + '"'); continue; }
    clickDialog(c);
    check(sent.length === 1 && sent[0].cmd === c && draft === '' && !ctx.Message.IsOpen, 'Commands dialog "' + c + '" SUBMITS at once and closes the dialog');
}
for (const c of ['examine ', 'take ', 'unlock ']) {
    if (!cmdButtons.includes(c)) { check(false, 'Commands dialog has "' + c + '"'); continue; }
    clickDialog(c);
    check(sent.length === 0 && draft === c, 'Commands dialog stem "' + c + '" PREFILLS');
}
clickDialog('/map');
check(sent.length === 0 && processed[0] === '/map' && !ctx.Message.IsOpen, 'Commands dialog /map runs through Input.Process after the dialog closes');
const gotoBtn = cmdButtons.find(c => /^\/goto .+;$/.test(c));
if (gotoBtn) { clickDialog(gotoBtn); check(processed[0] === gotoBtn, 'Commands dialog map button "' + gotoBtn + '" runs'); }
Q.GetHistory = () => ['wield gauche', 'put gauche in '];
qolClick = null; shownBody = '';
Q.ShowHistory();
const histButtons = dialogButtons();
check(histButtons.includes('wield gauche'), 'History dialog lists "wield gauche"');
clickDialog('wield gauche');
check(sent.length === 1 && sent[0].cmd === 'wield gauche' && draft === '' && !ctx.Message.IsOpen, 'History dialog past command SUBMITS at once (like the Send-hold history radial)');
const qol2 = fs.readFileSync(path.join(root, 'js', 'Qol.js'), 'utf8');
const tl = qol2.indexOf('click.pmToolsList", function');
check(tl > 0 && /if \(action\) \{ action\(\); return; \}\s*Actionable\.runChosenCommand\(command\);/.test(qol2.slice(tl, tl + 600)) && !/hitEnter/.test(qol2.slice(tl, tl + 600)) && !/data-enter/.test(qol2.slice(qol2.indexOf('BuildCommandButtons:'), qol2.indexOf('BuildCommandButtons:') + 600)), 'Tools list and Commands buttons use the shared decision; no private hitEnter/data-enter gate');

console.log('\n' + pass + ' PASS / ' + fail + ' FAIL');
if (fail) process.exit(1);
