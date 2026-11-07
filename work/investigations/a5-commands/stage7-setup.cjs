const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const freeze = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const ex = new Set();
const harnessDir = "harness";
for (const f of fs.readdirSync(harnessDir)) {
  if (!/d88|d198|d259|d260|wear|light|semantic|m11-rewind/i.test(f)) continue;
  const s = fs.readFileSync(path.join(harnessDir, f), "utf8");
  for (const m of s.matchAll(/[A-Za-z0-9_.-]+\.(?:z[3458]|zblorb|gblorb)\.js/g)) ex.add(m[0]);
  for (const m of s.matchAll(/story=games\/([^'"\s]+)/g)) ex.add(m[1]);
}
["Infidel.z3.js", "TheLurkingHorror.z3.js", "Starcross.z3.js", "Enchanter.z3.js", "Cutthroats.z3.js", "LLR3.z8.js", "Advent.z5.js"].forEach((x) =>
  ex.add(x)
);
const games = fs.readdirSync("games").filter((f) => /\.(z[3458]|zblorb|gblorb)\.js$/i.test(f));
const pool = games.filter((g) => !ex.has(g));
function pick(pred, n = 1) {
  return pool.filter(pred).slice(0, n);
}
// crude type buckets
const z3 = pick((g) => /\.z3\.js$/i.test(g) && !/zork|wish|infidel|enchanter|starcross|hollywood|station|hollywood|hollywood/i.test(g));
const z5 = pick((g) => /\.z5\.js$/i.test(g) && !/advent|anchor|zork/i.test(g));
const z8 = pick((g) => /\.z8\.js$/i.test(g) && !/llr3|vespers/i.test(g));
const zblorb = pick((g) => /\.zblorb\.js$/i.test(g));
const zil = pick((g) => /Zork|Wish|Planetfall|Sorcerer|Ballyhoo|Deadline|Moonmist|Hollywood|Suspect|Witness/i.test(g));
const list = {
  freeze,
  exclusionCount: ex.size,
  exclusionSample: [...ex].sort().slice(0, 40),
  heldOut: {
    informZ3: z3[0] || null,
    informZ5: z5[0] || null,
    informZ8: z8[0] || null,
    zblorb: zblorb[0] || null,
    zil: zil[0] || null,
    wump2ka: games.includes("wump2ka.z5.js") ? "wump2ka.z5.js" : null,
    AOTYRZ: games.find((g) => /aotyrz/i.test(g)) || null,
    dupNoun: games.find((g) => /curses|jigsaw|anchor|photopia|balances/i.test(g) && !ex.has(g)) || z5[1] || null
  }
};
fs.writeFileSync("work/investigations/a5-commands/STAGE7-heldout-list.json", JSON.stringify(list, null, 2));
console.log(JSON.stringify(list, null, 2));
