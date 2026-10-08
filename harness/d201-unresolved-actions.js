/**
 * D201 unresolved-object action contract.
 * Parser vocabulary may recover an addressable noun, but verbs require
 * compiler-declared attributes or confirmed per-object behavioral evidence.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let pass = 0;
function check(value, message) {
    if (!value) throw new Error("FAIL: " + message);
    pass++;
    console.log("PASS: " + message);
}

const context = { console };
vm.createContext(context);
for (const file of ["js/ActionSynth.js", "js/Actionable.js"]) {
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), context, { filename: file });
}

const S = context.ActionSynth;
const A = context.Actionable;
let learned = [];
context.AttrCalibrator = {
    defaultInspectVerb: () => "examine",
    inspectVerbCurrentlyDisabled: () => false,
    allowedVerbsFor: () => learned.slice()
};
A.commandNounFor = obj => obj.name;
A.disambiguatedNoun = obj => obj.name;
A.isGameWord = word => word === "drink";

let obj = { id: 7, name: "pellets", attrs: {} };
let commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(JSON.stringify(commands) === JSON.stringify(["examine pellets"]),
    "parser vocabulary alone grants only the established inspect command");

obj.attrs = { takeable: true, edible: true };
commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(commands.includes("take pellets") && commands.includes("eat pellets"),
    "module-declared item capabilities reach the unresolved-object radial");
check(!commands.includes("drink pellets"),
    "dictionary membership alone does not add DRINK to an unresolved object");
check(S.commandsForObject(obj, "room").some(c => c.command === "drink pellets"),
    "ordinary catalogued-object synthesis remains unchanged");

obj = { id: 8, name: "bar", attrs: { switchable: true } };
commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(commands.includes("switch on bar") && commands.includes("switch off bar"),
    "declared switch state exposes both established state commands");

obj = { id: 9, name: "hatch", attrs: {} };
learned = ["open", "close"];
commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(commands.includes("open hatch") && commands.includes("close hatch"),
    "confirmed per-object learned capabilities remain available");

learned = [];
A.payloadPool = () => [{ id: 8, name: "bar", attrs: { switchable: true }, examineOnly: true }];
commands = A.resolveObjectCommands(8, "room").map(c => c.command);
check(commands.includes("switch on bar") && commands.includes("switch off bar"),
    "Actionable routes only promoted candidates through evidence-only synthesis");

context.window = {};
context.ParchLockMap = { Rooms: [] };
const candidates = [{ id: 41, aliases: ["the", "sword", "gladius"] },
    { id: 42, aliases: ["view", "of", "the", "mountains"] }];
const payload = { playerId: 55, roomId: 54, unnamedCandidates: candidates };
check(A.promoteUnnamed(payload, "of the").length === 0,
    "particles alone cannot promote any unnamed candidate");
let recovered = A.promoteUnnamed(payload, "view of the GLADIUS SWORD");
check(recovered.find(o => o.id === 41).name === "gladius sword",
    "real printed sword vocabulary still recovers its full label");
check(recovered.find(o => o.id === 42).name === "view",
    "particle-ended view of the cannot become a recovered label");
check(recovered.every(o => !/^(?:a|an|the|of|and|or|to)$/.test(o.name)),
    "every promoted object has a non-particle trigger");
check(A.observedPhraseFor({ id: 43, name: "the Order", aliases: ["the", "order"] },
    [{ id: 43, aliases: ["the", "order"] }], "the Order", false) === "the order",
    "named structural proper names retain their article");
check(A.promoteUnnamed({ unnamedCandidates: [{ id: 44, aliases: ["food", "pellets"] }] },
    "two food pellets")[0].name === "food pellets",
    "unnamed food pellets retain their observed label");
check(A.observedPhraseFor(recovered.find(o => o.id === 42), candidates,
    "view of the", false) === "view", "recovered provenance survives subsequent label resolution");

console.log(`${pass} PASS / 0 FAIL`);

const readerContext = {};
vm.createContext(readerContext);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/ZRamReader.js"), "utf8"), readerContext);
const R = readerContext.ZRamReader;
R.children = (_mem, id) => ({ 1: [2, 3], 2: [4] }[id] || []);
R.shortName = (_mem, id) => id === 3 ? "ordinary item" : "";
R.attrsFromObject = (_mem, id) => ({ animate: id === 2 });
R.parserWordsAny = (_mem, id) => id === 2 ? ["actor"] : ["item"];
R.canSeeInside = () => false;
const scoped = R.scopeObjects({}, 1);
check(scoped.unnamedCandidates.some(o => o.id === 2), "unnamed actor owns a scope-backed candidate");
check(!scoped.some(o => o.id === 4) && !scoped.unnamedCandidates.some(o => o.id === 4),
    "unnamed actor contents never tunnel into scope");
check(scoped.some(o => o.id === 3), "ordinary named room children are unchanged");
context.ZRamProvider = { getMem: () => ({}) };
context.AttrCalibrator.confirmedInventoryRootId = () => 41;
check(!A.promoteUnnamed(payload, "gladius sword").some(o => o.id === 41),
    "confirmed carried root cannot be promoted as an actor");
context.AttrCalibrator.confirmedInventoryRootId = () => null;
check(!A.promoteUnnamed({ playerId: 41, unnamedCandidates: candidates }, "gladius sword").some(o => o.id === 41),
    "resolved player remains excluded independently of calibration");
console.log(`${pass} focused PASS / 0 FAIL`);

learned = [];
check(!S.commandsForEvidenceObject({ id: 98, name: "person", attrs: { animate: true, takeable: true } }, "room")
    .some(c => c.verb === "take"), "derived takeable cannot grant Take on a room actor");
learned = ["take"];
check(S.commandsForEvidenceObject({ id: 98, name: "creature", attrs: { animate: true, takeable: true } }, "room")
    .some(c => c.verb === "take"), "confirmed collectible creature retains its own Take capability");
learned = [];
check(S.commandsForEvidenceObject({ id: 99, name: "item", attrs: { takeable: true } }, "room")
    .some(c => c.verb === "take"), "ordinary takeable items retain Take");
console.log(`${pass} focused PASS / 0 FAIL`);

vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/SemanticActions.js"), "utf8"), context);
const currentPayload = { playerId: 55, discoveredObjects: [], inventory: [] };
context.WorldModel = { lastPayload: currentPayload };
const recoveredPool = [{ id: 196, name: "sly", attrs: { animate: true } }, { id: 56, name: "sword", attrs: {} }];
A.payloadPool = () => recoveredPool;
A.referenceFor = o => ({ unique: true, noun: o.name });
check(context.SemanticActions.resolveAskAboutFormsForObject(196).some(f => f.command === "ask sly about sword"),
    "current semantic topics include the recovered actor and real scoped item");
check(context.SemanticActions.resolveAskAboutFormsForObject(196, { discoveredObjects: [], inventory: [] }).length === 0,
    "an explicit older snapshot cannot borrow the current recovered actor");
console.log(`${pass} focused PASS / 0 FAIL`);

if (process.argv.includes("--live")) (async function () {
    const { chromium } = require("playwright");
    const { pathToFileURL } = require("url");
    const browser = await chromium.launch({ headless: true });
    try {
        for (const width of [1280, 360]) {
            const page = await browser.newPage({ viewport: { width, height: 850 }, hasTouch: width < 600, isMobile: width < 600 });
            await page.addInitScript(() => {
                sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
                for (const k of ["PL_TutorialSeen", "PL_MobileTutorialSeen", "PL_LearnedWordsTutorialSeen"])
                    localStorage.setItem(k, "1");
            });
            await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/TreasuresofaSlaversKingdom.z8.js");
            await page.waitForTimeout(2500);
            for (let i = 0; i < 8 && await page.locator(".Input.CharInput").count(); i++) {
                await page.locator(".Input.CharInput").focus();
                await page.keyboard.press("Space");
                await page.waitForTimeout(450);
            }
            check(await page.locator('.pl-act[data-object-id="56"]').count() > 0,
                "actual startup GLADIUS SWORD marked " + width);
            if (await page.evaluate(() => Message.IsOpen)) await page.locator('#message #close').click();
            const swordMark = page.locator('.pl-act[data-object-id="56"]').last();
            if (width < 600) {
                await swordMark.scrollIntoViewIfNeeded();
                const box = await swordMark.boundingBox(), cdp = await page.context().newCDPSession(page);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
                await page.waitForTimeout(650);
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await cdp.detach();
            } else await swordMark.click({ button: "right" });
            const inspect = page.locator('#radial-menu .radial-command').filter({ hasText: /^Examine$/i });
            check(await inspect.isVisible(), "real sword radial offers inspect " + width);
            await inspect.click();
            await page.waitForTimeout(700);
            const inspected = await page.locator('#windowport').innerText();
            check(/examine (?:gladius|sword)/i.test(inspected) && !/I only understood|don't know the word/i.test(inspected),
                "sword radial submits actual parser vocabulary " + width);
            for (const command of ["take sword", "east", "north", "north", "down", "take blue banner"]) {
                await page.locator(".Input.LineInput").fill(command);
                await page.locator(".Input.LineInput").press("Enter");
                await page.waitForTimeout(700);
                const state = await page.evaluate(() => ({
                    room: WorldModel.lastPayload.roomId,
                    labels: Actionable.payloadPool().filter(o => o.examineOnly).map(o => o.name),
                    marks: Array.from(document.querySelectorAll(".pl-act:not(.is-stale)"), e => e.textContent)
                }));
                check(state.labels.every(n => !/^(?:a|an|the|of|and|or|to)\b|\b(?:a|an|the|of|and|or|to)$/i.test(n)),
                    "all recovered labels have substantive edges after " + command + " " + width);
                check(!state.marks.some(n => /^(?:the|of the|view of the)$/i.test(n)),
                    "no particle marks after " + command + " " + width);
                if (command === "take blue banner") check(state.room === 186,
                    "real encounter reached through accepted moves " + width);
            }
            if (process.argv.includes("--actors")) {
                const actor = await page.evaluate(() => {
                    const m = ZRamProvider.getMem(), o = Actionable.payloadPool().find(o => o.id === 196);
                    return { room: WorldModel.lastPayload.roomId, parent: ZRamReader.objectLinks(m, 196).parent,
                        children: ZRamReader.children(m, 196), row: o && { name: o.name, attrs: o.attrs },
                        marks: Array.from(document.querySelectorAll('.pl-act[data-object-id="196"]'), e => e.textContent) };
                });
                check(actor.room === 186 && actor.parent === 186 && actor.row && actor.row.attrs.animate,
                    "real unnamed actor recovered from room containment " + width);
                check(actor.marks.some(n => /darth/i.test(n)), "Von Darth is underlined " + width);
                check(actor.children.length === 0 && !await page.locator('.pl-act').filter({ hasText: /^MACHETE$/ }).count(),
                    "description-only machete is not invented " + width);
                const mark = page.locator('.pl-act[data-object-id="196"]').last();
                await mark.scrollIntoViewIfNeeded();
                if (width < 600) {
                    const box = await mark.boundingBox(), cdp = await page.context().newCDPSession(page);
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
                    await page.waitForTimeout(650);
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                    await cdp.detach();
                } else await mark.click({ button: "right" });
                const inspectActor = page.locator('#radial-menu .radial-command').filter({ hasText: /^Examine$/i });
                check(await inspectActor.isVisible(), "actual actor gesture opens inspect action " + width);
                if (process.argv.includes("--actor-take")) check(!await page.locator('#radial-menu .radial-command').filter({ hasText: /^Take$/i }).count(),
                    "actual actor menu excludes derived Take " + width);
                await inspectActor.click();
                await page.waitForTimeout(700);
                const text = await page.locator('#windowport').innerText();
                const reply = text.slice(text.lastIndexOf(">examine "));
                check(/^>examine (?:sly|darth|von darth the sly)\s/i.test(reply) && /VON DARTH THE SLY is a short, mutated human/.test(reply),
                    "actor inspect submitted and story accepted " + width);
            }
            await page.close();
        }
        console.log("Live checks complete: " + pass + " total PASS / 0 FAIL");
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
