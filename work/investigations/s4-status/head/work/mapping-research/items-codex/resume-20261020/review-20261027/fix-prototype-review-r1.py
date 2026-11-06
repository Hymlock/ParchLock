from pathlib import Path
import json,hashlib
r=Path.cwd();d=r/'work/mapping-research/items-codex/resume-20261020/review-20261027/z3-custody-prototype-r1';p=d/'js/SemanticActions.js';assert not p.exists();raw=(r/'js/SemanticActions.js').read_bytes();p.write_bytes(raw);m=json.loads((d/'source-manifest.json').read_text());m['baseHashes']['js/SemanticActions.js']=hashlib.sha256(raw).hexdigest();(d/'source-manifest.json').write_text(json.dumps(m,indent=2));s=p.read_text(encoding='utf-8');a='            if (c.learnedWordScope) form.learnedWordScope = c.learnedWordScope;';assert s.count(a)==1;s=s.replace(a,a+'\n            if (c.wornRemovalScope) form.wornRemovalScope = c.wornRemovalScope;');p.write_text(s,encoding='utf-8')
p=d/'js/AttributeSchema.js';s=p.read_text(encoding='utf-8');a='    wornRemovalForm: function (mem, objectId) {\n        try {\n            var fact =';b='''    wornRemovalForm: function (mem, objectId) {
        try {
            var live = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            if (!mem || !live || !mem.buffer || mem.buffer !== live.buffer ||
                mem.byteOffset !== live.byteOffset || mem.byteLength !== live.byteLength) return null;
            var fact =''';assert s.count(a)==1;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
p=d/'selector-controls.cjs';s=p.read_text();a="test('exact measured direct custody',()=>{},'drop');";b=a+"test('stale same-header buffer',x=>x.mem=new Uint8Array(x.mem));test('wrong live view range',x=>x.mem=x.mem.subarray(1));test('same live buffer/range view',x=>x.mem=new DataView(x.mem.buffer),'drop');";assert s.count(a)==1;s=s.replace(a,b);s=s.replace("path.join(d,'selector-controls.json')","path.join(d,'selector-controls-r2.json')");p.write_text(s)
