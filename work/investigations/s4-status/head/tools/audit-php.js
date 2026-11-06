const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

async function main() {
    const php = process.env.PHP_BIN || 'php';
    const root = path.resolve(__dirname, '..');
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'parchmap-php-test-'));
    let server;
    try {
        fs.copyFileSync(path.join(root, 'upload.php'), path.join(temp, 'upload.php'));
        fs.copyFileSync(path.join(root, 'log.php'), path.join(temp, 'log.php'));
        fs.mkdirSync(path.join(temp, 'user'));
        const socket = net.createServer();
        socket.listen(0, '127.0.0.1');
        await once(socket, 'listening');
        const port = socket.address().port;
        await new Promise(resolve => socket.close(resolve));
        server = spawn(php, ['-n', '-d', 'post_max_size=96M', '-S', '127.0.0.1:' + port, '-t', temp], { windowsHide: true, stdio: 'ignore' });
        await once(server, 'spawn');
        const base = 'http://127.0.0.1:' + port;
        for (let i = 0; i < 60; i++) {
            try { await fetch(base + '/upload.php'); break; }
            catch (_) { await new Promise(resolve => setTimeout(resolve, 100)); }
        }
        const post = (endpoint, data) => fetch(base + endpoint, { method: 'POST', body: new URLSearchParams(data) });
        assert.equal((await fetch(base + '/upload.php')).status, 405);
        assert.equal((await post('/upload.php', { filename: '../attack', extension: 'z5', data: 'alert(1)' })).status, 400);
        assert.equal((await post('/upload.php', { 'filename[]': 'array', extension: 'z5', data: 'x' })).status, 400);
        const game = fs.readFileSync(path.join(root, 'games/anchor.z8.js'), 'utf8');
        const encoded = /processBase64Zcode\(['"]([A-Za-z0-9+/=]+)['"]\)/.exec(game)[1];
        const wrapper = "processBase64Zcode('" + encoded + "')";
        assert.equal((await post('/upload.php', { filename: 'wrong', extension: 'z3', data: wrapper })).status, 400);
        assert.equal((await post('/upload.php', { filename: 'suffix', extension: 'z8', data: wrapper + ';alert(1)' })).status, 400);
        const uploaded = await post('/upload.php', { filename: '../../outside', extension: 'z8', data: wrapper });
        assert.equal(uploaded.status, 200);
        const name = await uploaded.text();
        assert.match(name, /^[a-f0-9]{32}\.z8\.js$/);
        assert.equal(fs.readFileSync(path.join(temp, 'user', name), 'utf8'), wrapper);
        assert.equal((await post('/log.php', { text: 'x'.repeat(8193) })).status, 413);
        assert.equal((await post('/log.php', { text: 'one\ntwo' })).status, 204);
        const log = fs.readFileSync(path.join(temp, 'events.log'), 'utf8');
        assert.equal(log.trim().split('\n').length, 1);
        assert.equal(JSON.parse(log).text, 'one\ntwo');
        fs.truncateSync(path.join(temp, 'events.log'), 10 * 1024 * 1024);
        assert.equal((await post('/log.php', { text: 'full' })).status, 507);
        console.log('PASS: PHP upload validates real story, rejects code/arrays/mismatch, ignores traversal filename; logging bounds and escaping');
    } finally {
        if (server && server.exitCode === null) {
            const stopped = once(server, 'exit');
            server.kill();
            await stopped;
        }
        if (path.dirname(temp) === path.resolve(os.tmpdir()) && path.basename(temp).startsWith('parchmap-php-test-')) {
            fs.rmSync(temp, { recursive: true, force: true });
        }
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
