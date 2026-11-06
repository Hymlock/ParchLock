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
    // D225 E2: isolated DOM fixtures use the real replacement/wrapping code.
    // Object vocabulary is fixed here; native first-mention checks follow.
    const transactions = await p.evaluate(() => {
        const host = document.createElement('section'); document.body.appendChild(host);
        const saved = { pool: Actionable.payloadPool, words: Actionable.nounWordsOf, marks: Actionable.LiveMarks, wrap: Actionable.wrapFirstExact };
        const results = [], add = (ok, name) => results.push({ ok, name });
        const book = '<span class="pl-act" data-object-id="144" data-candidate-ids="[144]" data-cover-ids="[144]">book</span>';
        const setup = html => { host.innerHTML = html; Actionable.LiveMarks = [...host.querySelectorAll('.pl-act')]; return [...host.querySelectorAll('.BufferLine')]; };
        const meta = () => ({ phrase: 'spell book', objectId: 144, kind: 'object', preferred: true });
        try {
            Actionable.payloadPool = () => [{ id: 144, name: 'spell book', aliases: ['spell', 'book'] }, { id: 59, name: 'blorb spell', aliases: ['blorb', 'spell'] }];
            Actionable.nounWordsOf = o => Object.fromEntries(o.aliases.map(w => [w, true]));
            let lines = setup('<div class="BufferLine"><span class="pl-act" data-candidate-ids="[144,59]" data-cover-ids="[59]">spell</span></div><div class="BufferLine">A spell ' + book + '.</div>');
            let other = Actionable.LiveMarks[0], shorter = Actionable.LiveMarks[1];
            let ok = Actionable.replaceMarkedPhrase(lines, meta(), { 144: true, 59: true });
            add(ok && other.isConnected && Actionable.LiveMarks.includes(other) && !shorter.isConnected
                && lines[1].querySelector('.pl-act')?.textContent === 'spell book', 'replacement preserves another-line candidate-only mark');
            lines = setup('<div class="BufferLine">' + book + ' elsewhere, a spell ' + book + '.</div>');
            other = Actionable.LiveMarks[0]; shorter = Actionable.LiveMarks[1];
            ok = Actionable.replaceMarkedPhrase(lines, meta(), { 144: true });
            add(ok && other.isConnected && !shorter.isConnected && lines[0].querySelectorAll('.pl-act').length === 2, 'replacement preserves the same text outside its span on the same line');
            for (const throws of [false, true]) {
                lines = setup('<div class="BufferLine">A spell ' + book + '.<button>keep</button></div>');
                const html = host.innerHTML, original = [...lines[0].childNodes], mark = Actionable.LiveMarks[0], marks = Actionable.LiveMarks;
                let events = 0; mark.addEventListener('transaction-identity', () => events++);
                Actionable.wrapFirstExact = () => { if (throws) throw new Error('intentional failed wrap'); return false; };
                ok = Actionable.replaceMarkedPhrase(lines, meta(), { 144: true });
                Actionable.wrapFirstExact = saved.wrap;
                mark.dispatchEvent(new Event('transaction-identity'));
                add(!ok && html === host.innerHTML && original.every((n, i) => lines[0].childNodes[i] === n)
                    && Actionable.LiveMarks === marks && mark.isConnected && events === 1, (throws ? 'throwing' : 'rejected') + ' replacement restores original DOM, nodes and listeners');
            }
            lines = setup('<div class="BufferLine">A spell <span class="pl-act" data-candidate-ids="[144,59]" data-cover-ids="[59]">book</span>.</div>');
            const html = host.innerHTML;
            add(!Actionable.replaceMarkedPhrase(lines, meta(), { 144: true }) && html === host.innerHTML, 'candidate membership alone cannot authorize replacement');
            lines = setup('<div class="BufferLine">A spell note' + book + '.</div>');
            const substring = host.innerHTML;
            add(!Actionable.replaceMarkedPhrase(lines, meta(), { 144: true }) && substring === host.innerHTML, 'substring without a full phrase cannot authorize replacement');
            lines = setup('<div class="BufferLine">A spell ' + book + '.</div>');
            const ownedHTML = host.innerHTML, ownedMark = Actionable.LiveMarks[0], ownedNodes = [...lines[0].childNodes];
            let events = 0; ownedMark.addEventListener('transaction-identity', () => events++);
            Actionable.payloadPool = () => [{ id: 999, name: 'spell book', aliases: ['spell', 'book'] }];
            ok = Actionable.replaceMarkedPhrase(lines, meta(), { 144: true });
            ownedMark.dispatchEvent(new Event('transaction-identity'));
            add(!ok && ownedHTML === host.innerHTML && ownedMark.isConnected && events === 1
                && ownedNodes.every((n, i) => lines[0].childNodes[i] === n), 'replacement that loses target ownership rolls back original nodes and listeners');
            lines = setup('<div class="BufferLine">A <span class="pl-act" data-object-id="144" data-candidate-ids="[144]" data-cover-ids="[144]">spell book</span>.</div>');
            const completeMark = Actionable.LiveMarks[0], completeHTML = host.innerHTML;
            add(!Actionable.replaceMarkedPhrase(lines, meta(), { 144: true }) && completeHTML === host.innerHTML
                && completeMark.isConnected, 'an already complete phrase retains the original mark identity');
            Actionable.payloadPool = saved.pool;
            // Fixed vocabulary again after the ownership-loss negative.
            Actionable.payloadPool = () => [{id:144,name:'spell book',aliases:['spell','book']}];
            lines=setup('<div class="BufferLine"><span class="Style_subheader">Spell Book</span></div><div class="BufferLine">A spell '+book+'.</div>');
            add(Actionable.replaceMarkedPhrase(lines,meta(),{144:true}) && lines[0].querySelectorAll('.pl-act').length===0
                && lines[1].querySelector('.pl-act').textContent==='spell book', 'excluded heading cannot block a safe prose phrase upgrade');
            const pool = [{id:55,name:'brass cage',aliases:['brass','cage']},{id:56,name:'iron cage',aliases:['iron','cage']},{id:57,name:'metal thing',aliases:['metal','thing']}];
            const unique = id => '<span class="pl-act" data-object-id="'+id+'" data-candidate-ids="['+id+']">cage</span>';
            const group = (ids, text='cage') => '<span class="pl-act" data-candidate-ids="'+JSON.stringify(ids)+'">'+text+'</span>';
            const exclusive = () => { const ids=Actionable.LiveMarks.flatMap(Actionable.markCoverIds); return new Set(ids).size===ids.length; };
            setup('<div class="BufferLine">'+unique(55)+group([55,56])+'</div>');
            const retained=Actionable.LiveMarks[0], ambiguous=Actionable.LiveMarks[1];
            Actionable.reconcileMarkCoverage(pool);
            add(exclusive() && ambiguous.dataset.coverIds==='["56"]' && ambiguous.dataset.candidateIds==='[55,56]' && retained.isConnected,
                'retained unique owner reserves coverage against fresh group; parser candidates survive');
            setup('<div class="BufferLine">'+unique(55)+unique(56)+group([55,56])+'</div>');
            Actionable.reconcileMarkCoverage(pool);
            add(exclusive() && Actionable.markCoverIds(Actionable.LiveMarks[2]).length===0 && Actionable.LiveMarks[2].dataset.candidateIds==='[55,56]',
                'group with all owners represented keeps explicit empty coverage and clickable candidates');
            const emptyGroup=Actionable.LiveMarks[2];
            Actionable.LiveMarks[0].remove(); Actionable.LiveMarks[1].remove();
            Actionable.reconcileMarkCoverage(pool);
            add(emptyGroup.isConnected && emptyGroup.dataset.coverIds==='["55","56"]' && emptyGroup.dataset.candidateIds==='[55,56]', 'empty group regains coverage when unique owners retire without losing candidates or node');
            setup('<div class="BufferLine">'+unique(55)+unique(55)+'</div>');
            Actionable.reconcileMarkCoverage(pool);
            add(exclusive() && Actionable.markCoverIds(Actionable.LiveMarks[1]).length===0, 'repeated unique owner has only one coverage slot');
            setup('<div class="BufferLine">'+unique(55)+group([55,56])+'</div>');
            Actionable.LiveMarks[0].classList.add('is-stale');
            Actionable.reconcileMarkCoverage(pool);
            add(Actionable.LiveMarks[1].dataset.coverIds==='["55","56"]', 'stale unique mark cannot reserve live group coverage');
            setup('<div class="BufferLine">'+unique(55)+group([55,56])+'</div>');
            Actionable.reconcileMarkCoverage(pool.filter(o=>o.id!==55));
            add(exclusive() && Actionable.markCoverIds(Actionable.LiveMarks[0]).length===0 && Actionable.LiveMarks[1].dataset.coverIds==='["56"]', 'out-of-scope unique owner cannot steal current coverage');
            for(const reverse of [false,true]) {
                const groups=[group([55,56]),group([56,57],'metal thing')];
                setup('<div class="BufferLine">'+(reverse?groups.reverse():groups).join(' ')+'</div>');
                Actionable.reconcileMarkCoverage(pool);
                add(exclusive() && new Set(Actionable.LiveMarks.flatMap(Actionable.markCoverIds)).size===3, 'overlapping ambiguous groups have exclusive union in DOM order '+reverse);
            }
        } finally {
            Actionable.payloadPool = saved.pool; Actionable.nounWordsOf = saved.words;
            Actionable.LiveMarks = saved.marks; Actionable.wrapFirstExact = saved.wrap; host.remove();
        }
        return results;
    });
    transactions.forEach(r => check(r.ok, r.name));
    for (const c of cmds) {
        await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(900); await toLine(); await p.waitForTimeout(600);
        const r = await p.evaluate(() => {
            const lines = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')];
            const replyIdx = []; let cur = -1;
            lines.forEach((l, i) => { if (l.querySelector('.Style_input')) cur = i; replyIdx.push(cur); });
            const skip = el => !!el.closest('.Input, .Style_input, .Style_subheader, a, .pl-stat-probe, .pl-carry-probe, [aria-hidden="true"]');
            const occ = (phrase) => {
                const out = []; const re = new RegExp('(^|[^A-Za-z0-9])' + phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])', 'gi');
                lines.forEach((l, i) => { if (skip(l) || l.querySelector('.Input, .Style_input') || l.offsetParent === null) return; const t = l.textContent; let m; while ((m = re.exec(t))) out.push({ line: i, pos: m.index + m[1].length, reply: replyIdx[i] }); });
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
            const coverage = [...document.querySelectorAll('.pl-act:not(.is-stale)')].filter(m=>m.dataset.kind!=='direction').flatMap(Actionable.markCoverIds);
            return { exclusive: new Set(coverage).size===coverage.length, marks: document.querySelectorAll('.pl-act:not(.is-stale)').length, bad };
        });
        check(r.exclusive, 'after '+JSON.stringify(c)+': no object has duplicate display coverage');
        check(r.bad.length === 0, 'after "' + c + '": ' + r.marks + ' underlines, each at the first mention of the newest reply naming it' + (r.bad.length ? ' ' + JSON.stringify(r.bad.slice(0, 5)) : ''));
    }
    await b.close(); console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
