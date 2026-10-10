const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const code = fs.readFileSync(path.resolve("js/Actionable.js"), "utf8");
const ctx = {
  window: {},
  ZRamProvider: { getMem: function () { return null; } },
  ZRamReader: {
    shortName: function (m, id) {
      if (id === 1) return "scribbled note";
      if (id === 2) return "scrawled note";
      if (id === 3) return "white party ticket";
      if (id === 4) return "ID card";
      if (id === 5) return "featureless white cube";
      if (id === 6) return "wineskin with red wine";
      if (id === 7) return "small golden talisman";
      return "";
    },
    parserWordsAny: function () { return []; },
    objectCount: function () { return 10; },
    isInformCompiled: function () { return true; }
  },
  console: console,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  JSON: JSON,
  Math: Math,
  RegExp: RegExp,
  Set: Set,
  Map: Map
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(code + "\nthis.Actionable = Actionable;", ctx);
const A = ctx.Actionable;

let n = 0;
function check(v, msg) {
  assert(v, msg);
  n++;
  console.log("PASS:", msg);
}

const note1 = { id: 1, name: "scribbled note", structuralName: "scribbled note", aliases: ["scribbled", "note", "scrap", "of", "paper"] };
const note2 = { id: 2, name: "scrawled note", structuralName: "scrawled note", aliases: ["scrawled", "note", "scrap", "of", "paper"] };
const pool = [note1, note2];
const ticket = { id: 3, name: "white party ticket", structuralName: "white party ticket", aliases: ["white", "party", "ticket"] };

// C1: newline must not join phrase words
const ticketCross = A.observedPhraseFor(ticket, [ticket], "You carry a white party\nticket today.", false);
check(String(ticketCross).toLowerCase() !== "white party ticket", "C1: no cross-newline white party+ticket (got " + ticketCross + ")");
check(A.observedPhraseFor(note1, pool, "a scribbled note is here", false).toLowerCase() === "scribbled note", "C1: same-line still matches");

// C2: preserve printed casing
check(A.observedPhraseFor(ticket, [ticket], "You carry a White Party Ticket.", false) === "White Party Ticket", "C2: White Party Ticket casing");
const idcard = { id: 4, name: "id card", structuralName: "ID card", aliases: ["id", "card", "ID"] };
check(A.observedPhraseFor(idcard, [idcard], "You have an ID card.", false) === "ID card", "C2: ID card casing");

// Fix D / 543b0be displayNameFor must not prefer shared scrap of paper
check(A.displayNameFor(note1, pool, "A scrap of paper lies here.") === "scribbled note", "D: structural over shared scrap of paper");
check(A.displayNameFor(note1, pool, "You are carrying:\na scribbled note\na scrawled note").toLowerCase() === "scribbled note", "D: inventory scribbled");
check(A.displayNameFor(note2, pool, "You are carrying:\na scribbled note\na scrawled note").toLowerCase() === "scrawled note", "D: inventory scrawled");

// Follow-up 2: structural printed in text contains observed sub-phrase
const cube = {
  id: 5,
  name: "white cube",
  structuralName: "featureless white cube",
  aliases: ["featureless", "white", "cube"]
};
A.Scope = A.Scope || {};
A.Scope.lastInventoryText = "You are carrying:\na featureless white cube";
A.Scope.lastLookText = "A white cube is here.";
check(
  A.displayNameFor(cube, [cube], A.Scope.lastLookText + "\n" + A.Scope.lastInventoryText).toLowerCase() === "featureless white cube",
  "FU2: structural wins when printed and contains observed"
);
const wine = {
  id: 6,
  name: "red wine",
  structuralName: "wineskin with red wine",
  aliases: ["wineskin", "with", "red", "wine"]
};
A.Scope.lastInventoryText = "a wineskin with red wine";
A.Scope.lastLookText = "";
check(
  A.displayNameFor(wine, [wine], "red wine\n" + A.Scope.lastInventoryText).toLowerCase() === "wineskin with red wine",
  "FU2: wineskin with red wine"
);

// Follow-up 1: casing from inventory occurrence
const talisman = {
  id: 7,
  name: "small golden talisman",
  structuralName: "small golden talisman",
  aliases: ["small", "golden", "talisman"]
};
A.Scope.lastInventoryText = "a small golden talisman";
A.Scope.lastLookText = "The Small Golden Talisman gleams on the altar.";
check(
  A.displayNameFor(talisman, [talisman], A.Scope.lastLookText + "\n" + A.Scope.lastInventoryText) === "small golden talisman",
  "FU1: casing prefers inventory occurrence"
);

console.log(n + " C1/C2/D/FU checks passed");
