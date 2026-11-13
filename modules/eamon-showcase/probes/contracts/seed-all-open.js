(async () => {
  const vm = window.__PARCHLOCK_EAMON__, sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(2500);
  const c = await vm.exportCampaign();
  const chars = c.files.find(f => /PLCHARS/.test(f.path));
  const map = JSON.parse(atob(chars.data)); const id = Object.values(map)[0][1];
  const names = ["The Beginner's Cave","The Wayfarers Inn","Beginner's Forest","Beginner's Cave II","Alternate Beginner's Cave","The Training Ground","The Deep Canyon","The Pyramid of Anharos","Land of the Mountain King","The Tower of Eamon","DharmaQuest","Wrenhold's Secret Vigil","Firestorm","Escape from Mt. Moon","The Sub-Aquan Laboratory","Orb of My Life","The Temple of Ngurct","Stronghold of Kahr-Dur","A Runcible Cargo","The Vile Grimoire of Jaldi'al"];
  const ledger = {}; ledger[id] = {cycle: 1, clears: names.map((n, i) => ({adventure: n, run: "seed" + i, cycle: 1}))};
  const enc = s => btoa(unescape(encodeURIComponent(s)));
  c.files = c.files.filter(f => !/PLCLEARS/.test(f.path)).concat([{path: "System/Bin/PLCLEARS.DAT", data: enc(JSON.stringify(ledger))}]);
  c.revision = (c.revision || 0) + 1;
  await vm.importCampaign(c);
  setTimeout(() => location.reload(), 300);
  return {seededFor: id};
})()
