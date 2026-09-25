const fs = require("fs");
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
if (plan.indexOf("top-level redirect") < 0) {
  plan = plan.replace(
    "### Done",
    "### Done\n- Emglken under `?host=emglken` uses **top-level redirect** into `parchment-single-tapped.html` (iframe boot cannot finish GlkOte; validated Lost Pig room+objects)\n"
  );
  fs.writeFileSync("PRODUCTION_PLAN.md", plan);
}
let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
if (uml.indexOf("top-level redirect") < 0) {
  uml += "\n\n## 19. Emglken entry (BUILD 43)\n\n`play.html?host=emglken` / `play-emglken.html` ? top-level `parchment-single-tapped.html` (not nested iframe).\n";
  fs.writeFileSync("ARCHITECTURE_UML.md", uml);
}
console.log("docs noted redirect");
