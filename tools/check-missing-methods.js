// Static guard: every unguarded `Module.method(` call in js/ must resolve to a
// definition. Catches "caller references a method that was removed/renamed"
// bugs, like ZvmCapture.js calling UndoRestoreSync.onStateRestored() after
// that method was lost -- which threw during VM start and left the game pane
// blank (D94). A mocked harness cannot catch this class: the mock supplies
// the very method the product module lacks.
//
// Comments are ignored, and so are existence-guarded calls
// (`Mod.fn && Mod.fn()`), which are safe by construction.
//
// Usage: node tools/check-missing-methods.js   (exit 1 if any are missing)
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'js');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

// Naive comment stripper: block comments, then // to end of line (skipping
// "://" so URLs survive).
function strip(text) {
    return text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

const src = {};
files.forEach(f => { src[f] = strip(fs.readFileSync(path.join(dir, f), 'utf8')); });
const all = Object.values(src).join('\n');

const modules = {};
files.forEach(f => {
    const re = /^var\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\{/gm;
    let m;
    while ((m = re.exec(src[f]))) modules[m[1]] = f;
});

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const problems = [];

Object.keys(modules).forEach(mod => {
    const calls = new Set();
    const callRe = new RegExp('\\b' + esc(mod) + '\\.([A-Za-z_][A-Za-z0-9_]*)\\s*\\(', 'g');
    let m;
    while ((m = callRe.exec(all))) {
        const name = m[1];
        const before = all.slice(Math.max(0, m.index - 80), m.index);
        const ref = esc(mod) + '\\.' + esc(name);
        const guarded = new RegExp(ref + '\\s*(&&|\\?)\\s*$').test(before)      // Mod.fn && Mod.fn()
            || new RegExp(ref + '\\s*&&').test(before)                          // Mod.fn && ... Mod.fn()
            || new RegExp(ref + '\\s*\\)\\s*(return\\s+)?$').test(before);      // if (.. && Mod.fn) return Mod.fn()
        if (!guarded) calls.add(name);
    }
    calls.forEach(name => {
        const own = src[modules[mod]];
        const defined =
            new RegExp('(^|[\\s,{])' + esc(name) + '\\s*[:(]', 'm').test(own)
            || new RegExp('\\b' + esc(mod) + '\\.' + esc(name) + '\\s*=[^=]').test(all);
        if (!defined) problems.push(mod + '.' + name + '  (called, but not defined in ' + modules[mod] + ' or assigned elsewhere)');
    });
});

if (problems.length) {
    console.error('FAIL: ' + problems.length + ' call(s) to undefined module methods:');
    problems.forEach(p => console.error('  ' + p));
    process.exit(1);
}
console.log('PASS: no calls to undefined module methods (' + Object.keys(modules).length + ' modules scanned)');
