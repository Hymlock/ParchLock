/**
 * D107: parser-owned command nouns remain separate from visible object names.
 * Exercises the operator's exact Huge Cave shovel through the real underline
 * click/radial paths, plus pure scope-change and fallback contracts.
 * Usage: node harness/d107-compound-noun.js
 */
const { chromium } = require("playwright");
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0, fail = 0;
const ok = (condition, message) => {
    if (condition) { pass++; console.log("PASS:", message); }
    else { fail++; console.error("FAIL:", message); }
};

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error && error.message).slice(0, 180)));
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto(pathToFileURL(path.resolve(__dirname, "..", "play.html")).href
        + "?story=games/HugeCave.z8.js&t=" + Date.now(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelector(".parchlock-splash__start")?.click());
    await page.waitForTimeout(3000);
    await page.keyboard.press("Space");
    await page.waitForTimeout(1400);
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });

    const submit = async (command) => {
        const accepted = await page.evaluate((text) => {
            Input.Clear();
            return Actionable.Submit(text);
        }, command);
        await page.waitForTimeout(1400);
        return accepted;
    };

    ok(await submit("no"), "restore question accepts no");
    ok(await submit("east"), "east command accepted");
    ok(await submit("north"), "north command accepted");

    const state = await page.evaluate(() => {
        const obj = Actionable.payloadPool().find((item) => item && item.name === "long-handled shovel");
        const mark = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)"))
            .find((element) => obj && element.dataset.objectId === String(obj.id));
        return {
            room: WorldModel.lastPayload && WorldModel.lastPayload.roomName,
            object: obj && {
                id: obj.id,
                name: obj.name,
                aliases: obj.aliases,
                commandNoun: Actionable.commandNounFor(obj)
            },
            mark: mark && { text: mark.textContent, noun: mark.dataset.noun }
        };
    });
    ok(state.room === "Tool Room", "real play reaches Tool Room");
    ok(state.object && state.object.commandNoun === "shovel",
        "long-handled shovel resolves to parser-owned base noun shovel");
    ok(state.mark && state.mark.text === "long-handled shovel",
        "visible underline keeps the complete printed object name");

    const radialCommand = await page.evaluate(() => {
        const mark = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)"))
            .find((element) => element.textContent === "long-handled shovel");
        if (!mark) return null;
        mark.dispatchEvent(new MouseEvent("contextmenu", {
            bubbles: true, cancelable: true, clientX: 500, clientY: 400, button: 2
        }));
        const examine = Array.from(document.querySelectorAll("#radial-menu .radial-command"))
            .find((button) => /^examine$/i.test(button.textContent.trim()));
        return examine && examine.getAttribute("title");
    });
    ok(radialCommand === "examine shovel", "radial generates examine shovel");
    await page.evaluate(() => ParchLockQol.HideRadialMenu());

    const before = await page.locator("#windowport .BufferWindow").innerText();
    const clicked = await page.evaluate(() => {
        const mark = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)"))
            .find((element) => element.textContent === "long-handled shovel");
        if (!mark) return false;
        mark.click();
        return true;
    });
    await page.waitForTimeout(1600);
    const after = await page.locator("#windowport .BufferWindow").innerText();
    const delta = after.length > before.length ? after.slice(before.length) : after;
    const submitted = await page.evaluate(() => $(".Style_input").last().text().trim().toLowerCase());
    ok(clicked, "real highlighted shovel was clicked");
    ok(submitted === "examine shovel", "left click submits examine shovel");
    ok(/steel blade and a long handle/i.test(delta), "Huge Cave accepts the command and prints the shovel description");
    ok(!/there is no\b[^.]*here/i.test(delta), "response is not a parser rejection");

    const contracts = await page.evaluate(() => {
        const brass = { id: 901, name: "brass key", aliases: ["key", "brass"] };
        const iron = { id: 902, name: "iron key", aliases: ["key", "iron"] };
        const duplicateRecord = { id: 901, name: "brass key", aliases: ["key", "brass"] };
        const single = Actionable.commandNounsForPool([brass]);
        const shared = Actionable.commandNounsForPool([brass, iron]);
        const deduped = Actionable.commandNounsForPool([brass, duplicateRecord]);
        const shortWord = Actionable.commandNounsForPool([{ id: 903, name: "At Y2", aliases: ["y2"] }]);
        Actionable.CommandNouns = Actionable.commandNounsForPool([{ id: 904, name: "legacy object", aliases: [] }]);
        delete Actionable.VerifiedNouns["904"];
        return {
            single: single["901"],
            sharedBrass: shared["901"],
            sharedIron: shared["902"],
            duplicateRecord: deduped["901"],
            shortWord: shortWord["903"],
            emptyAliasFallback: Actionable.commandNounFor({ id: 904, name: "legacy object", aliases: [] })
        };
    });
    ok(contracts.single === "key", "single key uses its parser-owned base noun");
    ok(contracts.sharedBrass === "brass" && contracts.sharedIron === "iron",
        "scope change recomputes both keys to unique parser aliases");
    ok(contracts.duplicateRecord === "key", "duplicate payload records count as one object id");
    ok(contracts.shortWord === "y2", "legitimate short parser words are retained");
    ok(contracts.emptyAliasFallback === "legacy object", "empty-alias/non-Inform payload preserves legacy name fallback");
    ok(errors.length === 0, "no page errors (" + JSON.stringify(errors.slice(0, 3)) + ")");

    await browser.close();
    console.log(JSON.stringify({ ok: fail === 0, pass, fail }));
    console.log((fail ? "FAIL" : "PASS") + ": d107-compound-noun (" + pass + " passed, " + fail + " failed)");
    process.exit(fail ? 1 : 0);
})().catch((error) => { console.error(error); process.exit(2); });
