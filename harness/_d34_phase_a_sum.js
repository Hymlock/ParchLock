const { spawnSync } = require("child_process");
const r = spawnSync("node", ["harness/_d34_phase_a_deep.js"], { encoding: "utf8", maxBuffer: 20e6 });
r.stdout.split(/\n/).filter(Boolean).forEach((l) => {
    const o = JSON.parse(l);
    if (o.error) { console.log(o.label, o.error); return; }
    console.log(JSON.stringify({
        label: o.label, ver: o.ver, serial: o.serial,
        gpHasEntries: o.gpHasEntries, verbFlagged: o.verbFlagged,
        decode: o.decode, attr: o.attrFilterUniq, attrN: o.attrFilterCount,
        routineN: o.routineFilterCount, nounish: o.nounish, heldish: o.heldish,
        intransitive: o.intransitive, flags: o.flags,
        dirN: o.dirAsVerb && o.dirAsVerb.north,
        take: o.wordBits && o.wordBits.take,
        samples: (o.samples || []).slice(0, 4).map((x) => ({
            w: x.word, which: x.which, n: x.nlines,
            lines: (x.lines || []).slice(0, 3)
        }))
    }));
});
