(async () => {
  // Kahr-Dur live proof, test character only: all tiers open except Kahr-Dur itself, and a character able to survive
  // it (stats, all four spells known, some gold). The proof is the adventure's own route and finish, not progression.
  const vm = window.__PARCHLOCK_EAMON__, sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(2500);
  const c = await vm.exportCampaign();
  const chars = c.files.find(f => /PLCHARS/.test(f.path));
  const map = JSON.parse(atob(chars.data)); const id = Object.values(map)[0][1];
  const names = ["The Beginner's Cave","The Wayfarers Inn","Beginner's Forest","Beginner's Cave II","Alternate Beginner's Cave","The Training Ground","The Deep Canyon","The Pyramid of Anharos","Land of the Mountain King","The Tower of Eamon","DharmaQuest","Wrenhold's Secret Vigil","Firestorm","Stronghold of Kahr-Dur","The Sub-Aquan Laboratory","Orb of My Life","The Temple of Ngurct","A Runcible Cargo","The Vile Grimoire of Jaldi'al"];
  const ledger = {}; ledger[id] = {cycle: 1, clears: names.map((n, i) => ({adventure: n, run: "seed" + i, cycle: 1}))};
  const enc = s => btoa(unescape(encodeURIComponent(s)));
  const fromB64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
  const toB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const ch = c.files.find(f => /System\/Bin\/CHARACTERS\.DAT$/i.test(f.path));
  let bytes = fromB64(ch.data), gz = bytes[0] === 0x1f && bytes[1] === 0x8b;
  let xml = gz ? new TextDecoder().decode(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : new TextDecoder().decode(bytes);
  const parts = xml.split('<SingleArray name="Stats">');
  let edited = false;
  for (let i = 1; i < parts.length; i++) {
    if (!/name="Name" value="Parch Tester"/.test(parts[i].slice(0, 3000))) continue;
    let p = parts[i];
    const setArray = (src, values) => { let k = 0; return src.replace(/<Simple value="-?\d+" \/>/g, m => (k < values.length ? '<Simple value="' + values[k++] + '" />' : m)); };
    const statsEnd = p.indexOf('</SingleArray>');
    p = setArray(p.slice(0, statsEnd), [0, 18, 24, 24, 18]) + p.slice(statsEnd);
    const sp = p.indexOf('<SingleArray name="SpellAbilities">'); const spEnd = p.indexOf('</SingleArray>', sp);
    p = p.slice(0, sp) + setArray(p.slice(sp, spEnd), [0, 100, 100, 100, 100]) + p.slice(spEnd);
    p = p.replace(/name="HeldGold" value="\d+"/, 'name="HeldGold" value="2000"');
    parts[i] = p; edited = true;
  }
  xml = parts.join('<SingleArray name="Stats">');
  let out = new TextEncoder().encode(xml);
  if (gz) out = new Uint8Array(await new Response(new Blob([out]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  c.files = c.files.map(f => f === ch ? { path: f.path, data: toB64(out) } : f);
  c.files = c.files.filter(f => !/PLCLEARS/.test(f.path)).concat([{path: "System/Bin/PLCLEARS.DAT", data: enc(JSON.stringify(ledger))}]);
  c.revision = (c.revision || 0) + 1;
  await vm.importCampaign(c);
  return {seededFor: id, characterEdited: edited, gz};
})()
