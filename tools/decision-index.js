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
    m = /^#{2,4}\s*D(\d+)(?:\s*[-–]\s*D\d+)?\s*(.*)$/.exec(line);
    if (m) {
        const title = m[2].trim();
        const body = lines.slice(i + 1, i + 14).join(' ');
        add(m[1], title || '(see entry)', body);
    }
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
    return { n: e.n, claim: shorten(e.claim, 150), files, games };
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

Regenerate after adding decisions: \`node tools/decision-index.js\`

| D | claim | files | games |
|---|-------|-------|-------|
`;

rows.forEach(r => {
    out += `| D${r.n} | ${r.claim.replace(/\|/g, '\\|')} | ${r.files.join(' ')} | ${r.games.join(' ')} |\n`;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out, 'utf8');
console.log(`wrote ${OUT}: ${rows.length} decisions, ${out.length} bytes ` +
    `(plan is ${src.length} bytes, ${(src.length / out.length).toFixed(0)}x larger)`);
