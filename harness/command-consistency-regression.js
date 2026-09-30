const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const handlers = {}, subscribers = {};
let visible = true, value = '', injected = [], menu = [];
const chain = {
    off() { return this; },
    on(event, selector, handler) { handlers[event] = handler; return this; },
    empty() { return this; }
};
const sandbox = {
    console, document: {}, window: {}, setTimeout() {},
    $: selector => selector === '.Input.LineInput' || selector === '.Input.LineInput:visible'
        ? { length: visible ? 1 : 0 }
        : selector === '#dialog' ? { length: 0 } : chain,
    Message: { IsOpen: false },
    TurnRecorder: { subscribeAcceptedSubmit(id, fn) { subscribers[id] = fn; } },
    Input: {
        Clear() { value = ''; }, Focus() {},
        Inject(text, enter) {
            if (!visible || (enter && sandbox.Message.IsOpen)) return false;
            value += text;
            injected.push({ text, enter });
            return true;
        }
    },
    WorldModel: { lastPayload: null },
    ZRamProvider: { getMem: () => ({}) },
    ZRamReader: { hasDictionaryWord: (_mem, word) => word === 'use' },
    ParchLockQol: { OpenRadial(x, y, slices) { menu = slices; } },
    AttrCalibrator: { defaultInspectVerb: () => 'examine', inspectVerbCurrentlyDisabled: () => false }
};
vm.createContext(sandbox);
for (const file of ['Actionable', 'ActionSynth', 'Autocomplete']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file + '.js'), 'utf8'), sandbox);
}
const { Actionable: A, ActionSynth: S, Autocomplete: C } = sandbox;
const coin = { id: 1, name: 'display coin', parentId: 99, attrs: {} };
const box = { id: 2, name: 'display box', attrs: { container: true } };
const npc = { id: 3, name: 'display guard', attrs: { animate: true } };
const ring = { id: 4, name: 'ring', parentId: 99, attrs: { worn: true, takeable: true } };
const payload = { engineMode: 'structural', playerId: 99, discoveredObjects: [box, npc, ring], inventory: [coin, ring], exits: [{ label: 'exit-91', command: 'x1' }] };
sandbox.WorldModel.lastPayload = payload;
A.VerifiedNouns = { 1: 'penny', 2: 'chest', 3: 'soldier' };
A.Init(); A.Init();
assert.equal(Object.keys(subscribers).length, 1);
assert.equal(A.Submit('wait'), true);
assert.equal(A.usageBonus('wait'), 0);
subscribers['actionable-usage']({ submissionId: 1, command: 'wait', source: 'typed' });
subscribers['actionable-usage']({ submissionId: 2, command: 'wait', source: 'inject' });
assert.equal(A.usageBonus('wait'), 12);
visible = false;
assert.equal(A.Submit('wait'), false);
assert.equal(A.usageBonus('wait'), 12);
visible = true;
sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled = () => true;
injected = [];
handlers['click.pmAct'].call({ dataset: { noun: 'penny', objectId: '2' } }, { preventDefault() {}, stopPropagation() {} });
assert(!injected.some(c => c.text.startsWith('examine')));
payload.discoveredObjects.push({ id: 5, name: 'stone', attrs: {} });
injected = [];
handlers['click.pmAct'].call({ dataset: { noun: 'stone', objectId: '5' } }, { preventDefault() {}, stopPropagation() {} });
assert.equal(injected.length, 0);
sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled = () => false;
A.Open('display coin', 'inventory', 0, 0, 1);
menu.find(s => s.Label === 'Put in...').Action();
assert.equal(menu.find(s => s.Label === 'display box').Command, 'put penny in chest');
A.Open('display coin', 'inventory', 0, 0, 1);
menu.find(s => s.Label === 'Use with...').Action();
assert.equal(menu.find(s => s.Label === 'display box').Command, 'use penny with chest');
A.Open('display guard', 'object', 0, 0, 3);
menu.find(s => s.Label === 'Ask about...').Action();
assert.equal(menu.find(s => s.Label === 'display coin').Command, 'ask soldier about penny');
const ringCommands = S.collectFromPayload(payload).filter(c => c.objectId === 4);
assert.equal(ringCommands.length, 2);
assert(ringCommands.some(c => c.command === 'remove ring'));
assert(!ringCommands.some(c => c.command === 'take ring'));
assert(S.commandsForPayloadObjectId(4, 'room').some(c => c.command === 'remove ring'));
assert(C.UsesRam('take '));
assert(!C.UsesRam('/goto '));
assert(C.RamCommandSeeds().includes('x1'));
assert(C.RamSuggestions('put penny').includes('put penny in '));
C.InjectCommand('put penny in ', true);
assert.equal(injected[injected.length - 1].enter, false);
C.InjectCommand('examine chest', true);
assert.equal(value, 'examine chest');
assert.equal(injected[injected.length - 1].enter, true);
C.CurrentToggleWord = '';
C.ToggleSuggestions('examine ch');
assert.equal(value, 'examine chest');
console.log('PASS command consistency: usage, disabled click, target aliases, inventory context, structural autocomplete');
