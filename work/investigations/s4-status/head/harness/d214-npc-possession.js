// Isolated reader fixtures exercise actual product code, not native VM proof.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const c = { window: {}, WorldModel: { lastPayload: {} } };
vm.createContext(c);
vm.runInContext(fs.readFileSync('js/Actionable.js', 'utf8'), c);
const A = c.Actionable;
A.vocabularyKey = w => String(w).toLowerCase();
let trusted = true, actorParent = 1, childParent = 10, attrs = {}, hidden = false, siblings = [20];
c.ZRamProvider = { getMem: () => ({}) };
c.AttrCalibrator = { hasConfirmedFlag: () => false, confirmedInventoryRootId: () => 2 };
c.ZRamReader = {
  informAttributeNames: () => trusted ? { bits: { animate: 0 } } : null,
  executableLayoutFacts: () => ({ inventoryHiddenAttribute: 3 }), header: () => ({ version: 5 }),
  objectLinks: (_, id) => ({ parent: id === 10 ? actorParent : childParent, attrBytes: [hidden ? 16 : 0] }),
  attrsFromObject: (_, id) => id === 10 ? { animate: true } : attrs,
  children: () => siblings, parserWordsAny: () => ['green', 'sword'], shortName: () => ''
};
const p = { roomId: 1, playerId: 2 }, base = [{ id: 10, name: 'guard', aliases: ['guard'] }, { id: 30, name: 'sword', aliases: ['sword'] }];
let count = 0;
function check(value, label) { assert(value, label); count++; console.log('PASS:', label); }
const run = text => A.observedPossessions(p, base, text);
check(run('green sword').length === 1, 'distinguishing printed possession admitted');
check(run('sword').length === 0, 'shared generic noun rejected');
siblings = [20, 21]; check(run('green sword').length === 0, 'identical sibling vocabulary rejected'); siblings = [20];
for (const flag of ['absent', 'concealed', 'worn']) { attrs = { [flag]: true }; check(run('green sword').length === 0, flag + ' possession excluded'); } attrs = {};
hidden = true; check(run('green sword').length === 0, 'native hidden attribute excluded'); hidden = false;
childParent = 11; check(run('green sword').length === 0, 'changed child parent excluded'); childParent = 10;
actorParent = 3; check(run('green sword').length === 0, 'actor outside current room excluded'); actorParent = 1;
trusted = false; check(run('green sword').length === 0, 'untrusted animate layout excluded'); trusted = true;
p.playerId = 10; check(run('green sword').length === 0, 'player holder excluded'); p.playerId = 2;
check(run('').length === 0, 'unobserved raw child excluded');
const possession = { id: 20, name: 'green sword', aliases: ['green', 'sword'], possessedBy: 10 };
A.payloadPool = () => base.concat(possession);
c.ActionSynth = { inspectVerbDisabled: () => false, defaultInspectVerb: () => 'examine' };
check(A.resolveObjectCommands(20, 'room')[0].command === 'examine green sword', 'inspection uses unique reference rather than shared head noun');
c.ActionSynth.inspectVerbDisabled = () => true;
check(A.resolveObjectCommands(20, 'room').length === 0, 'disabled inspection policy preserved');
c.ActionSynth.inspectVerbDisabled = () => false;
const hyphenated = { id: 40, name: 'long-stemmed rose', aliases: ['long-stemmed','rose'], possessedBy: 10 };
A.payloadPool = () => [hyphenated, { id: 41, name: 'short-stemmed rose', aliases: ['short-stemmed','rose'] }];
check(A.resolveObjectCommands(40, 'room')[0].command === 'examine long-stemmed rose', 'generic hyphenated descriptor preserves unique command over shared head');
console.log(count + ' PASS / 0 FAIL');
