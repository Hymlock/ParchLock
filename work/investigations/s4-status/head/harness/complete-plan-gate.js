#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const need = [
  "js/TextGate.js","js/ActionSynth.js","js/MapIdentity.js","js/TranslatorUI.js",
  "js/HostEmglkenBridge.js","js/WorldModel.js","js/RemGlkTapProvider.js","js/VmProbeLoader.js",
  "js/Navigator.js","NOTICE","DISTRIBUTE.md","PRODUCTION_PLAN.md","ARCHITECTURE_UML.md"
];
let fail = 0;
need.forEach(f => {
  if (!fs.existsSync(path.join(root, f))) { console.error("MISSING", f); fail++; }
});
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
["TranslatorUI.js","TextGate.js","WorldModel.js"].forEach(s => {
  if (play.indexOf(s) < 0) { console.error("play.html missing", s); fail++; }
});
if (/EmglkenHost\.js|EmglkenProvider\.js|HostEmglkenBridge\.js/.test(play)) {
  console.error("play.html loads retired experimental Emglken host"); fail++;
}
const nav = fs.readFileSync(path.join(root, "js/Navigator.js"), "utf8");
if (nav.indexOf("StepQueue") < 0) { console.error("Navigator missing StepQueue"); fail++; }
const c = fs.readFileSync(path.join(root, "js/Consts.js"), "utf8");
if (!/BUILD\s*[:=]\s*\d+/.test(c) || !/APPNAME\s*=\s*["']ParchLock["']/.test(c)) {
  console.error("Consts missing current ParchLock build identity"); fail++;
}
const plan = fs.readFileSync(path.join(root, "PRODUCTION_PLAN.md"), "utf8");
["TranslatorUI","HostEmglkenBridge","TextGate","MapIdentity","ActionSynth","D13","D98","D99"].forEach(t => {
  if (plan.indexOf(t) < 0) { console.error("plan missing", t); fail++; }
});
if (fail) { console.error("complete-plan-gate FAIL", fail); process.exit(1); }
console.log("complete-plan-gate PASS");
