// D219 audit: run StatusGridDecoder.decode (default context) over every
// room/name string recorded in work/mapping-research/*/ (observations and
// world snapshots) and list names the new legacy-column rule would reject
// (roomLabel '' with >= 1 metric). Usage: node work/investigations/d219-name-collision-census.cjs
const fs = require('fs'), path = require('path'); const D = require('../../js/StatusGridDecoder.js');
const root = path.resolve(__dirname, '../mapping-research'); const names = new Map();
for (const g of fs.readdirSync(root)) {
    const dir = path.join(root, g); try { if (!fs.statSync(dir).isDirectory()) continue; } catch (e) { continue; }
    for (const f of ['observations.json', 'world-390.json', 'world-1280.json']) {
        let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { continue; }
        const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) { o.forEach(walk); return; }
            for (const k of Object.keys(o)) { const v = o[k]; if (/^(Name|name|roomName|heading)$/.test(k) && typeof v === 'string' && v.trim()) names.set(v.trim(), g); else walk(v); } };
        walk(j);
    }
}
const hits = []; for (const [nm, g] of names) { const d = D.decode(nm); if (d.roomLabel === '' && (d.metrics || []).length) hits.push(g + ' :: ' + JSON.stringify(nm) + ' -> ' + d.metrics.map(m => m.label + '=' + m.value).join(',')); }
console.log('names checked', names.size); console.log(hits.join('\n') || 'NO HITS'); console.log('hits', hits.length);
