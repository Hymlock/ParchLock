"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRunner = void 0;
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const DEFAULT_MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_TIMEOUT_MS = 24 * 60 * 60_000;
const MAX_ARGS = 256;
const MAX_ARG_LENGTH = 32_768;
class CapabilityRunner {
    workspaceRoot;
    configPath;
    receiptsDir;
    configRoot;
    allowOutsideWorkspace;
    constructor(workspaceRoot, options = {}) {
        this.workspaceRoot = workspaceRoot;
        this.workspaceRoot = path.resolve(workspaceRoot);
        this.configRoot = path.resolve(options.configRoot ?? this.workspaceRoot);
        this.allowOutsideWorkspace = options.allowOutsideWorkspace === true;
        this.configPath = path.join(this.configRoot, '.ai-bus', 'capabilities.json');
        this.receiptsDir = path.join(this.configRoot, '.ai-bus', 'runtime', 'receipts');
    }
    async list() {
        return (await this.loadConfig()).capabilities;
    }
    async get(id) {
        const capability = (await this.list()).find((item) => item.id === id);
        if (!capability) {
            throw new Error(`Unknown capability: ${id}`);
        }
        return capability;
    }
    async run(id, options = {}) {
        const definition = await this.get(id);
        if (options.seat && !(definition.allowedSeats ?? []).some((seat) => seat === '*' || seat === options.seat)) {
            throw new Error(`Seat ${options.seat} is not authorized to run capability ${id}.`);
        }
        const executable = this.expand(definition.command);
        const args = (definition.args ?? []).map((value) => this.expand(value));
        const cwd = await this.resolveWorkingDirectory(definition.cwd ?? '.', definition.allowOutsideWorkspace === true);
        const timeoutMs = clampTimeout(options.timeoutMs ?? definition.timeoutMs ?? DEFAULT_TIMEOUT_MS);
        const maxOutputBytes = Math.max(4_096, options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES);
        await this.ensureSafeReceiptsDirectory();
        const started = Date.now();
        const startedAt = new Date(started).toISOString();
        const runId = `${startedAt.replace(/[-:.TZ]/g, '')}-${(0, node_crypto_1.randomUUID)().slice(0, 8)}`;
        const stdout = new OutputCapture(maxOutputBytes);
        const stderr = new OutputCapture(maxOutputBytes);
        let timedOut = false;
        let cancelled = false;
        let launchError;
        const result = await new Promise((resolve) => {
            let settled = false;
            const child = (0, node_child_process_1.spawn)(executable, args, {
                cwd,
                env: capabilityEnvironment(definition.inheritEnv ?? []),
                shell: false,
                windowsHide: true,
                detached: process.platform !== 'win32',
                stdio: ['ignore', 'pipe', 'pipe']
            });
            child.stdout?.on('data', (chunk) => stdout.append(chunk));
            child.stderr?.on('data', (chunk) => stderr.append(chunk));
            let exitFallback;
            let finalWatchdog;
            let timer;
            let cancelRun = () => undefined;
            const finish = (exitCode, signal) => {
                if (!settled) {
                    settled = true;
                    if (timer)
                        clearTimeout(timer);
                    if (exitFallback)
                        clearTimeout(exitFallback);
                    if (finalWatchdog)
                        clearTimeout(finalWatchdog);
                    options.signal?.removeEventListener('abort', cancelRun);
                    resolve({ exitCode, signal });
                }
            };
            child.once('error', (error) => {
                launchError = error;
                finish(null, null);
            });
            child.once('close', finish);
            child.once('exit', (exitCode, signal) => {
                exitFallback = setTimeout(() => {
                    child.stdout?.destroy();
                    child.stderr?.destroy();
                    finish(exitCode, signal);
                }, 500);
                exitFallback.unref();
            });
            cancelRun = () => {
                if (settled || cancelled)
                    return;
                cancelled = true;
                void terminateProcessTree(child);
                finalWatchdog = setTimeout(() => {
                    child.stdout?.destroy();
                    child.stderr?.destroy();
                    finish(child.exitCode, child.signalCode);
                }, 5_000);
                finalWatchdog.unref();
            };
            options.signal?.addEventListener('abort', cancelRun, { once: true });
            if (options.signal?.aborted)
                cancelRun();
            timer = setTimeout(() => {
                if (cancelled)
                    return;
                timedOut = true;
                void terminateProcessTree(child);
                finalWatchdog = setTimeout(() => {
                    child.stdout?.destroy();
                    child.stderr?.destroy();
                    finish(child.exitCode, child.signalCode);
                }, 5_000);
                finalWatchdog.unref();
            }, timeoutMs);
            timer.unref();
        });
        const finished = Date.now();
        const receipt = {
            schemaVersion: 1,
            runId,
            capabilityId: definition.id,
            category: definition.category ?? 'general',
            description: definition.description ?? '',
            command: {
                executable: this.portablePath(executable),
                args: args.map((value) => this.portablePath(value)),
                cwd: this.portablePath(cwd)
            },
            startedAt,
            finishedAt: new Date(finished).toISOString(),
            durationMs: finished - started,
            status: launchError
                ? 'launch_error'
                : cancelled
                    ? 'cancelled'
                    : timedOut
                        ? 'timed_out'
                        : result.exitCode === 0
                            ? 'passed'
                            : 'failed',
            exitCode: result.exitCode,
            signal: result.signal,
            timedOut,
            cancelled,
            workspaceCommit: await gitStamp(this.workspaceRoot),
            stdout: stdout.result(),
            stderr: launchError ? OutputCapture.fromText(launchError.message, maxOutputBytes) : stderr.result()
        };
        await atomicWriteJson(path.join(this.receiptsDir, `${runId}.json`), receipt);
        await atomicWriteJson(path.join(this.receiptsDir, 'latest.json'), receipt);
        return receipt;
    }
    async loadConfig() {
        const raw = await fs.readFile(this.configPath, 'utf8').catch((error) => {
            if (error.code === 'ENOENT') {
                throw new Error(`Capability config is missing: ${path.relative(this.configRoot, this.configPath)}`);
            }
            throw error;
        });
        const value = JSON.parse(raw);
        if (value.version !== 1 || !Array.isArray(value.capabilities)) {
            throw new Error('Capability config must have version 1 and a capabilities array.');
        }
        const seen = new Set();
        const capabilities = value.capabilities.map((item) => validateCapability(item, seen));
        return { version: 1, capabilities };
    }
    expand(value) {
        return value
            .replace(/\$\{workspace\}/g, this.workspaceRoot)
            .replace(/\$\{bus\}/g, this.configRoot);
    }
    async resolveWorkingDirectory(value, definitionRequestsOutside) {
        const expanded = this.expand(value);
        const resolved = path.resolve(this.workspaceRoot, expanded);
        const [realRoot, realCwd] = await Promise.all([fs.realpath(this.workspaceRoot), fs.realpath(resolved)]);
        const relative = path.relative(realRoot, realCwd);
        const outside = relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
        if (outside && !(definitionRequestsOutside && this.allowOutsideWorkspace)) {
            throw new Error(`Capability working directory escapes the workspace: ${value}`);
        }
        return realCwd;
    }
    async ensureSafeReceiptsDirectory() {
        const realRoot = await fs.realpath(this.configRoot);
        let current = this.configRoot;
        for (const segment of ['.ai-bus', 'runtime', 'receipts']) {
            current = path.join(current, segment);
            const stat = await fs.lstat(current).catch((error) => {
                if (error.code === 'ENOENT')
                    return undefined;
                throw error;
            });
            if (stat?.isSymbolicLink()) {
                throw new Error(`Capability receipt path cannot contain a symbolic link or junction: ${current}`);
            }
            if (!stat)
                await fs.mkdir(current);
            const realCurrent = await fs.realpath(current);
            const relative = path.relative(realRoot, realCurrent);
            if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
                throw new Error('Capability receipt path escapes the workspace.');
            }
        }
    }
    portablePath(value) {
        const normalized = path.isAbsolute(value) ? path.normalize(value) : value;
        const root = this.workspaceRoot.replace(/[\\/]+$/, '');
        const compare = (item) => process.platform === 'win32' ? item.toLowerCase() : item;
        if (compare(normalized) === compare(root)) {
            return '${workspace}';
        }
        if (compare(normalized).startsWith(`${compare(root)}${path.sep}`)) {
            return `\${workspace\}/${normalized.slice(root.length + 1).replace(/\\/g, '/')}`;
        }
        const bus = this.configRoot.replace(/[\\/]+$/, '');
        if (compare(normalized) === compare(bus))
            return '${bus}';
        if (compare(normalized).startsWith(`${compare(bus)}${path.sep}`)) {
            return `\${bus\}/${normalized.slice(bus.length + 1).replace(/\\/g, '/')}`;
        }
        return redactText(normalized);
    }
}
exports.CapabilityRunner = CapabilityRunner;
class OutputCapture {
    maxBytes;
    hash = (0, node_crypto_1.createHash)('sha256');
    chunks = [];
    retainedBytes = 0;
    totalBytes = 0;
    constructor(maxBytes) {
        this.maxBytes = maxBytes;
    }
    append(value) {
        const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
        this.hash.update(chunk);
        this.totalBytes += chunk.length;
        this.chunks.push(chunk);
        this.retainedBytes += chunk.length;
        while (this.retainedBytes > this.maxBytes && this.chunks.length > 0) {
            const overflow = this.retainedBytes - this.maxBytes;
            const first = this.chunks[0];
            if (first.length <= overflow) {
                this.chunks.shift();
                this.retainedBytes -= first.length;
            }
            else {
                this.chunks[0] = first.subarray(overflow);
                this.retainedBytes -= overflow;
            }
        }
    }
    result() {
        return {
            bytes: this.totalBytes,
            sha256: this.hash.digest('hex'),
            truncated: this.totalBytes > this.retainedBytes,
            tail: redactText(Buffer.concat(this.chunks).toString('utf8'))
        };
    }
    static fromText(value, maxBytes) {
        const capture = new OutputCapture(maxBytes);
        capture.append(value);
        return capture.result();
    }
}
function redactText(value) {
    return value
        .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
        .replace(/((?:password|authorization|token|secret|api[_-]?key)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}
function validateCapability(value, seen) {
    if (!value || typeof value !== 'object') {
        throw new Error('Every capability must be an object.');
    }
    const item = value;
    if (!item.id || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/.test(item.id)) {
        throw new Error(`Invalid capability id: ${String(item.id)}`);
    }
    if (seen.has(item.id)) {
        throw new Error(`Duplicate capability id: ${item.id}`);
    }
    seen.add(item.id);
    if (!item.command || typeof item.command !== 'string' || item.command.includes('\0')) {
        throw new Error(`Capability ${item.id} requires a valid command executable.`);
    }
    if (item.args !== undefined && (!Array.isArray(item.args) || item.args.length > MAX_ARGS)) {
        throw new Error(`Capability ${item.id} has too many arguments.`);
    }
    for (const argument of item.args ?? []) {
        if (typeof argument !== 'string' || argument.length > MAX_ARG_LENGTH || argument.includes('\0')) {
            throw new Error(`Capability ${item.id} has an invalid argument.`);
        }
    }
    if (item.cwd !== undefined && typeof item.cwd !== 'string') {
        throw new Error(`Capability ${item.id} has an invalid working directory.`);
    }
    if (item.timeoutMs !== undefined) {
        clampTimeout(item.timeoutMs);
    }
    return {
        id: item.id,
        description: typeof item.description === 'string' ? item.description.slice(0, 1_000) : undefined,
        category: typeof item.category === 'string' ? item.category.slice(0, 100) : undefined,
        command: item.command,
        args: item.args ?? [],
        cwd: item.cwd ?? '.',
        timeoutMs: item.timeoutMs,
        allowOutsideWorkspace: item.allowOutsideWorkspace === true,
        inheritEnv: validateEnvironmentNames(item.id, item.inheritEnv),
        allowedSeats: validateSeatGrants(item.id, item.allowedSeats)
    };
}
function validateSeatGrants(id, value) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value) || value.length > 64 || value.some((item) => typeof item !== 'string' || (item !== '*' && !/^[a-zA-Z0-9_.-]+$/.test(item)))) {
        throw new Error(`Capability ${id} has an invalid allowedSeats list.`);
    }
    return Array.from(new Set(value));
}
function validateEnvironmentNames(id, value) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value) || value.length > 64 || value.some((item) => typeof item !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(item))) {
        throw new Error(`Capability ${id} has an invalid inheritEnv list.`);
    }
    return Array.from(new Set(value));
}
function capabilityEnvironment(inherit) {
    const baseline = process.platform === 'win32'
        ? ['SystemRoot', 'WINDIR', 'ComSpec', 'PATH', 'PATHEXT', 'TEMP', 'TMP', 'LOCALAPPDATA', 'APPDATA']
        : ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL'];
    const result = {};
    for (const name of new Set([...baseline, ...inherit])) {
        if (process.env[name] !== undefined)
            result[name] = process.env[name];
    }
    return result;
}
async function terminateProcessTree(child) {
    const pid = child.pid;
    if (!pid)
        return;
    if (process.platform === 'win32') {
        await new Promise((resolve) => {
            const killer = (0, node_child_process_1.spawn)('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
                shell: false,
                windowsHide: true,
                env: capabilityEnvironment([]),
                stdio: 'ignore'
            });
            killer.once('error', () => {
                child.kill('SIGKILL');
                resolve();
            });
            killer.once('close', () => resolve());
        });
        return;
    }
    try {
        process.kill(-pid, 'SIGTERM');
    }
    catch {
        child.kill('SIGTERM');
    }
    setTimeout(() => {
        try {
            process.kill(-pid, 'SIGKILL');
        }
        catch {
            child.kill('SIGKILL');
        }
    }, 2_000).unref();
}
function clampTimeout(value) {
    if (!Number.isInteger(value) || value < 100 || value > MAX_TIMEOUT_MS) {
        throw new Error(`Capability timeout must be an integer between 100 and ${MAX_TIMEOUT_MS} ms.`);
    }
    return value;
}
async function gitStamp(root) {
    const run = (args) => new Promise((resolve) => {
        const child = (0, node_child_process_1.spawn)('git', args, { cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
        let text = '';
        let settled = false;
        let timer;
        const finish = (code) => {
            if (settled)
                return;
            settled = true;
            if (timer)
                clearTimeout(timer);
            resolve({ code, text: text.trim() });
        };
        child.stdout?.on('data', (chunk) => {
            if (Buffer.byteLength(text) < 64 * 1024)
                text += String(chunk).slice(0, 64 * 1024 - Buffer.byteLength(text));
        });
        child.once('error', () => finish(null));
        child.once('close', (code) => finish(code));
        timer = setTimeout(() => {
            void terminateProcessTree(child).finally(() => finish(null));
        }, 5_000);
        timer.unref();
    });
    const head = await run(['rev-parse', 'HEAD']);
    if (head.code !== 0 || !/^[0-9a-f]{40}$/i.test(head.text)) {
        return null;
    }
    const status = await run(['status', '--porcelain']);
    if (status.code !== 0)
        return null;
    return { sha: head.text, dirty: status.text.length > 0 };
}
async function atomicWriteJson(destination, value) {
    const temporary = `${destination}.${process.pid}.${(0, node_crypto_1.randomUUID)()}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, destination);
}
async function runCli(argv = process.argv.slice(2)) {
    const command = argv[0];
    const root = option(argv, '--root') ?? path.resolve(__dirname, '..', '..');
    const runner = new CapabilityRunner(root);
    if (command === 'list') {
        process.stdout.write(`${JSON.stringify(await runner.list(), null, 2)}\n`);
        return;
    }
    if (command === 'run') {
        const id = option(argv, '--id') ?? argv[1];
        if (!id || id.startsWith('--')) {
            throw new Error('run requires --id <capability-id>.');
        }
        const timeout = option(argv, '--timeout-ms');
        const receipt = await runner.run(id, { timeoutMs: timeout ? Number(timeout) : undefined });
        process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
        process.exitCode = receipt.status === 'passed' ? 0 : receipt.status === 'timed_out' ? 124 : 1;
        return;
    }
    throw new Error('Usage: capabilities.js list | run --id <id> [--timeout-ms N] [--root PATH]');
}
function option(argv, name) {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
}
if (require.main === module) {
    runCli().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=capabilities.js.map