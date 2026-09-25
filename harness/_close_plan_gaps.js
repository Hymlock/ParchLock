const fs = require("fs");

let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");

// --- 1) Strengthen objective: deterministic structural when available ---
if (!plan.includes("Deterministic structural primary")) {
  plan = plan.replace(
    "6. **Degrade gracefully** when RAM introspection is unavailable.",
    `6. **Degrade gracefully** when RAM introspection is unavailable.
7. **Deterministic structural primary (D17):** when P2/P3 RAM data is available, map identity and actionable words MUST come from VM object IDs / dictionary bindings / in-scope children ? not from fragile prose text-mining. P1 heuristic is forever-fallback only.`
  );
}

// --- 2) Expand 4.2 provider table with P2 duties ---
if (!plan.includes("P2 Z RAM structural duties")) {
  plan = plan.replace(
    "**Translator duties:** unify room/exit/object/inventory; attach `confidence` + `source`; apply spoiler shield; synthesize actions when attrs exist; expose route commands; never require P2/P3 to render UI.",
    `**Translator duties:** unify room/exit/object/inventory; attach \`confidence\` + \`source\`; apply spoiler shield; synthesize actions when attrs exist; expose route commands; never require P2/P3 to *boot* UI ? but when P2/P3 facts exist they **outrank** P0/P1 for the same field.

**P2 Z RAM structural duties (heart of deterministic play):**
1. \`get_vm_ram\` / live memory view (ZVM \`m\`/\`ram\` or Bocfel HEAP exports).
2. \`get_player_object_id\` (or Inform-global fingerprint) ? \`location = parent(player)\`.
3. Walk \`child(location)\` (+ open containers / supporters per matrix) ? in-scope object IDs.
4. Resolve **short names** from property tables; bind UI words via **RAM dictionary** (Word?ObjectID).
5. Look-ahead exits: \`n_to\`/\`s_to\`/? and door attrs from RAM without requiring travel.
6. Emit \`discoveredObjects\` / \`exits\` / \`roomId\` with high confidence so Actionable/Map stop guessing.

**P1 heuristic text-mining:** labeled low confidence; used only when P2 fields are missing. Never the source of truth for ?what can I click in this room? once P2 is live.`
  );
}

// --- 3) Fix phase markers that were over-claimed ---
plan = plan.replace(
  "### Phase 2 - Emglken exports + Z RAM provider (P2) [~]",
  "### Phase 2 - Live Z RAM provider (P2) ? CRITICAL PATH [ ]"
);
plan = plan.replace(
  `### Phase 2 - Live Z RAM provider (P2) ? CRITICAL PATH [ ]

\`vm_read_*\` exports; v3/v4+ walker; location cascade; Translator merges P2 over P0/P1.  
**Gate:** zexplorer golden containment; fallback if exports missing.`,
  `### Phase 2 - Live Z RAM provider (P2) ? CRITICAL PATH [ ]

**This phase is the heart of deterministic actionable + mapping.** Without it, alley objects (cans/window/fence) cannot be proven from RAM.

Required deliverables (from conversion guide, folded in):
1. Live memory capture on \`play.html\` ZVM path (\`window.__PARCHLOCK_ZVM__\` / \`m\`+\`ram\`) and/or Bocfel \`get_vm_ram_ptr\` when Emglken is under the same chrome.
2. \`get_player_object_id\` (export or Inform global fingerprint).
3. Location cascade: \`roomId = parent(player)\`; room short name from props.
4. In-scope walk: children of room + open/transparent containers + supporters (false-positive matrix).
5. Short-name decode + **dictionary Word?ObjectID** binding for every actionable mark.
6. Look-ahead exits/doors from direction properties + lock/open attrs (no travel required).
7. Translator merge: P2 **wins** over P0/P1 for roomId, exits, discoveredObjects when confidence ? structural threshold.
8. Actionable primary = Translator structural marks only when P2 present (Phase 4 depends on this).

**Gate:** Anchorhead Alley RAM-backed marks include object IDs for cans/window/fence (harness); zexplorer-style containment fixtures; heuristic fallback if live RAM missing.`
);

plan = plan.replace(
  "### Phase 4 - Action synthesis + unambiguous commands [x]",
  "### Phase 4 - Action synthesis + unambiguous commands [~] (blocked on Phase 2 structural)"
);

// Insert grammar-table into Phase 4 description if thin
if (!plan.includes("grammar table")) {
  plan = plan.replace(
    "Attr/relation verb matrix (I6 profile as starting ruleset); adjective+noun commands; Actionable primary = Translator when structural.",
    "Attr/relation verb matrix (I6 profile as starting ruleset); **RAM dictionary Word?ObjectID** for every clickable word; **grammar-table verb extraction** for non-standard actions; adjective+noun unambiguous commands; invalid-action suppression from attribute bitfields; Actionable primary = Translator when structural."
  );
}

