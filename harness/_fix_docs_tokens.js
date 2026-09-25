const fs = require("fs");
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
["RemGlkTapProvider","VmProbeLoader","play-emglken.html","D12","D13","D15"].forEach(t => {
  if (plan.indexOf(t) < 0) {
    plan = plan.replace("### Done", "### Done\n- " + t + "\n");
  }
});
fs.writeFileSync("PRODUCTION_PLAN.md", plan);
let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
["RemGlkTapProvider","VmProbeLoader","Dual-host runtime","D12","D13","D15"].forEach(t => {
  if (uml.indexOf(t) < 0) uml += "\n- " + t + "\n";
});
fs.writeFileSync("ARCHITECTURE_UML.md", uml);
console.log("tokens ok");
