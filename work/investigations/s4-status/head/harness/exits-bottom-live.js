// D215: real rendered geometry, not a source-text offset assertion.
const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");
module.exports = async function () {
    const browser = await chromium.launch();
    let passed = 0;
    function check(value, label) { if (!value) throw new Error(label); passed++; }
    try {
        for (const width of [320, 390, 412]) {
            const page = await browser.newPage({ viewport: { width, height: 844 } });
            await page.addInitScript(() => {
                sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
                for (const k of ["PL_TutorialSeen", "PL_MobileTutorialSeen", "PL_LearnedWordsTutorialSeen", "PL_TutorialLibrarySeen"]) localStorage.setItem(k, "1");
            });
            await page.goto(pathToFileURL(path.resolve(__dirname, "../play.html")).href + "?story=games/anchor.z8.js");
            await page.waitForTimeout(3000);
            await page.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
            for (let i = 0; i < 16 && !await page.locator(".Input.LineInput").count(); i++) { await page.keyboard.press("Space"); await page.waitForTimeout(200); }
            await page.waitForSelector(".Input.LineInput");
            await page.waitForTimeout(600);
            const geometry = () => {
                const rect = e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
                const shown = e => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden";
                const labels = [...document.querySelectorAll("#exits .row.horizontal.bottom .exit.shown .room-name, #exits .row.horizontal.bottom .exit.shown .dir-name")].filter(shown).map(rect);
                const controls = [".Input.LineInput", "#pl-input-mic", "#pl-input-submit", "#pl-dirpad-handle"].map(s => document.querySelector(s)).filter(Boolean).map(rect);
                const buffer = document.querySelector(".BufferWindow"), br = rect(buffer);
                const textBottom = br.bottom - parseFloat(getComputedStyle(buffer).paddingBottom);
                const v = getComputedStyle(document.documentElement);
                return { labels, controls, textBottom, band: parseFloat(v.getPropertyValue("--pl-bottom-band-h")), reserve: parseFloat(v.getPropertyValue("--pl-bottom-exit-reserve")), row: rect(document.querySelector("#exits .row.horizontal.bottom")), sheet: rect(document.getElementById("equipment")) };
            };
            let g = await page.evaluate(geometry);
            console.log(width, JSON.stringify(g));
            check(g.band > 0 && g.labels.length > 0, width + " real bottom exits measured");
            check(g.labels.every(r => r.left >= width * 2 / 3 - 1), width + " southeast retains its spatial sector");
            for (const label of g.labels) {
                check(label.top >= g.textBottom + 7, width + " label clears text bottom");
                for (const control of g.controls) check(!(label.left < control.right && label.right > control.left && label.top < control.bottom && label.bottom > control.top), width + " label clears fixed controls");
            }
            const original = await page.evaluate(() => [...document.querySelectorAll("#exits .row.horizontal.bottom .exit")].map(e => ({ className: e.className, name: e.querySelector(".room-name").textContent })));
            for (const count of [1, 2, 3]) {
                await page.evaluate(count => [...document.querySelectorAll("#exits .row.horizontal.bottom .exit")].forEach((e, i) => {
                    e.classList.toggle("shown", i < count);
                    e.querySelector(".room-name").textContent = i === 0 ? "A very long destination with several words" : "Other destination";
                }), count);
                await page.waitForTimeout(100);
                check(await page.evaluate(() => [...document.querySelectorAll("#exits .row.horizontal.bottom .exit.shown")].every(e => {
                    const sector = ["dir-sw", "dir-s", "dir-se"].findIndex(c => e.classList.contains(c));
                    const r = e.getBoundingClientRect();
                    return r.left >= innerWidth * sector / 3 - 1 && r.right <= innerWidth * (sector + 1) / 3 + 1 && e.scrollWidth <= e.clientWidth + 1;
                })), width + " " + count + " exits retain sectors and wrap within them");
            }
            await page.evaluate(original => [...document.querySelectorAll("#exits .row.horizontal.bottom .exit")].forEach((e, i) => { e.className = original[i].className; e.querySelector(".room-name").textContent = original[i].name; }), original);
            await page.waitForTimeout(100);
            await page.evaluate(() => EquipmentUI.Show());
            await page.waitForTimeout(1200);
            await page.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
            g = await page.evaluate(geometry);
            check(g.band === 0 && g.reserve === 0 && g.labels.length === 0, width + " equipment hides band under existing overlay ownership");
            check(Math.abs(g.sheet.bottom - 756) <= 1, width + " equipment retains accepted protector edge");
            await page.evaluate(() => EquipmentUI.Hide());
            const alley = page.locator("#exits .row.horizontal.bottom .exit.shown .room-name").first();
            await alley.click();
            await page.waitForTimeout(900);
            check(await page.locator(".GridLine").first().innerText().then(t => /Alley/.test(t)), width + " bottom-label tap travels");
            await page.evaluate(() => document.querySelectorAll("#exits .row.horizontal.bottom .exit").forEach(e => e.classList.remove("shown")));
            await page.waitForTimeout(250);
            g = await page.evaluate(geometry);
            check(g.band === 0 && g.reserve === 0, width + " empty band collapses");
            const handle = await page.locator("#pl-dirpad-handle").boundingBox();
            check(g.textBottom <= handle.y - 7, width + " empty-band text clears handle");
            await page.close();
        }
        console.log("D215 bottom geometry: " + passed + " PASS");
    } finally { await browser.close(); }
};