// Phase 6 beautify detail
if (!plan.includes("planarization")) {
  plan = plan.replace(
    "Hybrid layout + mental-map preservation; floor tabs; radial inside text-buffer bounds; dock map if graphics window.",
    "Hybrid layout + mental-map preservation; **planarization / edge-crossing minimization / orthogonalization / label collision repulsion**; floor tabs + Z-axis; radial inside text-buffer bounds; dock map if graphics window; **responsive Glk window-tree bounding-box shielding**."
  );
}

// Phase 8 undo hooks
if (!plan.includes("@restore") && !plan.includes("opcode hook")) {
  plan = plan.replace(
    "Resync triggers; OffersLight-class checks; I7/PunyInform profiles; optional dbg.",
    "Resync triggers; **terp-level @restore/@undo (Z) and restore/restorestat (Glulx) hooks** so map/discovery cannot desync; OffersLight-class checks; I7/PunyInform/I6 schema fingerprints; optional dbg."
  );
}

// --- 4) New section: Guide gap closure ---
if (!plan.includes("## 6B. Conversion-guide gap closure")) {
  const gapSection = `
## 6B. Conversion-guide gap closure (folded from Full Stack Engine Level Conversion.txt)

The conversion TXT is **advisory** (D1). These items were unintentionally thin, skipped, or softened in earlier drafts and are now **first-class plan requirements**:

| Gap | Plan home | Acceptance |
|---|---|---|
| RAM Dictionary Word?ObjectID | Phase 2 + 4 | Every \`.pl-act\` has \`data-object-id\` from dictionary/props when P2 live |
| \`get_player_object_id\` + location?parent(player) | Phase 2 | UIPayload.roomId equals parent(player) on fixtures |
| Look-ahead exits/doors from RAM | Phase 2 + 5 | Exits list populated before travel; door lock/open from attrs |
| @restore/@undo opcode hooks | Phase 8 | Map/discovery resync without relying only on typed command sniffing |
| Grammar-table verb extraction | Phase 4 | Non-standard verbs appear in radials when present in grammar RAM |
| Planarization / crossing / collision beautify | Phase 6 | Map connectors do not cross labels on ?N-room fixtures |
| Responsive Glk window-tree shielding | Phase 6 | Overlay never covers graphics buffer; docks when needed |
| Supporter vs opaque-container matrix | Phase 2?3 | Closed opaque not recursed; supporters always recursed |
| Worn vs carried inventory grouping | Phase 3 | Items panel groups worn vs carried when attrs known |
| Invalid action suppression from attrs | Phase 4 | No WEAR on non-wearable etc. when attrs known |

**Explicitly NOT restoring from the guide:** RAM-correctness-first gate that blocks all UI; requiring Emglken before any play.html UX; showing WorldModel debug panels by default.

`;
  plan = plan.replace("## 7. Systems remove", gapSection + "## 7. Systems remove");
}

// --- 5) Decision log D17?D20 ---
if (!plan.includes("| D17 |")) {
  plan = plan.replace(
    /\| D16 \|[^\n]+\n/,
    (m) => m +
      "| D17 | When P2/P3 structural RAM is available it is **primary** for roomId, exits, and actionable object marks; P1 text-mining is degraded forever-fallback only | [yes] |\n" +
      "| D18 | Actionable words bind to VM Object IDs via RAM dictionary/short-name tables (Word?ObjectID); no orphan underlines without an id when P2 live | [yes] |\n" +
      "| D19 | Player/location cascade is mandatory for P2: player object id ? parent(player)=location ? child walk for scope | [yes] |\n" +
      "| D20 | Conversion-guide gaps in ?6B are in-scope; guide remains advisory where it conflicts with D8?D12/D15?D16 | [yes] |\n"
  );
}

