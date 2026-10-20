// Generates docs/DECISION-INDEX.md from PRODUCTION_PLAN.md.
//
// Why this exists (operator, repeatedly): "our planning and architectural
// documents are there for a reason and they keep getting bypassed."
//
// The documents were not being ignored out of laziness -- they had become
// unsearchable. PRODUCTION_PLAN.md holds 178 decision entries in 3803 lines,
// and its longest single line is 20,300 characters, because each entry is one
// enormous paragraph. A grep for "wumpus" therefore returns tens of thousands
// of characters in a handful of lines, which is unusable, so a reader falls
// back to measuring from scratch and rediscovers what D79 already recorded.
// That happened in this session and it is what this fixes.
//
// The index is one SHORT line per decision: number, claim, and the files it
// touched. `grep -i wumpus docs/DECISION-INDEX.md` then returns a readable
// list, and only then does anyone open the full entry.
//
// Regenerate after adding decisions:  node tools/decision-index.js
const fs = require('fs');
const path = require('path');

const PLAN = path.resolve(__dirname, '..', 'PRODUCTION_PLAN.md');
const OUT = path.resolve(__dirname, '..', 'docs', 'DECISION-INDEX.md');

const src = fs.readFileSync(PLAN, 'utf8');
const lines = src.split(/\r?\n/);

// Two shapes are used in the plan: table rows "| D79 | **claim** ... |" and
// headings "### D151 Title" followed by prose.
const entries = new Map();

function add(num, claim, body) {
    const n = parseInt(num, 10);
    if (!Number.isFinite(n)) return;
    const prev = entries.get(n);
    // Keep the longest claim seen for a number (headings often terser).
    if (prev && prev.claim.length >= claim.length) {
        prev.body += ' ' + body;
        return;
    }
    entries.set(n, { n, claim, body: (prev ? prev.body + ' ' : '') + body });
}

lines.forEach((line, i) => {
    let m = /^\|\s*D(\d+)\s*\|\s*(.*)$/.exec(line);
    if (m) {
        const rest = m[2];
        const bold = /\*\*(.+?)\*\*/s.exec(rest);
        add(m[1], (bold ? bold[1] : rest).trim(), rest);
        return;
    }
    // A lifecycle prefix may precede the number, e.g.
    // "## TEMPORARY DRAFT - D198 ZIL/Infocom capability completion". Without
    // allowing it, such an entry is silently absent from the index -- which is
    // how D198 went missing while the plan's own validator passed, since that
    // checks registration and fingerprints, not index coverage.
    m = /^#{2,4}\s*(?:([A-Z][A-Za-z ]*?)\s*[-–:]\s*)?D(\d+)(?:\s*[-–]\s*D\d+)?\s*(.*)$/.exec(line);
    if (m) {
        const prefix = (m[1] || '').trim();
        const title = m[3].trim();
        const body = lines.slice(i + 1, i + 14).join(' ');
        add(m[2], (prefix ? prefix + ': ' : '') + (title || '(see entry)'), body);
    }
});

// ARCHITECTURE_UML.md chapters, linked to decisions by the D-numbers their own
// headings carry ("## 56. Equipment sheet (D122)", "(D207-D209)", "(D146-D148)").
// A decision line then says where the architecture describes it, and the
// chapter list makes the architecture greppable by subsystem the same way.
const ARCH = path.resolve(__dirname, '..', 'ARCHITECTURE_UML.md');
const archLines = fs.existsSync(ARCH) ? fs.readFileSync(ARCH, 'utf8').split(/\r?\n/) : [];
const archChapters = [];
const archByDecision = new Map();
let inFence = false;
archLines.forEach((line, i) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const h = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!h) return;
    const title = h[2];
    const num = /^(\d+(?:\.\d+)?)\.\s/.exec(title);
    const ref = num ? '§' + num[1] : 'line ' + (i + 1);
    const ds = new Set();
    // Ranges first (D17-D20), then single numbers.
    title.replace(/D(\d+)\s*[-–]\s*D(\d+)/g, (_, a, b) => {
        if (+b < +a || +b - +a > 60) throw new Error('ARCHITECTURE_UML.md line ' + (i + 1) + ': unexpected decision range D' + a + '-D' + b);
        for (let n = +a; n <= +b; n++) ds.add(n);
        return '';
    }).replace(/D(\d+)/g, (_, a) => { ds.add(+a); return ''; });
    const chapter = { ref, line: i + 1, level: h[1].length, title, decisions: [...ds].sort((a, b) => a - b) };
    archChapters.push(chapter);
    chapter.decisions.forEach(n => {
        if (!archByDecision.has(n)) archByDecision.set(n, []);
        const list = archByDecision.get(n);
        if (!list.includes(ref)) list.push(ref);
    });
});

