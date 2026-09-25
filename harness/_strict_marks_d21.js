const fs = require("fs");
let a = fs.readFileSync("js/Actionable.js", "utf8");

// Stricter object bind: token equality / plural only, no substring
a = a.replace(
  /var pobj = pool\.find\(function \(o\) \{[\s\S]*?return false;\s*\}\);/,
  `var pobj = pool.find(function (o) {
                            if (!o || o.id == null || !o.name) return false;
                            var nm = String(o.name).toLowerCase();
                            if (nm === noun) return true;
                            var parts = nm.split(/\\s+/);
                            if (parts.indexOf(noun) >= 0) return true;
                            if (noun.length > 3 && noun.charAt(noun.length - 1) === "s") {
                                var stem = noun.slice(0, -1);
                                if (nm === stem || parts.indexOf(stem) >= 0) return true;
                            }
                            return false;
                        });`
);

// When structural live, skip creating marks that don't bind to an object id (except directions)
if (!a.includes("STRUCTURAL_MARKS_REQUIRE_ID")) {
  a = a.replace(
    "mark.className = \"pl-act\"; mark.dataset.noun = noun;",
    `/* STRUCTURAL_MARKS_REQUIRE_ID ? bind first */
                    mark.className = "pl-act"; mark.dataset.noun = noun;`
  );
  // After bind try block, skip append if structural and no objectId and not direction
  a = a.replace(
    "mark.textContent = match[0]; mark.title = mark.dataset.kind === \"direction\" ? \"Go \" + noun : \"Examine \" + noun;\n                    fragment.appendChild(mark); cursor = regex.lastIndex;",
    `mark.textContent = match[0]; mark.title = mark.dataset.kind === "direction" ? "Go " + noun : "Examine " + noun;
                    try {
                        var structuralLive = WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.probe &&
                            WorldModel.lastPayload.probe.status === "z-ram-live" && (WorldModel.lastPayload.probe.scopeCount || 0) > 0;
                        if (structuralLive && mark.dataset.kind !== "direction" && !mark.dataset.objectId) {
                            cursor = regex.lastIndex;
                            continue;
                        }
                    } catch (eSkip) {}
                    fragment.appendChild(mark); cursor = regex.lastIndex;`
  );
}
fs.writeFileSync("js/Actionable.js", a);
try { new Function(a); console.log("Act OK"); } catch (e) { console.log("Act FAIL", e.message); }

// Bump BUILD 46 already set; update PRODUCTION_PLAN briefly for click contract
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
if (!plan.includes("D21")) {
  plan = plan.replace(
    /## Decision log[\s\S]*?(?=\n## |\n# |$)/,
    (m) => {
      if (m.includes("D21")) return m;
      return m.trimEnd() + `\n\n- **D21 (BUILD 46): Left/right-click + input seeds are RAM-command deterministic.** Left-click = primary ActionSynth command for bound object id (usually examine). Right-click = radial of only ActionSynth verbs from RAM attrs for that object (room or inventory). Autocomplete seeds from the same command set. Heuristic name-regex verb lists are retired when \`z-ram-live\`.\n`;
    }
  );
  // softer insert at end of decision section if replace failed shape
  if (!plan.includes("D21")) {
    plan += `\n\n### D21 ? Click/input RAM commands (BUILD 46)\nLeft-click primary / right-click radial / autocomplete seeds come from ActionSynth over RAM object attrs (including inventory). No prose-regex verb guessing when P2 live.\n`;
  }
  fs.writeFileSync("PRODUCTION_PLAN.md", plan);
}

let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
if (!uml.includes("Left/right-click")) {
  uml += `\n\n## 23. Deterministic click / input commands (D21)\n\n\`\`\`mermaid\nflowchart LR\n  Mark[\".pl-act data-object-id\"] --> Left[Left-click]\n  Mark --> Right[Right-click]\n  Inv[Inventory button data-object-id] --> Left\n  Inv --> Right\n  Left --> AS1[ActionSynth.commandsForPayloadObjectId]\n  Right --> AS2[ActionSynth radial verbs from RAM attrs]\n  AS1 --> Submit[Actionable.Submit]\n  AS2 --> Submit\n  RAM[ZRamProvider scope+attrs] --> AS1\n  RAM --> AS2\n  AC[Autocomplete.RamCommandSeeds] --> Input[Line input suggestions]\n  AS1 --> AC\n\`\`\`\n`;
  fs.writeFileSync("ARCHITECTURE_UML.md", uml);
}

console.log("docs D21");
