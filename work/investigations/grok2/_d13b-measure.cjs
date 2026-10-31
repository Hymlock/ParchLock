// D13b growth model from js/ structure only.
function report(name, obj) {
  const s = typeof obj === "string" ? obj : JSON.stringify(obj);
  console.log(String(name).padEnd(44), "chars=" + String(s.length).padStart(8), "utf16KB=" + ((s.length * 2) / 1024).toFixed(1));
  return s.length;
}

function attrObjEntry() {
  return {
    takeable: true,
    confirmedAt: 99999,
    allowedVerbs: {
      examine: { confirmations: 3, opcodeConfirmed: true },
      open: { confirmations: 3, opcodeConfirmed: true },
      close: { confirmations: 2, opcodeConfirmed: false },
      take: { confirmations: 5, opcodeConfirmed: true },
      put: { confirmations: 2, opcodeConfirmed: false },
      look: { confirmations: 2, opcodeConfirmed: false }
    },
    exactForms: {
      "look at lamp": { confirmations: 2, objectId: 1, form: "look at lamp" },
      "turn on lamp": { confirmations: 2, objectId: 1, form: "turn on lamp" },
      "turn off lamp": { confirmations: 2, objectId: 1, form: "turn off lamp" },
      "examine brass lantern": { confirmations: 2, objectId: 1, form: "examine brass lantern" }
    }
  };
}

function attrTable(nObj) {
  const objects = {};
  for (let i = 1; i <= nObj; i++) objects[String(i)] = attrObjEntry();
  return {
    version: 2,
    verbs: {
      open: { candidates: { 21: true }, mutatedBit: 21, confirmations: 5, polarities: { set_attr: true, clear_attr: true } },
      locked: { candidates: { 22: true }, mutatedBit: 22, confirmations: 5, polarities: { set_attr: true, clear_attr: true } },
      worn: { candidates: { 23: true }, mutatedBit: 23, confirmations: 5, polarities: { set_attr: true, clear_attr: true } },
      on: { candidates: { 24: true }, mutatedBit: 24, confirmations: 5, polarities: { set_attr: true, clear_attr: true } }
    },
    objects,
    inventoryRootId: 1,
    verbBehavior: {
      disabled: { attack: { confirmed: true, objIds: [1, 2, 3] }, kiss: { confirmed: true, objIds: [4] } },
      substituteVerb: "look at",
      substituteCandidates: { look: { n: 3 }, x: { n: 1 } }
    }
  };
}

function exitTable(nBlockedRooms) {
  const dirs = {}, cand = {}, blocked = {};
  const labels = ["north", "south", "east", "west", "up", "down", "in", "out", "ne", "nw", "se", "sw"];
  labels.forEach(function (d) {
    dirs[d] = { prop: 6, mode: "byte", sizes: [1, 1, 1, 1], confirmed: true, contra: 0, rooms: [10, 11, 12, 13, 14, 15, 16, 17] };
    cand[d] = {};
    for (let i = 0; i < 20; i++) {
      cand[d][String(100 + i)] = { prop: 6, mode: "byte", rooms: [1, 2, 3, 4, 5, 6, 7, 8], sizes: [1, 1, 1, 1] };
    }
  });
  for (let r = 1; r <= nBlockedRooms; r++) {
    labels.forEach(function (d) { blocked[r + "|" + d] = 3; });
  }
  return { v: 1, dirs: dirs, cand: cand, blocked: blocked };
}

function statsModel(nItems) {
  const itemMetrics = {};
  for (let i = 1; i <= nItems; i++) {
    itemMetrics[String(i)] = {
      value: { prop: 12, hits: 5, candidates: [12], current: false, lastValue: null, transitions: 0 },
      weight: { prop: 13, hits: 5, candidates: [13], current: false, lastValue: null, transitions: 0 }
    };
  }
  const evidence = [];
  for (let e = 0; e < 160; e++) {
    evidence.push({
      storyEpoch: 1,
      submissionId: "s" + e,
      valueShape: "scalar",
      boundSemantics: "maximum",
      confidence: "authoritative",
      contradictions: 0,
      key: "score",
      source: "module-command"
    });
  }
  return {
    stats: {
      score: { key: "score", label: "Score", value: null, max: 100, unit: "fraction", kind: "gauge" },
      health: { key: "health", label: "Health", value: null }
    },
    globals: { score: 1, turns: 2, health: 40 },
    properties: { health: 15 },
    carry: {
      value: { prop: 12, hits: 5, candidates: [12] },
      weight: { prop: 13, hits: 5, candidates: [13] }
    },
    evidence: evidence,
    conditions: { hunger: { state: "unknown" }, thirst: { state: "unknown" } },
    itemMetrics: itemMetrics,
    deaths: 0,
    wins: 0,
    scoreUnavailable: false,
    scoreMetricKey: "score",
    rank: null,
    probed: true,
    seenBanners: { death: true }
  };
}