// --- 6) Rewrite implementation status honestly ---
const status = `## Implementation status (live)

**BUILD 45** ? docs re-aligned to deterministic RAM-primary intent. **Phase 2 structural is NOT done** until live object walk drives actionable marks in-game.

### Heart requirement (must work in-game)
- Enter Alley (Anchorhead) ? actionable marks for **cans / window / fence** come from **P2 object IDs in scope**, not from prose regex.
- Map room identity uses **roomId** from \`parent(player)\` when P2 live.
- Old fragile text-mining must not be the displayed truth when RAM is available.

### Done (infrastructure / chrome)
- D12?D16, D17?D20 locked in this doc revision
- play.html-only product UI; debug HUD opt-in
- WorldModel Translator seam + provider merge + confidence
- Navigator step-queue (no comma-inject); Reset Map control
- Probe ABI2 story-byte \`z_summary\` (P2 **light**, not live scope)
- Portable package / NOTICE / harness gates / matrix boot checks

### Not done (was marked done too early ? corrected)
- Phase 2 live Z RAM: player id, location cascade, room children, short names, dictionary Word?ObjectID
- Phase 4 structural Actionable primary (depends on Phase 2)
- Look-ahead exits from direction properties
- Grammar-table verb extraction
- Planarization-grade beautify + full Glk window-tree shielding
- Terp-level @restore/@undo hooks

### Next (ordered)
1. Phase 2 live ZVM memory capture on play.html + player/location/scope walk + dictionary binding
2. Actionable/Map consume P2-only marks when structural confidence high
3. Harness: alley RAM-backed cans/window/fence (fail if only text-mine)
4. Look-ahead exits + Phase 4 attr/grammar radials
5. Phase 6/8 guide-gap polish

`;

const s0 = plan.indexOf("## Implementation status (live)");
if (s0 >= 0) {
  // Replace through end of file or next major if any after - status is usually last big block
  const afterDecisions = plan.indexOf("## Implementation status (live)");
  plan = plan.slice(0, afterDecisions) + status;
} else {
  plan += "\n" + status;
}

fs.writeFileSync("PRODUCTION_PLAN.md", plan);
console.log("PRODUCTION_PLAN updated", plan.includes("D17"), plan.includes("6B. Conversion-guide"), plan.includes("CRITICAL PATH"));

// ========== ARCHITECTURE_UML ==========
let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");

if (!uml.includes("D17")) {
  uml += `

## 22. Deterministic RAM-primary contract (D17?D20)

\`\`\`mermaid
flowchart TD
  ZVM[play.html ZVM live memory m/ram]
  ZVM --> PL[player object id]
  PL --> LOC[roomId = parent player]
  LOC --> KIDS[child walk + open containers + supporters]
  KIDS --> NAMES[short_name + dictionary Word to ObjectID]
  LOC --> EXITS[direction props look-ahead doors]
  NAMES --> WM[WorldModel UIPayload P2]
  EXITS --> WM
  WM -->|confidence wins| ACT[Actionable marks data-object-id]
  WM -->|roomId graph| MAP[Map / Navigator]
  P1[P1 text heuristic] -.->|only if P2 missing| WM
\`\`\`

### Provider precedence (field-level)
| Field | Winner when P2 live | Fallback |
|---|---|---|
| roomId / roomName | P2 parent(player) | P0 status/subheader ? P1 |
| exits | P2 direction props + door attrs | P0 movement observe ? P1 |
| discoveredObjects / actionable | P2 in-scope object IDs + dictionary | P1 heuristic (labeled) |
| inventory tree | P2 child(player) worn/carried attrs | P1 inventory text |
| verbs/radials | P2 attrs + grammar table | safe generics |

### Guide gaps mapped into architecture
- Dictionary Word?ObjectID ? every \`.pl-act[data-object-id]\`
- Look-ahead exits ? UIPayload.exits before travel
- @restore/@undo hooks ? Phase 8 resync bus
- Grammar table ? ActionSynth input
- Planarization / Glk shielding ? Phase 6 MapBeautify + GraphicsDock

### Explicit non-goals retained
- Text-mining as proof of actionable correctness
- Visible non-ParchLock hosts / debug panels by default
- Blocking play.html UX until Emglken HEAP exports exist (ZVM live memory is an acceptable P2 path)
`;
}

// Fix provider map honesty
uml = uml.replace(
  "| Story-byte Z probe | `js/VmProbeLoader.js` + `lib/pm_vm_probe.*` | P2 light | [~] scan + ABI?v2 object summary in progress |",
  "| Story-byte Z probe | `js/VmProbeLoader.js` + `lib/pm_vm_probe.*` | P2 light | [yes] ABI2 summary only ? NOT live scope |\n| Live ZVM RAM walk | (target `js/ZRamProvider.js` + probe ABI3) | P2 full | [ ] player/location/children/dictionary ? CRITICAL |"
);

uml = uml.replace(/BUILD 44/g, "BUILD 45");
uml = uml.replace(/BUILD 43/g, "BUILD 45");

fs.writeFileSync("ARCHITECTURE_UML.md", uml);
console.log("ARCHITECTURE_UML updated", uml.includes("D17?D20"), uml.includes("ZRamProvider"));
