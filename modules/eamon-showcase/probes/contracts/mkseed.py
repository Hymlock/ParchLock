import json, sys
# usage: mkseed.py <spec-index> <out.js> : seed every tiered adventure as credited EXCEPT the one under test, so its
# tier is open and its own clear is still creditable.
target = json.load(open('inject-specs.json'))[int(sys.argv[1])]['name']
names = ["The Beginner's Cave", "The Wayfarers Inn", "Beginner's Forest", "Beginner's Cave II", "Alternate Beginner's Cave", "The Training Ground",
         "The Deep Canyon", "The Pyramid of Anharos", "Land of the Mountain King", "The Tower of Eamon", "DharmaQuest", "Wrenhold's Secret Vigil",
         "Firestorm", "Escape from Mt. Moon", "The Sub-Aquan Laboratory", "Orb of My Life", "The Temple of Ngurct", "Stronghold of Kahr-Dur",
         "A Runcible Cargo", "The Vile Grimoire of Jaldi'al"]
names = [n for n in names if n != target]
js = r'''(async () => {
  const vm = window.__PARCHLOCK_EAMON__, sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(2500);
  const c = await vm.exportCampaign();
  const chars = c.files.find(f => /PLCHARS/.test(f.path));
  const map = JSON.parse(atob(chars.data)); const id = Object.values(map)[0][1];
  const names = NAMES;
  const ledger = {}; ledger[id] = {cycle: 1, clears: names.map((n, i) => ({adventure: n, run: "seed" + i, cycle: 1}))};
  const enc = s => btoa(unescape(encodeURIComponent(s)));
  c.files = c.files.filter(f => !/PLCLEARS/.test(f.path)).concat([{path: "System/Bin/PLCLEARS.DAT", data: enc(JSON.stringify(ledger))}]);
  c.revision = (c.revision || 0) + 1;
  await vm.importCampaign(c);
  return {seededFor: id, excluded: TARGET};
})()'''.replace('NAMES', json.dumps(names)).replace('TARGET', json.dumps(target))
open(sys.argv[2], 'w').write(js)
