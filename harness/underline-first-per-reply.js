// Item 6 (operator rule, amends D214 U1, claude): within one reply an item is
// underlined at its FIRST mention; only a newer reply moves the underline, to
// that reply's first mention.
//   node harness/underline-first-per-reply.js [games/story.js] [cmd,cmd,...]
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const game = process.argv[2] || 'games/wump2ka.z5.js';
const cmds = (process.argv[3] || 'no,look,e,look,w,look,examine skeleton,look').split(',');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS: ' : 'FAIL: ') + msg); };
(async () => {
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + game); await p.waitForTimeout(2000);
    const toLine = async () => { for (let i = 0; i < 35; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
    await toLine();
    for (const c of cmds) {
        await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(900); await toLine(); await p.waitForTimeout(600);
        const r = await p.evaluate(() => {
            const lines = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')];
            const replyIdx = []; let cur = -1;
            lines.forEach((l, i) => { if (l.querySelector('.Style_input')) cur = i; replyIdx.push(cur); });
            const skip = el => !!el.closest('.Input, .Style_input, .Style_subheader, a, .pl-stat-probe, .pl-carry-probe, [aria-hidden="true"]');
            const occ = (phrase) => {
                const out = []; const re = new RegExp('(^|[^A-Za-z0-9])' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])', 'gi');
                lines.forEach((l, i) => { if (skip(l) || l.offsetParent === null) return; const t = l.textContent; let m; while ((m = re.exec(t))) out.push({ line: i, pos: m.index + m[1].length, reply: replyIdx[i] }); });
                return out;
            };
            const bad = [];
            for (const mark of document.querySelectorAll('.pl-act:not(.is-stale)')) {
                const line = mark.closest('.BufferLine'); const i = lines.indexOf(line); if (i < 0) continue;
                const pre = document.createRange(); pre.setStart(line, 0); pre.setEnd(mark, 0); const pos = pre.toString().length;
                const o = occ(mark.textContent); const reply = replyIdx[i];
                const earlierSame = o.filter(x => x.reply === reply && (x.line < i || (x.line === i && x.pos < pos)));
                const laterReply = o.filter(x => x.reply > reply);
                if (earlierSame.length || laterReply.length) bad.push({ phrase: mark.textContent, earlierSame: earlierSame.length, laterReply: laterReply.length });
            }
            return { marks: document.querySelectorAll('.pl-act:not(.is-stale)').length, bad };
        });
        check(r.bad.length === 0, 'after "' + c + '": ' + r.marks + ' underlines, each at the first mention of the newest reply naming it' + (r.bad.length ? ' ' + JSON.stringify(r.bad.slice(0, 5)) : ''));
    }
    await b.close(); console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
