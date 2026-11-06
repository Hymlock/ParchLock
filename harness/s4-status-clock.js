// S4 (a): StatusGridDecoder clock accepts 3-letter weekdays and a.m./p.m.
// The whole weekday+clock segment becomes the time metric and leaves
// roomCandidates; bare numbers stay unlabelled.
"use strict";
const path = require("path");
const D = require(path.resolve(__dirname, "..", "js", "StatusGridDecoder.js"));
const probe = require(path.resolve(__dirname, "..", "work", "investigations", "s4-status", "probe.json"));
let fail = 0;
function check(name, ok, info) { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  " + JSON.stringify(info))); if (!ok) fail++; }
function time(d) { return d.metrics.find(m => m.key === "time"); }

let d = D.decode(" 221-B Baker Street            Sat  5:11 AM     0");
check("Sat 5:11 AM -> time metric", time(d) && time(d).value === "Sat  5:11 AM", d);
check("Sat 5:11 AM -> room 221-B Baker Street", d.roomLabel === "221-B Baker Street", d);
check("Sat 5:11 AM leaves roomCandidates", !d.roomCandidates.some(c => /5:11/.test(c)), d);
check("bare 0 stays unlabelled", d.roomCandidates.includes("0") && d.metrics.length === 1, d);

d = D.decode("Saturday  5:11:00 a.m.                                                ");
check("Saturday 5:11:00 a.m. -> time metric", time(d) && time(d).value === "Saturday  5:11:00 a.m.", d);
check("Saturday 5:11:00 a.m. leaves roomCandidates", d.roomCandidates.length === 0, d);

d = D.decode(" Saturday Market                Score: 3");
check("Saturday Market -> no time metric", !time(d) && d.roomLabel === "Saturday Market", d);
d = D.decode("Saturday Market");
check("Saturday Market alone -> no metric", d.metrics.length === 0 && d.roomLabel === "Saturday Market", d);
d = D.decode(" Hall      5:11 amulet");
check("5:11 amulet is not a clock", !time(d), d);
d = D.decode(" Hall      Wed. 12:30 p.m.");
check("Wed. 12:30 p.m. -> time metric", time(d) && d.roomLabel === "Hall", d);

for (const k of ["curses-1280", "curses-396"]) {
    const before = probe[k].decoded, after = D.decode(probe[k].raw);
    check(k + " decode unchanged (date, metrics, rooms)",
        JSON.stringify(after.metrics) === JSON.stringify(before.metrics) &&
        JSON.stringify(after.roomCandidates) === JSON.stringify(before.roomCandidates), { before, after });
}
console.log(fail ? fail + " FAIL" : "0 FAIL");
process.exit(fail ? 1 : 0);
