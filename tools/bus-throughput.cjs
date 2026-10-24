// Bus throughput monitor (claude, 2026-10-24): per-seat output, idle gaps and reply latency from mailbox timestamps.
// Usage: node tools/bus-throughput.cjs [hours=3]
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '.ai-bus', 'runtime', 'mailbox', 'inbox');
const hours = +process.argv[2] || 3, since = Date.now() - hours * 3600e3;
const msgs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(dir, f))); } catch (e) { return null; } })
  .filter(m => m && Date.parse(m.createdAt) >= since).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
const isPacket = m => /packet|qualified|READY|PASS|ACCEPT|OBJECT|census/i.test(m.subject || '');
const seats = {};
for (const m of msgs) { const s = seats[m.from] || (seats[m.from] = { sent: 0, packets: 0, times: [] }); s.sent++; if (isPacket(m)) s.packets++; s.times.push(Date.parse(m.createdAt)); }
const min = ms => Math.round(ms / 60e3);
console.log(`window ${hours}h, ${msgs.length} messages`);
console.log('seat      sent packets  maxIdleMin  lastSeenMinAgo');
for (const [k, s] of Object.entries(seats)) {
  let gap = s.times[0] - since; for (let i = 1; i < s.times.length; i++) gap = Math.max(gap, s.times[i] - s.times[i - 1]);
  gap = Math.max(gap, Date.now() - s.times[s.times.length - 1]);
  console.log(k.padEnd(9), String(s.sent).padStart(4), String(s.packets).padStart(7), String(min(gap)).padStart(11), String(min(Date.now() - s.times[s.times.length - 1])).padStart(15));
}
// claude reply latency: time from a message to claude until claude's next message to that seat
const lat = {};
msgs.forEach((m, i) => { if (m.to !== 'claude') return; const r = msgs.slice(i + 1).find(x => x.from === 'claude' && x.to === m.from);
  if (r) (lat[m.from] = lat[m.from] || []).push(Date.parse(r.createdAt) - Date.parse(m.createdAt)); });
for (const [k, v] of Object.entries(lat)) { v.sort((a, b) => a - b); console.log(`claude reply latency to ${k}: median ${min(v[v.length >> 1])} min, max ${min(v[v.length - 1])} min (n=${v.length})`); }
