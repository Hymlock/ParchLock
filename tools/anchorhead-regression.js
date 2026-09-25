const { chromium } = require('playwright');

const url = process.argv[2] || 'http://127.0.0.1:8765/play.html?story=games/anchor.z8.js';
const executablePath = process.env.PW_CHROME;

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function inspect(page, label) {
    const session = await page.context().newCDPSession(page);
    const expression = `
        JSON.stringify({
            label: ${JSON.stringify(label)},
            windowText: (document.querySelector('#windowport')?.innerText || '').slice(0, 500),
            windows: Array.from(document.querySelectorAll('#windowport .WindowFrame,.BufferWindow,.GridWindow,.Input.LineInput')).map(el => {
                const rect = el.getBoundingClientRect();
                const style = getComputedStyle(el);
                return {
                    id: el.id,
                    className: String(el.className),
                    text: (el.innerText || el.value || '').slice(0, 120),
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    display: style.display,
                    position: style.position
                };
            })
        })
    `;
    const result = await session.send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text);
    }
    return JSON.parse(result.result.value);
}

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    page.on('console', message => console.log(`${message.type()}: ${message.text()}`));
    page.on('pageerror', error => console.log(`pageerror: ${error.message}`));

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(5000);
    console.log(JSON.stringify(await inspect(page, 'initial'), null, 2));

    let afterPrompt = null;
    for (let step = 1; step <= 12; step++) {
        await page.keyboard.press('Space');
        await page.waitForTimeout(1500);
        afterPrompt = await inspect(page, `after-space-${step}`);
        console.log(JSON.stringify(afterPrompt, null, 2));
        if (afterPrompt.windows.some(win => win.className.includes('LineInput'))) {
            break;
        }
    }

    const buffer = afterPrompt.windows.find(win => win.className.includes('BufferWindow'));
    const input = afterPrompt.windows.find(win => win.className.includes('LineInput'));
    assert(buffer && buffer.width > 100 && buffer.height > 100, 'Buffer window is not visibly sized after Anchorhead startup screen.');
    assert(input && input.width > 20 && input.height > 10, 'Line input is not visibly sized after Anchorhead startup screen.');

    await page.keyboard.type('look');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    const afterLook = await inspect(page, 'after-look');
    console.log(JSON.stringify(afterLook, null, 2));
    assert(afterLook.windowText.includes('Outside the Real Estate Office'), 'Anchorhead did not accept input after startup screen.');

    await page.screenshot({ path: 'anchorhead-after-fix.png', fullPage: true });
    await browser.close();
})().catch(error => {
    console.error(error);
    process.exit(1);
});
