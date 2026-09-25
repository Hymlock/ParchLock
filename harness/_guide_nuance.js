const fs = require("fs");
const plan = fs.readFileSync("PRODUCTION_PLAN.md","utf8") + "\n" + fs.readFileSync("ARCHITECTURE_UML.md","utf8");
const guide = fs.readFileSync("Full Stack Engine Level Conversion.txt","utf8");

const checks = [
  ["look-ahead / peek exits without travel", /look-?ahead|peek.*exit|unvisited.*exit/i],
  ["RAM dictionary table word?ObjectID", /dictionary table|dict.*object|word.?to.?object/i],
  ["supporter vs container recursion rules", /supporter|opaque|transparent|closed.?container/i],
  ["worn vs carried inventory grouping", /worn|carried|wearing/i],
  ["get_player_object_id export", /get_player_object|player_obj/i],
  ["get_vm_ram_ptr export", /get_vm_ram_ptr|ram_base|HEAPU8|vm_read/i],
  ["I6/I7/PunyInform schema maps", /PunyInform|Inform6|Inform7|fingerprint/i],
  ["@restore/@undo opcode hooks", /@restore|@undo|opcode hook|restorestat/i],
  ["force-directed / D3 layout", /D3|force-directed|force layout/i],
  ["edge-crossing minimization detail", /crossing|planar/i],
  ["grammar table verb extraction", /grammar table/i],
  ["UIPayload full schema from guide", /discoveredObjects|specialCommands|glkBounds|schemaId/i],
  ["AsyncGlk as middleware (not Quixe Loop)", /AsyncGlk|Glk sync|extevent/i],
  ["protocol-first rejection of RAM-first", /protocol-first|RAM-correctness-first|reject/i]
];

console.log("Nuanced checks (plan vs guide)\n");
checks.forEach(([name, re]) => {
  console.log(`${name}\n  guide: ${re.test(guide)?"yes":"no"}  plan/UML: ${re.test(plan)?"yes":"no"}`);
});

// Pull guide UIPayload schema block
const i = guide.indexOf("Extended Combined UI Payload");
console.log("\n=== Guide payload schema excerpt ===\n");
console.log(guide.slice(i, i+900));
