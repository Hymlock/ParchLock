# Z1 lightForms — Spellbreaker: already served

Digest `2d097ac9e4081b68658d0331345176946253cb349ed66eeff88533826cae29d0`

## Existing fact
```js
"attributeMap": { ..., "on": 8, ... }
```
Comment (ModuleStatFactsClaude.js ~296–300): ONBIT 8 is magical glow state; V-FROTZ sets it, V-LAMP-OFF clears it; native turn off burin/bottle after FROTZ.

## Conclusion
**Already served** by `attributeMap.on: 8` (switchable/on path). No separate `lightForms` draft — radial Turn off for frotzed objects is owned by the on bit, same family as Zork III lamp-via-switchable case (claude #6065).

No js/ change.
