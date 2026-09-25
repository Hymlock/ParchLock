const fs = require("fs");
const path = require("path");
const vm = require("vm");
const code = fs.readFileSync(path.join(__dirname, "..", "js", "WorldModel.js"), "utf8");
const sandbox = { window: {}, console, EmglkenProvider: null };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const WM = sandbox.WorldModel;
if (!WM || typeof WM.createEmptyPayload !== "function" || typeof WM.tick !== "function") {
  console.error("WorldModel API missing");
  process.exit(1);
}
if (typeof WM.registerProvider !== "function") {
  console.error("registerProvider missing");
  process.exit(1);
}
const p = WM.createEmptyPayload();
const required = [
  "engineMode","vmType","schemaId","sources","roomId","roomName","roomConfidence",
  "exits","inventory","discoveredObjects","hudMetrics","specialCommands","resourceWarnings",
  "darkness","nativeGraphicsActive","glkBounds","probe"
];
for (const k of required) {
  if (!(k in p)) { console.error("missing key", k); process.exit(1); }
}
const t = WM.tick();
if (!t || t.engineMode !== "heuristic") { console.error("tick failed"); process.exit(1); }
if ((t.discoveredObjects || []).length) { console.error("empty tick leaked discoveredObjects"); process.exit(1); }
if ((t.exits || []).length) { console.error("empty tick leaked exits"); process.exit(1); }
if ((t.inventory || []).length) { console.error("empty tick leaked inventory"); process.exit(1); }
if (t.roomName) { console.error("empty tick leaked roomName"); process.exit(1); }
console.log("PASS: payload-schema");
