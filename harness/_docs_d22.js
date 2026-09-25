const fs = require("fs");

let p = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");

// Objective item 8
if (!p.includes("Universal coverage (D22)")) {
  p = p.replace(
    /(7\.\s+\*\*Deterministic structural primary \(D17\):[\s\S]*?)(\n\n|\n(?=[A-Z#]))/,
    `$1
8. **Universal coverage (D22):** the same P2/P3 deterministic path MUST work for **every room/location**, **every catalog story module**, and **every supported module system** (Z3/Z5/Z8/Zblorb on Quixe; Glulx when under the same chrome; specialized modules like wump2ka/yagwad via the same play.html Translator). Alley/Anchorhead is a **fixture**, not the product scope.
$2`
  );
}

// Expand Phase 2 acceptance beyond Alley
if (!p.includes("Universal Phase 2 acceptance")) {
  p = p.replace(
    /Required deliverables \(from conversion guide, folded in\):/,
    `**Universal Phase 2 acceptance (D22):** not done until the live walk works in **arbitrary rooms** across the catalog matrix (not only Alley), with object-id marks + ActionSynth radials + inventory from RAM.

Required deliverables (from conversion guide, folded in):`
  );
  p = p.replace(
    /- Enter Alley \(Anchorhead\).*?when RAM is available\./s,
    `- Enter Alley (Anchorhead) ? actionable marks for **cans / window / fence** come from **P2 object IDs in scope**, not from prose regex. *(regression fixture)*
- **Any room** in Anchorhead / Lost Pig / Advent / catalog z3?z5?z8?zblorb: when P2 live, marks carry \`data-object-id\`; left/right-click use ActionSynth; inventory id-backed.
- Specialized modules (wump2ka, yagwad, etc.): same play.html path; specialCommands from RemGlk/prompt scan; structural when Z RAM available, behavioral otherwise ? never a separate UI.
- Map room identity uses **roomId** from live location resolution (parent(player) when valid, else status/map name ? \`findRoomsByName\` preferring instances with children).
- Old fragile text-mining must not be the displayed truth when RAM is available.`
  );
}

// New section 6C
if (!p.includes("6C. Universal module")) {
  p = p.replace(
    /(## 6B\. Conversion-guide gap closure[\s\S]*?)(\n## )/,
    `$1

## 6C. Universal module / room / system coverage (D22)

| Layer | Must work for | Acceptance |
|---|---|---|
| Rooms / locations | Every reachable room in a story | \`roomId\` + scoped children update each turn; no Alley-only branches |
| Story modules | Full catalog: Advent, Anchorhead, Lost Pig, z3/z5/z8/zblorb fixtures | \`harness/matrix-playhtml.js\` + per-story RAM smoke |
| Specialized modules | wump2ka, yagwad, restore/yes-no prompt games | \`specialCommands\` + play.html chrome; no Jerry-rigged entry |
| Module systems | Quixe/ZVM (primary P2); Emglken/Bocfel+Glulxe (P0/P3 path under same chrome) | Single \`play.html\` product UI; providers swap, UI does not |
| Clicks / input | All of the above when P2/P3 live | D21 left/right + autocomplete from ActionSynth |

Hard rule: **no story-specific or room-specific product code paths** except harness fixtures. Location resolution uses RAM + status/map name scoring only.

$2`
  );
}

// Decision D22
if (!p.includes("| D22 |")) {
  // append to decision table - find last D21 or D20 row
  if (p.includes("D21")) {
    p = p.replace(
      /(\| D21 \|[\s\S]*?\| \[yes\] \|\n)/,
      `$1| D22 | Universal coverage: all rooms, all catalog modules, all supported VM/module systems via same play.html Translator; Alley is fixture-only | [yes] |\n`
    );
  } else {
    p = p.replace(
      /(\| D20 \|[\s\S]*?\|\n)/,
      `$1| D21 | Left/right-click + input seeds RAM-command deterministic (ActionSynth) | [yes] |\n| D22 | Universal coverage: all rooms, all catalog modules, all supported VM/module systems via same play.html Translator; Alley is fixture-only | [yes] |\n`
    );
  }
}

// Implementation status refresh BUILD 46/47
p = p.replace(
  /\*\*BUILD 45\*\*[^\n]*/,
  "**BUILD 46+** ? live Z-RAM scope + D21 clicks working on Alley fixture; **D22 universal matrix still required** before Phase 2 can be marked complete."
);
if (!p.includes("D22 locked")) {
  p = p.replace(
    "- D12-D16, D17-D20 locked in this doc revision",
    "- D12-D16, D17-D22 locked in this doc revision"
  );
}
if (!p.includes("Live Z-RAM Alley fixture")) {
  p = p.replace(
    "### Done (infrastructure / chrome)",
    `### Done (infrastructure / chrome + Alley fixture)
- Live Z-RAM Alley fixture PASS (room 107; can/fence/window object ids; ActionSynth radials)
- D21 left/right-click + inventory RAM commands
`
  );
}
if (!p.includes("D22 matrix")) {
  p = p.replace(
    "### Not done (was marked done too early",
    `### Not done (D22 matrix + remaining gaps)
- **D22:** prove P2 across rooms + catalog z3/z5/z8/zblorb + Lost Pig/Advent + specialized modules (not only Alley)
- Grammar-table verb extraction (beyond attr-profile ActionSynth)
- Terp-level @undo/@restore hooks (typed-command resync exists; opcode hooks still open)
- Look-ahead exits polish + map identity from roomId everywhere
- Beautify planarize + Glk shielding polish

### Not done (was marked done too early`
  );
}

// Consts bump note
p = p.replace(/Consts\.js\` BUILD \d+/, "Consts.js` BUILD 47");

fs.writeFileSync("PRODUCTION_PLAN.md", p);
console.log("PLAN updated", p.includes("D22"), p.includes("6C. Universal"));

let u = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
if (!u.includes("D22") || !u.includes("Universal coverage")) {
  u += `

## 24. Universal coverage contract (D22)

Product scope is **all rooms ? all catalog modules ? all supported module systems**, with one UI (\`play.html\`).

\`\`\`mermaid
flowchart TB
  subgraph Systems
    Z3[Z3]
    Z5[Z5]
    Z8[Z8]
    ZB[Zblorb]
    GL[Glulx / Emglken]
    SPEC[Specialized e.g. wump2ka]
  end
  Systems --> Play[play.html sole UI]
  Play --> Cap[ZvmCapture / RemGlk tap]
  Cap --> Prov[Providers P0/P1/P2/P3]
  Prov --> WM[WorldModel Translator]
  WM --> UI[Actionable Map Inventory Autocomplete]
  UI --> Rule[D17 P2 wins / D21 RAM clicks / no room-specific branches]
\`\`\`

| Concern | Rule |
|---|---|
| Room change | Every turn re-resolve location (valid parent, else status/map ? findRoomsByName with children preference) |
| Module change | Same providers; story bytes / live RAM only differ |
| System change | Quixe Z ? P2 ZRamProvider; Emglken Glulx ? P0/P3; never fork UI |
| Fixture vs product | Alley/Anchorhead harness proves the path; matrix harness proves universality |

Open: Glulx live P3 parity still tracks Emglken HEAP export; until then Glulx stays P0 behavioral under the same chrome.
`;
}
// Update provider map note if present
if (u.includes("CRITICAL PATH") && !u.includes("D22 matrix")) {
  u = u.replace(
    "Live ZVM RAM walk",
    "Live ZVM RAM walk (D22: all rooms/modules)"
  );
}
fs.writeFileSync("ARCHITECTURE_UML.md", u);
console.log("UML updated", u.includes("D22"));

// BUILD 47
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 47");
fs.writeFileSync("js/Consts.js", c);

// docs-sync tokens
let ds = fs.readFileSync("harness/docs-sync.js", "utf8");
if (!ds.includes("D22")) {
  ds = ds.replace(/D21/g, "D21");
  // add D22 to required tokens array if exists
  if (ds.includes("'D20'") || ds.includes('"D20"')) {
    ds = ds.replace(/("D20"|'D20')/, "$1, \"D22\"");
  }
  if (ds.includes("CRITICAL PATH") && !ds.includes("Universal coverage")) {
    ds = ds.replace(
      /required\s*=\s*\[/,
      'required = ["D22", "Universal coverage", "6C. Universal", '
    );
  }
  fs.writeFileSync("harness/docs-sync.js", ds);
}

console.log("BUILD", /BUILD\s*=\s*(\d+)/.exec(fs.readFileSync("js/Consts.js","utf8"))[1]);
