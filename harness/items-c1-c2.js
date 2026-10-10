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

console.log(n + " C1/C2/D checks passed");
