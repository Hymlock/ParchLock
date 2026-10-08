// I3/P3 voice-input lifecycle, with a controlled fake native plugin whose
// stop() NEVER resolves (as the installed SpeechRecognition plugin's does).
//   node harness/p3-mic-lifecycle.js
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 360, height: 800 } })).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/deephome.z5.js'); await p.waitForTimeout(6000);
  await p.evaluate(() => { if (window.Message && Message.IsOpen) Message.Hide(); });
  const out = []; const ok = (c, m) => out.push((c ? 'PASS: ' : 'FAIL: ') + m);
  await p.evaluate(() => {
    // Fake plugin: each start() is a pending promise the test resolves; stop() hangs forever.
    window.__fake = { starts: [], stops: 0 };
    const fake = {
      available: () => Promise.resolve({ available: true }),
      checkPermissions: () => Promise.resolve({ speechRecognition: 'granted' }),
      requestPermissions: () => Promise.resolve({ speechRecognition: 'granted' }),
      start: () => new Promise((resolve) => { window.__fake.starts.push({ at: Date.now(), resolve }); }),
      stop: () => { window.__fake.stops++; return new Promise(() => {}); }
    };
    Input.NativeMicPlugin = () => fake;
    Input.Mic.ready = false; Input.Mic.live = null; Input.Mic.diag.ring = [];
    window.__subs = []; const o = Actionable.Submit; Actionable.Submit = function (c) { window.__subs.push(String(c)); return true; };
    if (window.Global && Global.Prefs) { Global.Prefs.MicHoldToTalk = true; Global.Prefs.MicAutoSendOnRelease = true; }
  });
  const sleep = (ms) => p.waitForTimeout(ms);
  const starts = () => p.evaluate(() => window.__fake.starts.length);
  const resolveStart = (i, text) => p.evaluate(([i, text]) => window.__fake.starts[i].resolve(text == null ? { matches: [] } : { matches: [text] }), [i, text]);

  // 1. Normal hold: one segment with text, release while the next is pending.
  await p.evaluate(() => Input.Mic.press()); await sleep(900);
  ok(await starts() === 1, 'press starts exactly one native session');
  await resolveStart(0, 'look'); await sleep(400);
  ok(await starts() === 2, 'mid-hold the recognizer restarts after the first segment settles');
  await p.evaluate(() => Input.Mic.release()); await sleep(4600);   // stop() never resolves -> 4s forced commit
  const subs1 = await p.evaluate(() => window.__subs.slice());
  ok(subs1.length === 1 && subs1[0] === 'look', 'release commits the dictated text once although stop() never resolves: ' + JSON.stringify(subs1));

  // 2. A new press while session #2 is still unsettled waits, then abandons it.
  const t0 = Date.now();
  await p.evaluate(() => Input.Mic.press()); await sleep(1200);
  ok(await starts() === 2, 'no new start while the previous session has not settled');
  await sleep(2200);
  const n3 = await starts();
  ok(n3 === 3, 'after the bounded wait the previous session is abandoned and a fresh one starts');
  const diag = await p.evaluate(() => Input.Mic.diag.ring.map(e => e.type));
  ok(diag.includes('wait-prev') && diag.includes('abandon-prev'), 'diagnostics record the wait and the abandonment: ' + diag.join(','));

  // 3. The abandoned session's late result must never be sent.
  await resolveStart(1, 'ghost words'); await sleep(400);
  await resolveStart(2, 'north'); await sleep(300);
  await p.evaluate(() => Input.Mic.release()); await sleep(4600);
  const subs2 = await p.evaluate(() => window.__subs.slice(1));
  ok(!subs2.some(s => /ghost/.test(s)), 'a late result from the abandoned session never commits');
  ok(subs2.length === 1 && subs2[0] === 'north', 'the new gesture commits its own text: ' + JSON.stringify(subs2));

  // 4. Backoff: three QUICK empty segments in a row (the busy/error loop) end the hold session.
  await sleep(2700);   // let the stuck session from step 3 be abandoned on the next press if needed
  const before = await starts();
  await p.evaluate(() => Input.Mic.press());
  for (let k = 0; k < 3; k++) {
    for (let w = 0; w < 40 && (await starts()) <= before + k; w++) await sleep(150);
    await resolveStart(before + k, null);
  }
  await sleep(2500);
  const st = await p.evaluate(() => ({ active: Input.Mic.active, diag: Input.Mic.diag.ring.map(e => e.type) }));
  ok(!st.active && st.diag.includes('backoff-stop'), 'three consecutive empty segments end the hold (no endless restarts)');
  ok((await starts()) === before + 3, 'exactly three starts in that hold');

  // 5. A TTS stop that never resolves delays the mic by at most ~600ms.
  await p.evaluate(() => { window.__realStop = ReadAloud.stop; ReadAloud.stop = () => new Promise(() => {}); });
  const b5 = await starts(); const t5 = Date.now();
  await p.evaluate(() => Input.Mic.press());
  for (let w = 0; w < 40 && (await starts()) === b5; w++) await sleep(100);
  ok((await starts()) === b5 + 1 && Date.now() - t5 < 2000, 'a hung TTS stop cannot block recording (started in ' + (Date.now() - t5) + 'ms)');
  await p.evaluate(() => { ReadAloud.stop = window.__realStop; Input.Mic.release(); });

  // 6. Diagnostics never contain recognised text, and carry the release/ensure/TTS-wait timing.
  const ring = await p.evaluate(() => Input.Mic.diag.export());
  ok(!/look|north|ghost/.test(ring), 'diagnostics export carries no recognised text');
  const types = JSON.parse(ring).events.map(e => e.type);
  ok(['release', 'ensure-begin', 'ensure-end', 'tts-wait'].every(t => types.includes(t)), 'diagnostics carry release, ensure begin/end and TTS-wait timing');
  ok(JSON.parse(ring).events.some(e => e.type === 'tts-wait' && e.result === 'timeout'), 'the hung TTS stop is recorded as a timeout');
  const meta = JSON.parse(ring);
  // #1576: app info and shell cache key resolve in either order; both survive.
  const orders = await p.evaluate(async () => {
    const d = Input.Mic.diag, realCap = window.Capacitor, realKeys = window.caches && caches.keys, out = [];
    for (const appFirst of [true, false]) {
      d.build = null; d.buildApp = ''; d.buildShell = '';
      const appMs = appFirst ? 10 : 60, shellMs = appFirst ? 60 : 10;
      window.Capacitor = { Plugins: { App: { getInfo: () => new Promise(r => setTimeout(() => r({ version: '1.2', build: '34' }), appMs)) } } };
      caches.keys = () => new Promise(r => setTimeout(() => r(['other', 'parchlock-shell-v999']), shellMs));
      d.readBuild(); await new Promise(r => setTimeout(r, 120));
      out.push(JSON.parse(d.export()).build);
    }
    window.Capacitor = realCap; if (realKeys) caches.keys = realKeys;
    return out;
  });
  ok(orders.every(b => b === '1.2/34 parchlock-shell-v999'), 'build keeps both app and shell results in either completion order: ' + JSON.stringify(orders));
  ok(/^[a-z0-9]{4,}$/.test(meta.session) && meta.sessionBootAt && meta.uptimeMs > 0 && 'build' in meta, 'export carries JS session id, boot time, uptime and build: ' + JSON.stringify({ s: meta.session, up: meta.uptimeMs, b: meta.build }));

  // 7. Tap mode (#1570): narration deferred while recording survives the stop tap and resumes once.
  await sleep(4600);   // step 5 release -> its 4s forced commit must finish first
  await p.evaluate(() => {
    Input.Mic.live = null; Global.Prefs.MicHoldToTalk = false;
    window.__spoken = []; window.__PL_TEST_SPEECH = true; ReadAloud.prefsOn = () => true;
    ReadAloud.nativePlugin = () => null;
    window.speechSynthesis.speak = () => {}; window.speechSynthesis.cancel = () => {};
    const o = ReadAloud.speak; ReadAloud.speak = (t) => { window.__spoken.push({ t: String(t), busy: ReadAloud.micBusy() }); return o(t); };
    window.__resumes = 0; const r = ReadAloud.resumeAfterMic; ReadAloud.resumeAfterMic = () => { window.__resumes++; return r(); };
  });
  const b7 = await starts();
  await p.evaluate(() => Input.Mic.press());
  for (let w = 0; w < 40 && (await starts()) === b7; w++) await sleep(100);
  await p.evaluate(() => ReadAloud.speak('Tap the map to continue the tour.'));
  const stops7 = await p.evaluate(() => ReadAloud.ttsCounts.stop);
  await p.evaluate(() => Input.Mic.press());           // second tap = stop recording
  ok(await p.evaluate(() => ReadAloud.ttsCounts.stop) === stops7 && /continue the tour/.test(await p.evaluate(() => ReadAloud._micDeferredSpeech)),
    'the stop tap neither stops TTS nor clears the deferred narration');
  await resolveStart(b7, 'look'); await sleep(500);
  const sp = await p.evaluate(() => window.__spoken.filter(s => /continue the tour/.test(s.t)));
  ok(sp.length === 2 && sp[0].busy && !sp[1].busy, 'deferred narration resumes exactly once after commit: ' + JSON.stringify(sp));

  // 8. An error outcome also resumes deferred narration.
  const b8 = await starts(), r8 = await p.evaluate(() => window.__resumes);
  await p.evaluate(() => Input.Mic.press());
  for (let w = 0; w < 40 && (await starts()) === b8; w++) await sleep(100);
  await p.evaluate((i) => window.__fake.starts[i].resolve(Promise.reject({ message: 'network error' })), b8);
  await sleep(400);
  ok(await p.evaluate(() => !Input.Mic.active) && await p.evaluate(() => window.__resumes) === r8 + 1, 'an error commit resumes deferred narration too');

  // 9. Web path: a hung SpeechRecognition is aborted before a new one starts; one that will not end fails closed.
  const web = async (abortEnds) => p.evaluate(async (abortEnds) => {
    window.__recs = [];
    window.SpeechRecognition = function () { const r = this; window.__recs.push(r); r.live = false;
      r.start = () => { r.live = true; }; r.stop = () => {};
      r.abort = () => { r.aborted = true; if (abortEnds) { r.live = false; setTimeout(() => r.onend && r.onend(), 50); } }; };
    Input.NativeMicPlugin = () => null; Input.MicWebSupported = () => true; Input.Mic.live = null; Global.Prefs.MicHoldToTalk = true;
    Input.Mic.press(); await new Promise(r => setTimeout(r, 800));
    Input.Mic.release(); await new Promise(r => setTimeout(r, 4500));   // forced commit; recognizer #1 still hung
    Input.Mic.press(); await new Promise(r => setTimeout(r, 4500));
    const overlap = window.__recs.filter(r => r.live).length;
    const res = { n: window.__recs.length, firstAborted: !!window.__recs[0].aborted, overlap, active: Input.Mic.active,
      diag: Input.Mic.diag.ring.slice(-8).map(e => e.type) };
    if (Input.Mic.active) Input.Mic.release();
    return res;
  }, abortEnds);
  const w1 = await web(true);
  ok(w1.n === 2 && w1.firstAborted && w1.overlap <= 1, 'web: the hung recognizer is aborted and only then a fresh one starts: ' + JSON.stringify(w1));
  await sleep(4500);
  const w2 = await web(false);
  ok(w2.n === 1 && w2.firstAborted && !w2.active && w2.diag.includes('prev-unresettable'), 'web: an unresettable session fails closed, never a second recognizer: ' + JSON.stringify(w2));

  out.forEach(l => console.log(l));
  const fail = out.filter(l => l.startsWith('FAIL')).length;
  console.log(`${out.length - fail} PASS / ${fail} FAIL`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
