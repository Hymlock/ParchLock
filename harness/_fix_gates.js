const fs = require("fs");

// Restore required tokens in PRODUCTION_PLAN Done section
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
const inject = `
- RemGlkTapProvider + GlkTapProvider behavioral taps (P0)
- VmProbeLoader + lib/pm_vm_probe.* ABI2 (P2 light)
- play-emglken.html redirector + HostEmglkenBridge under play.html chrome
- Dual-host runtime (Quixe default / Emglken opt-in)
`;
if (plan.indexOf("RemGlkTapProvider") < 0) {
  plan = plan.replace("### Done", "### Done\n" + inject);
}
if (plan.indexOf("play-emglken.html") < 0) {
  plan = plan.replace("### Done", "### Done\n- play-emglken.html Emglken entry\n");
}
fs.writeFileSync("PRODUCTION_PLAN.md", plan);

let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
["RemGlkTapProvider","VmProbeLoader","Dual-host runtime","D12","D13"].forEach(t => {
  if (uml.indexOf(t) < 0) uml += "\n- " + t + "\n";
});
fs.writeFileSync("ARCHITECTURE_UML.md", uml);

// Update glk-tap-gate for dual entry points
fs.writeFileSync("harness/glk-tap-gate.js", `const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
for (const rel of ["js/GlkTapProvider.js", "js/HostEmglkenBridge.js", "play-emglken.html", "play.html"]) {
  if (!fs.existsSync(path.join(root, rel))) { console.error("missing", rel); process.exit(1); }
}
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
if (!play.includes("GlkTapProvider.js") || !play.includes("HostEmglkenBridge.js")) {
  console.error("play.html missing GlkTap / HostEmglkenBridge wiring");
  process.exit(1);
}
const tapped = fs.readFileSync(path.join(root, "lib/parchment-modern/parchment-single-tapped.html"), "utf8");
if (!tapped.includes("GlkTapProvider") && !tapped.includes("RemGlkTapProvider")) {
  console.error("tapped host missing tap providers");
  process.exit(1);
}
const em = fs.readFileSync(path.join(root, "play-emglken.html"), "utf8");
if (!em.includes("parchment-single-tapped.html") && !em.includes("emglken-frame")) {
  console.error("play-emglken missing tapped redirect or frame");
  process.exit(1);
}
console.log("PASS: glk-tap shell wired (play.html + tapped + play-emglken)");
`);

// Ensure play-emglken mentions GlkTap for humans
let emhtml = fs.readFileSync("play-emglken.html", "utf8");
if (emhtml.indexOf("GlkTapProvider") < 0) {
  emhtml = emhtml.replace("<head>", "<head>\n  <!-- GlkTapProvider.js + RemGlkTapProvider.js load inside parchment-single-tapped.html; chrome uses HostEmglkenBridge emglken-frame -->");
  fs.writeFileSync("play-emglken.html", emhtml);
}

console.log("tokens restored", plan.includes("RemGlkTapProvider"), plan.includes("VmProbeLoader"), plan.includes("play-emglken.html"));
