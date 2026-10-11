#!/usr/bin/env node
// Bus watch (operator 2026-10-11): polls the bus every 30s for NEW messages from codex
// to grok2 (and orchestrator, if that seat exists) and EXITS 0 when one arrives,
// printing each new id and subject. Read-only: uses the sanctioned CLI `inbox`.
// The built-in `mailbox wait --for` returns on ANY waiting message from any sender,
// so it cannot wake only on new Codex mail.
//   node work/bus-watch.mjs [--since 3336] [--interval 30] [--from codex]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const from = arg('from', 'codex'), seats = ['grok2', 'orchestrator'], interval = +arg('interval', 30) * 1000;
const read = () => { const out = []; for (const seat of seats) { let txt = ''; try { txt = execFileSync(process.execPath, [path.join(root, '.ai-bus/bin/mailbox.js'), 'inbox', '--for', seat], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60000 }); } catch (e) { txt = String(e.stdout || ''); }
  const re = new RegExp('^#(\\d+) ' + from + ' -> ' + seat + '[^\\n]*\\nsubject: ([^\\n]*)', 'gm'); let m; while ((m = re.exec(txt))) out.push({ id: +m[1], seat, subject: m[2].trim() }); } return out; };
let since = arg('since', null); since = since == null ? Math.max(0, ...read().map(x => x.id)) : +since;
console.log(`[bus-watch] watching ${from} -> ${seats.join('/')} for ids > ${since}, every ${interval / 1000}s`);
const tick = () => { const fresh = read().filter(x => x.id > since).sort((a, b) => a.id - b.id);
  if (fresh.length) { const seen = new Set(); fresh.forEach(x => { if (seen.has(x.id)) return; seen.add(x.id); console.log(`#${x.id} ${from} -> ${x.seat}: ${x.subject}`); }); process.exit(0); }
  setTimeout(tick, interval); };
tick();