function lw(n) {
  const rows = {};
  for (let i = 0; i < n; i++) {
    rows["r" + i] = {
      label: "L".repeat(80),
      trigger: "T".repeat(60),
      ignored: false,
      revision: "rev" + i,
      witnesses: ["a", "b"],
      objectId: i,
      original: "O".repeat(40)
    };
  }
  return { version: 1, gameIdentityKey: "88-820911", rows: rows };
}

function dir(n) {
  const customSlices = [];
  for (let i = 0; i < n; i++) {
    customSlices.push({
      id: "cs" + i + "abcdefgh",
      label: "L".repeat(20),
      command: "c".repeat(200),
      angle: i % 360,
      ring: i % 5
    });
  }
  return { customSlices: customSlices };
}

function sem(n) {
  const entries = [];
  for (let i = 0; i < n; i++) {
    entries.push({
      intent: "INSPECT",
      formId: "f" + i,
      objectIds: [i],
      command: "examine thing " + i,
      source: "witness",
      confirmed: true,
      observedAt: 1730000000000
    });
  }
  return { version: 1, buildKey: "88-820911-abcd-d88-stage5-v1-en", entries: entries };
}

function diag() { return { swapped: false }; }

console.log("=== PER-MODULE LearningStores-managed sizes (modeled from js/) ===");
report("attrCalib empty", { version: 2, verbs: {}, objects: {} });
report("attrCalib 50 objs", attrTable(50));
report("attrCalib 200 objs heavy ZIL", attrTable(200));
report("attrCalib 800 objs heavy Inform", attrTable(800));
report("exitCalib light blocked20", exitTable(20));
report("exitCalib blocked200*12", exitTable(200));
report("exitCalib blocked500*12", exitTable(500));
report("stats light 5 items +160 evidence", statsModel(5));
report("stats 100 items", statsModel(100));
report("stats 500 items", statsModel(500));
report("learnedWords 20 rows max fields", lw(20));
report("learnedWords 200 rows", lw(200));
report("dirRadial 10 custom", dir(10));
report("dirRadial 100 custom NO CAP", dir(100));
report("dirRadial 1000 custom NO CAP", dir(1000));
report("semantic 0 confirmed (code today)", sem(0));
report("semantic 200 confirmed future", sem(200));
report("diagonalCalib", diag());

let long = 0;
[attrTable(200), exitTable(100), statsModel(80), lw(50), dir(20), sem(0), diag()].forEach(function (o) {
  long += JSON.stringify(o).length;
});
console.log("\nSum long playthrough 200obj/100block/80item/50lw/20dir chars=" + long + " utf16KB=" + ((long * 2) / 1024).toFixed(1));

let extreme = 0;
[attrTable(800), exitTable(500), statsModel(500), lw(200), dir(1000), sem(200), diag()].forEach(function (o) {
  extreme += JSON.stringify(o).length;
});
console.log("Sum extreme single module chars=" + extreme + " utf16KB=" + ((extreme * 2) / 1024).toFixed(1));

const entries = {};
for (let m = 0; m < 50; m++) {
  ["PL_AttrCalib_", "PM_ExitCalib_", "PM_Stats_", "PL_LearnedWordOverrides_", "PL_DirRadial_", "PL_SemanticActions_", "PL_DiagonalCalib_"].forEach(function (p, i) {
    const k = p + "id" + m;
    const owners = [];
    for (let o = 0; o < 2; o++) {
      owners.push({ digest: "a".repeat(64), path: "games/Foo.z5.js", inputs: { identityKey: "id" + m } });
    }
    entries[k] = { key: k, kind: "k" + i, owners: owners };
  });
}
report("index 50 modules x7 kinds x2 owners", { v: 1, revision: 100, entries: entries, tombstones: {} });

console.log("\n=== NOT LearningStores-managed (erase leaves these) ===");
console.log("PL_Map_*: grows with visited rooms + notes (maxlength 500/note) - unbounded by exploration");
console.log("PL_Save_/PL_SaveState_*: user-owned multi-slot saves");
console.log("PL_Transcript_*: full play text - can be multi-MB");
console.log("PL_Playthroughs_*: MAX_RUNS 2048, MAX_RECENT 128");
console.log("localStorage typical quota ~5MB utf-16 (~2.5M chars) shared whole origin");
