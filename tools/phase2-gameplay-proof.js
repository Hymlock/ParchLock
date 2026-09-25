/**
 * Phase 2 D27 real-gameplay proof.
 * Reuses the existing Playwright + play.html + catalog-story pattern
 * from tools/alley-ram-actionable-regression.js.
 *
 * Captures:
 *   tools/screenshots/alley/phase2-marks.png
 *   tools/screenshots/alley/phase2-object-radial.png
 *   tools/screenshots/alley/phase2-input-radial.png
 *   tools/screenshots/alley/phase2-inventory.png
 *   tools/screenshots/alley/phase2-proof.json
 */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    fs.mkdirSync("tools/screenshots/alley", { recursive: true });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/anchor.z8.js");
    await page.waitForTimeout(1600);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 14 && !(await page.locator(".Input.LineInput").count()); i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(400);
    }
    await page.locator(".Input.LineInput").waitFor({ state: "visible" });
    const command = async (text) => {
      await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
      await page.waitForTimeout(900);
    };
    await command("look");
    await command("southeast");
    await command("look");
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      if (window.ZvmCapture) ZvmCapture.tick();
      if (window.WorldModel) WorldModel.tick();
      if (window.Actionable) Actionable.Refresh();
    });
    await page.waitForTimeout(500);

    const snapshot = await page.evaluate(() => {
      const p = WorldModel && WorldModel.lastPayload;
      const marks = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map((el) => ({
        noun: (el.dataset.noun || "").toLowerCase(),
        id: el.dataset.objectId || null,
        kind: el.dataset.kind || null,
        text: el.textContent
      }));
      const objs = ((p && p.discoveredObjects) || []).map((o) => ({
        id: o.id, name: o.name, parentId: o.parentId, attrs: o.attrs
      }));
      const inventory = ((p && p.inventory) || []).map((o) => ({
        id: o.id, name: o.name, parentId: o.parentId,
        worn: !!(o.attrs && (o.attrs.worn || o.attrs.isWorn)), attrs: o.attrs
      }));
      let playerChildren = [];
      try {
        if (window.ZRamProvider && ZRamProvider.getMem && window.ZRamReader && p && p.probe && p.probe.playerId) {
          const mem = ZRamProvider.getMem();
          playerChildren = ZRamReader.children(mem, p.probe.playerId).map((cid) => ({
            id: cid, name: ZRamReader.shortName(mem, cid)
          }));
        }
      } catch (eCh) {}
      const invButtons = Array.from(document.querySelectorAll("#inventory-items button")).map((el) => ({
        text: el.textContent, id: el.getAttribute("data-object-id")
      }));
      const idBacked = marks.filter((m) => m.kind !== "direction");
      const unmatched = idBacked.filter((m) => !objs.concat(inventory).some((o) => String(o.id) === String(m.id)));
      return {
        room: ParchLockMap.CurrentRoom,
        roomName: (p && p.roomName) || "",
        probe: p && p.probe,
        engineMode: p && p.engineMode,
        exits: ((p && p.exits) || []).map((e) => e.label),
        specialCommands: p && p.specialCommands,
        objs,
        inventory,
        marks,
        invButtons,
        unmatched,
        playerChildren,
        zvm: !!(window.__PARCHLOCK_ZVM__)
      };
    });

    fs.writeFileSync("tools/screenshots/alley/phase2-proof.json", JSON.stringify(snapshot, null, 2));
    await page.screenshot({ path: "tools/screenshots/alley/phase2-marks.png", fullPage: true });

    assert.ok(snapshot.zvm, "ZVM instance was not captured");
    assert.equal(snapshot.probe && snapshot.probe.status, "z-ram-live", "Expected z-ram-live");
    assert.ok(/alley/i.test(String(snapshot.room || snapshot.roomName)) || (snapshot.probe && snapshot.probe.roomId === 107), "Expected Alley");
    const objectMarks = snapshot.marks.filter((m) => m.kind !== "direction" && m.id);
    assert.ok(objectMarks.length > 0, "No RAM-backed .pl-act marks: " + JSON.stringify(snapshot.marks));
    assert.equal(snapshot.unmatched.length, 0, "Marks with ids not in payload: " + JSON.stringify(snapshot.unmatched));

    const windowObj = snapshot.objs.find((o) => /window/i.test(o.name || ""));
    assert.ok(windowObj, "No window object in discoveredObjects");
    const windowMark = snapshot.marks.find((m) => String(m.id) === String(windowObj.id) || /window/i.test(m.noun));
    assert.ok(windowMark && windowMark.id, "Window mark missing data-object-id");
    assert.equal(String(windowMark.id), String(windowObj.id), "Window mark id must match payload");

    const box = await page.evaluate((id) => {
      const el = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).find((n) => n.dataset.objectId === String(id));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, windowObj.id);
    assert.ok(box, "Could not locate window mark for right-click");
    await page.mouse.click(box.x, box.y, { button: "right" });
    await page.waitForTimeout(400);
    assert.ok(await page.locator("#radial-menu").isVisible(), "Object radial did not open");
    const objectRadial = await page.evaluate((objectId) => {
      const labels = Array.from(document.querySelectorAll("#radial-menu .radial-command")).map((el) => el.textContent.trim());
      const synth = ActionSynth.commandsForPayloadObjectId(objectId, "room").map((c) => {
        const v = String(c.verb || "examine");
        return v.charAt(0).toUpperCase() + v.slice(1);
      });
      return { labels, synth };
    }, windowObj.id);
    await page.screenshot({ path: "tools/screenshots/alley/phase2-object-radial.png" });
    objectRadial.synth.forEach((lab) => {
      assert.ok(objectRadial.labels.indexOf(lab) >= 0, "Radial missing ActionSynth verb " + lab + " got " + JSON.stringify(objectRadial.labels));
    });
    assert.ok(objectRadial.labels.indexOf("Examine") >= 0, "Radial missing Examine");
    if (windowObj.attrs && windowObj.attrs.openable) {
      assert.ok(objectRadial.labels.indexOf("Open") >= 0, "Openable window radial missing OPEN");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    const wearable = snapshot.objs.concat(snapshot.inventory).find((o) => o.attrs && (o.attrs.wearable || o.attrs.clothing));
    const lockable = snapshot.objs.concat(snapshot.inventory).find((o) => o.attrs && (o.attrs.lockable || o.attrs.openable));
    const extra = {};
    if (wearable) {
      extra.wearable = { name: wearable.name, id: wearable.id, verbs: await page.evaluate((id) => {
        return ActionSynth.commandsForPayloadObjectId(id, "room").map((c) => c.verb);
      }, wearable.id) };
      assert.ok(extra.wearable.verbs.indexOf("wear") >= 0 || extra.wearable.verbs.indexOf("remove") >= 0, "Wearable missing WEAR/REMOVE");
    }
    if (lockable) {
      extra.lockable = { name: lockable.name, id: lockable.id, verbs: await page.evaluate((id) => {
        return ActionSynth.commandsForPayloadObjectId(id, "room").map((c) => c.verb);
      }, lockable.id) };
      if (lockable.attrs.openable) assert.ok(extra.lockable.verbs.indexOf("open") >= 0, "Openable missing OPEN");
      if (lockable.attrs.lockable) assert.ok(extra.lockable.verbs.indexOf("unlock") >= 0, "Lockable missing UNLOCK");
    }

    const inputBox = await page.locator(".Input.LineInput").boundingBox();
    assert.ok(inputBox, "No line input for radial");
    await page.mouse.click(inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, { button: "right" });
    await page.waitForTimeout(400);
    assert.ok(await page.locator("#radial-menu").isVisible(), "Input radial did not open");
    const inputRadial = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("#radial-menu .radial-command")).map((el) => ({
        label: el.textContent.trim(), command: el.getAttribute("title")
      }));
    });
    await page.screenshot({ path: "tools/screenshots/alley/phase2-input-radial.png" });
    const inputLabels = inputRadial.map((x) => x.label);
    ["Undo", "Save", "Restore", "Map", "History", "Transcript"].forEach((lab) => {
      assert.ok(inputLabels.indexOf(lab) >= 0, "Input radial missing chrome " + lab + " got " + JSON.stringify(inputLabels));
    });
    ["Look", "Inventory", "Wait"].forEach((lab) => {
      assert.ok(inputLabels.indexOf(lab) >= 0 || inputLabels.some((x) => x.toLowerCase() === lab.toLowerCase()), "Input radial missing universal " + lab + " got " + JSON.stringify(inputLabels));
    });
    assert.ok(inputLabels.indexOf("n") < 0 && inputLabels.indexOf("s") < 0 && inputLabels.indexOf("North") < 0, "Input radial must not inject compass n/s: " + JSON.stringify(inputLabels));
    await page.keyboard.press("Escape");

    await command("inventory");
    await page.evaluate(() => Actionable.ShowInventory());
    await page.waitForTimeout(400);
    const invUi = await page.evaluate(() => {
      const p = WorldModel.lastPayload;
      return {
        buttons: Array.from(document.querySelectorAll("#inventory-items button")).map((el) => ({
          text: el.textContent, id: el.getAttribute("data-object-id")
        })),
        payload: ((p && p.inventory) || []).map((o) => ({ id: o.id, name: o.name }))
      };
    });
    await page.screenshot({ path: "tools/screenshots/alley/phase2-inventory.png" });
    assert.ok(Array.isArray(invUi.payload), "payload.inventory missing after inventory command");
    const wornInScope = snapshot.objs.concat(snapshot.inventory).filter((o) => o.attrs && (o.attrs.worn || o.attrs.isWorn));
    if (wornInScope.length) {
      assert.ok(invUi.payload.length > 0, "Worn RAM objects exist but payload.inventory is empty: " + JSON.stringify(wornInScope.map((o) => o.name)));
    }
    if (invUi.payload.length) {
      assert.ok(invUi.buttons.length > 0, "Inventory panel empty despite payload.inventory");
      invUi.buttons.forEach((b) => {
        assert.ok(b.id, "Inventory button missing data-object-id");
        assert.ok(invUi.payload.some((o) => String(o.id) === String(b.id)), "Inventory button id not in payload: " + JSON.stringify(b));
      });
    } else if ((snapshot.playerChildren || []).length) {
      assert.fail("RenderInventory empty while ZRamReader.children(player) is " + JSON.stringify(snapshot.playerChildren));
    }

    snapshot.objectRadial = objectRadial;
    snapshot.inputRadial = inputRadial;
    snapshot.extra = extra;
    snapshot.invUi = invUi;
    fs.writeFileSync("tools/screenshots/alley/phase2-proof.json", JSON.stringify(snapshot, null, 2));
    console.log("PASS: Phase 2 real-gameplay marks/radial/inventory proof");
    console.log(JSON.stringify({
      room: snapshot.room,
      marks: snapshot.marks.slice(0, 12),
      objectRadial: objectRadial.labels,
      inputRadial: inputLabels,
      invButtons: invUi.buttons,
      extra
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
