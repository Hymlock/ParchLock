from pathlib import Path
import hashlib,json
r=Path.cwd();d=r/'work/mapping-research/items-codex/resume-20261020/review-20261027/z3-custody-prototype-r1';(d/'js').mkdir(parents=True,exist_ok=True)
files=['AttributeSchema.js','ActionSynth.js','LearnedWords.js','Actionable.js','EquipmentUI.js','ModuleStatFactsClaude.js'];hashes={}
for name in files:
 s=(r/'js'/name).read_bytes();p=d/'js'/name;assert not p.exists(),name;p.write_bytes(s);hashes['js/'+name]=hashlib.sha256(s).hexdigest()
(d/'source-manifest.json').write_text(json.dumps({'baseCommit':'10fa8bdb33c65d8fef7bffd5b27920ce3b2efeb8','scope':'Isolated prototype after R3 design consensus; not production or native consumer proof','baseHashes':hashes},indent=2))
p=d/'js/AttributeSchema.js';s=p.read_bytes();a=b'    // An authored physical garment domain, independently measured from the';assert s.count(a)==1
code='''    // Exact authored removal policy; capability alone never selects an action.
    wornRemovalForm: function (mem, objectId) {
        try {
            var fact = AttributeSchema.directPlayerWornFact(mem);
            if (!fact || fact.equipmentState.wornRemoval !== "drop" ||
                Number.isInteger(fact.wornAttribute) ||
                (ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem))) return null;
            var h = ZRamReader.header(mem), family = AttributeSchema._familyOf(mem);
            if (!h || h.version < 3 || h.version > 5 || !family ||
                family.classification !== "confirmed-zil-family" || family.evidence !== "validated") return null;
            var count = ZRamReader.objectCount(mem, h), bit = AttributeSchema.bitFor("wearable", mem);
            if (!Number.isInteger(count) || !Number.isInteger(objectId) || objectId < 2 || objectId > count ||
                bit !== fact.attributeMap.wearable) return null;
            var player = ZRamReader.resolvePlayer(mem);
            if (!player || player.ambiguous || !Number.isInteger(player.id) || player.id < 2 || player.id > count ||
                player.id === objectId || ["measured-player-global", "measured-player-object"].indexOf(player.source) < 0) return null;
            var links = ZRamReader.objectLinks(mem, objectId);
            return links && links.parent === player.id && ZRamReader.attr(links, bit) ? "drop" : null;
        } catch (eWornRemoval) { return null; }
    },

'''.replace('\n','\r\n').encode();p.write_bytes(s.replace(a,code+a))
p=d/'js/ActionSynth.js';s=p.read_bytes();a=b'    commandsForObject: (obj, context, containerName, options) => {';assert s.count(a)==1
code='''    wornRemovalScopeFor: function (obj) {
        try {
            if (!obj || obj.examineOnly || !Number.isInteger(obj.id) ||
                typeof AttributeSchema === "undefined" || !AttributeSchema.wornRemovalForm ||
                typeof Actionable === "undefined" || !Actionable.referenceFor ||
                typeof ZRamProvider === "undefined" || !ZRamProvider.getMem) return null;
            var inventory = (WorldModel.lastPayload || {}).inventory || [];
            var matches = inventory.filter(function (item) { return item && String(item.id) === String(obj.id); });
            if (matches.length !== 1 || matches[0].examineOnly) return null;
            var mem = ZRamProvider.getMem();
            if (AttributeSchema.wornRemovalForm(mem, obj.id) !== "drop" || !ActionSynth.literalAvailable("drop")) return null;
            var grammar = GrammarProvider.decodeD198(mem);
            if (!grammar || grammar.classification !== "confirmed-zil-family" || grammar.evidence !== "validated" ||
                !(grammar.templates || []).some(function (t) { return t.verb === "drop" && t.objectCount === 1 && !t.prepositions.length; })) return null;
            var ref = Actionable.referenceFor(matches[0]);
            if (!ref || !ref.unique || !ref.verified || typeof ref.noun !== "string" || !ref.noun) return null;
            var digest = ModuleLibrary.currentExecutableDigest();
            if (!digest || !ActionSynth.authoredCommandAllowed(obj.id, "drop", "inventory")) return null;
            return { kind: "wearable-direct-player-drop", digest: digest, id: obj.id, noun: ref.noun, command: "drop " + ref.noun };
        } catch (eWornScope) { return null; }
    },
    wornRemovalCommandCurrent: function (command) {
        if (!command || command.sharedMembers || !command.wornRemovalScope || command.verb !== "drop") return false;
        var scope = command.wornRemovalScope, obj = { id: Number(command.objectId) };
        var current = ActionSynth.wornRemovalScopeFor(obj);
        return !!(current && scope.kind === current.kind && scope.digest === current.digest &&
            scope.id === current.id && scope.noun === current.noun && scope.command === current.command &&
            command.command === current.command && command.objectId === current.id);
    },

'''.replace('\n','\r\n').encode();p.write_bytes(s.replace(a,code+a))
p=d/'js/ModuleStatFactsClaude.js';s=p.read_bytes();a=b'"dce7e6f757fb8379dea9da9c13cdda5412ba03fa9b70d79fb6b8c7faf5970692": {\r\n';assert s.count(a)==1;s=s.replace(a,a+b'        // PROTOTYPE ONLY: held-state semantics and useful Drop selector; native generated consumer still held.\r\n        "equipmentState": { "wornWhen": "wearable-direct-player", "wornRemoval": "drop" },\r\n');p.write_bytes(s)
print('Created isolated6file baseline; selector/schema prototype only, no production edits')