const FILE_RE = /\b(?:js|css|harness|tools|lib)\/[A-Za-z0-9_.-]+\.(?:js|css)\b/g;

function clean(s) {
    return String(s)
        .replace(/\s+/g, ' ')
        .replace(/[`*_]/g, '')
        .trim();
}

function shorten(s, max) {
    s = clean(s);
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut) + '...';
}

const rows = [...entries.values()].sort((a, b) => b.n - a.n).map(e => {
    const files = [...new Set((e.body.match(FILE_RE) || []))].slice(0, 4);
    // Keywords a future reader is likely to grep for: story filenames and the
    // subsystem words, pulled from the entry's own text rather than invented.
    const games = [...new Set((e.body.match(/\b[A-Za-z0-9]+\.z[35678]\b|\bwump2ka\b|\bAnchorhead\b|\bZork ?[123]\b|\bEnchanter\b|\bPlanetfall\b|\bDeadline\b|\bLostPig\b/gi) || [])
        .map(s => s.replace(/\.z[35678]$/i, '')))].slice(0, 3);
    return { n: e.n, claim: shorten(e.claim, 150), files, games, arch: archByDecision.get(e.n) || [] };
});

let out = `# Decision index

One line per decision in PRODUCTION_PLAN.md, newest first. **Search here before
measuring anything.**

This exists because the plan itself is not greppable: ${entries.size} decisions across
${lines.length} lines, with single lines over 20,000 characters, so one grep match
returns more text than anyone can read. Searching the full plan directly is how
prior answers get missed and re-derived.

## How to use it

    grep -i wumpus docs/DECISION-INDEX.md        # what has been decided about a game
    grep -i "player\\|room id" docs/DECISION-INDEX.md   # about a subsystem
    grep -n "ZRamReader.js" docs/DECISION-INDEX.md      # about a file

Then open the full entry in PRODUCTION_PLAN.md for the one or two D-numbers that
match, e.g. \`grep -n "^| D79 \\|^### D79" PRODUCTION_PLAN.md\`.

The **arch** column names the ARCHITECTURE_UML.md chapter(s) whose heading cites
the decision (§56 = "## 56. ..."); open it with \`grep -n "^## 56\\." ARCHITECTURE_UML.md\`.
An empty arch cell means no chapter HEADING cites the decision; search the architecture
body before concluding it is undocumented. The chapter list
after the table indexes the architecture itself.

Regenerate after adding decisions or chapters: \`node tools/decision-index.js\`

| D | claim | files | games | arch |
|---|-------|-------|-------|------|
`;

rows.forEach(r => {
    out += `| D${r.n} | ${r.claim.replace(/\|/g, '\\|')} | ${r.files.join(' ')} | ${r.games.join(' ')} | ${r.arch.join(' ')} |\n`;
});

out += `
## Architecture chapters (ARCHITECTURE_UML.md)

One line per chapter heading, in document order, with the decisions its heading
cites. Search here for a subsystem; the line number opens the chapter.

| chapter | line | title | decisions |
|---------|------|-------|-----------|
`;
archChapters.forEach(c => {
    out += `| ${c.ref} | ${c.line} | ${c.title.replace(/\|/g, '\\|')} | ${c.decisions.map(n => 'D' + n).join(' ')} |\n`;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, 'utf8');
const linked = rows.filter(r => r.arch.length).length;
console.log(`architecture: ${archChapters.length} chapters, ${linked}/${rows.length} decisions linked to a chapter`);
console.log(`wrote ${OUT}: ${rows.length} decisions, ${out.length} bytes ` +
    `(plan is ${src.length} bytes, ${(src.length / out.length).toFixed(0)}x larger)`);
