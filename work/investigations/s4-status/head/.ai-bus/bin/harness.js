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
exports.HarnessServer = exports.DEFAULT_LEASE_STALE_MS = void 0;
const node_crypto_1 = require("node:crypto");
const fs = __importStar(require("node:fs/promises"));
const http = __importStar(require("node:http"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const capabilities_1 = require("./capabilities");
const evidence_1 = require("./evidence");
const mailbox_1 = require("./mailbox");
const workspace_key_1 = require("./workspace-key");
const DEFAULT_PORT = 47_831;
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const MAX_WAKE_MS = 30_000;
const MAX_CONCURRENT_WAKES = 8;
/** Shared with listeners and supervisors so their recovery policy cannot drift from lease expiry. */
exports.DEFAULT_LEASE_STALE_MS = 60_000;
const DEFAULT_LEASE_SWEEP_MS = 15_000;
const MAX_WORKER_LEASES = 256;
const DEFAULT_MAX_WAKE_MESSAGES = 100;
const DEFAULT_MAX_WAKE_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TOOL_MESSAGES = 4;
const MAX_HTTP_RESPONSE_BYTES = 4 * 1024 * 1024;
class HarnessServer {
    workspaceRoot;
    mailbox;
    capabilities;
    runtimeDir;
    tokenPath;
    endpointPath;
    auditPath;
    requestsDir;
    leasesPath;
    token;
    lockPath;
    recoveryLockPath;
    instanceId;
    workdir;
    claimRepo;
    maxBodyBytes;
    maxConcurrentRuns;
    leaseStaleMs;
    maxWorkerLeases;
    leaseSweepMs;
    maxWakeMessages;
    maxWakeResponseBytes;
    completed = new Map();
    inFlight = new Map();
    activeCapabilityRuns = 0;
    activeWakeRequests = 0;
    activeHttpRequests = 0;
    server;
    ownsLock = false;
    credentialInstanceDir;
    injectedSeatTokens;
    principals = new Map();
    seatTokenPaths = new Map();
    leases = new Map();
    leaseWrite = Promise.resolve();
    leaseTimer;
    wakeAbort = new AbortController();
    capabilityAbort = new AbortController();
    stopping = false;
    staleLeaseKeys = new Set();
    constructor(workspaceRoot, options = {}) {
        this.workspaceRoot = workspaceRoot;
        this.workspaceRoot = path.resolve(workspaceRoot);
        this.workdir = path.resolve(options.workdir ?? this.workspaceRoot);
        this.claimRepo = path.resolve(options.claimRepo ?? this.workspaceRoot);
        this.mailbox = new mailbox_1.MailboxStore(this.workspaceRoot);
        this.capabilities = new capabilities_1.CapabilityRunner(this.workdir, { configRoot: this.workspaceRoot });
        this.runtimeDir = path.join(this.workspaceRoot, '.ai-bus', 'runtime', 'harness');
        this.instanceId = (0, node_crypto_1.randomUUID)();
        const workspaceKey = (0, workspace_key_1.credentialWorkspaceKey)(this.workspaceRoot);
        const credentialsDir = options.credentialsDir ?? path.join(os.homedir(), '.portable-ai-bus', 'credentials', workspaceKey);
        this.credentialInstanceDir = path.join(credentialsDir, this.instanceId);
        this.tokenPath = path.join(this.credentialInstanceDir, 'operator.token');
        this.endpointPath = path.join(this.runtimeDir, 'endpoint.json');
        this.auditPath = path.join(this.runtimeDir, 'audit.ndjson');
        this.requestsDir = path.join(this.runtimeDir, 'requests');
        this.leasesPath = path.join(this.runtimeDir, 'leases.json');
        this.lockPath = path.join(this.runtimeDir, 'server.lock');
        this.recoveryLockPath = path.join(this.runtimeDir, 'server.lock.recovery');
        this.token = options.token ?? mintToken('operator');
        this.injectedSeatTokens = options.seatTokens ?? {};
        this.maxBodyBytes = boundedInteger(options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES, 1_024, 16 * 1024 * 1024, 'maxBodyBytes');
        this.maxConcurrentRuns = boundedInteger(options.maxConcurrentRuns ?? 2, 1, 32, 'maxConcurrentRuns');
        this.leaseStaleMs = boundedInteger(options.leaseStaleMs ?? exports.DEFAULT_LEASE_STALE_MS, 100, 24 * 60 * 60_000, 'leaseStaleMs');
        this.maxWorkerLeases = boundedInteger(options.maxWorkerLeases ?? MAX_WORKER_LEASES, 1, 4096, 'maxWorkerLeases');
        this.leaseSweepMs = boundedInteger(options.leaseSweepMs ?? DEFAULT_LEASE_SWEEP_MS, 50, 60 * 60_000, 'leaseSweepMs');
        this.maxWakeMessages = boundedInteger(options.maxWakeMessages ?? DEFAULT_MAX_WAKE_MESSAGES, 1, 1_000, 'maxWakeMessages');
        this.maxWakeResponseBytes = boundedInteger(options.maxWakeResponseBytes ?? DEFAULT_MAX_WAKE_RESPONSE_BYTES, 1_024, 16 * 1024 * 1024, 'maxWakeResponseBytes');
    }
    async start(port = DEFAULT_PORT) {
        if (this.server) {
            throw new Error('Harness server is already running.');
        }
        if (this.stopping)
            throw new Error('A stopped HarnessServer instance cannot be restarted; create a new instance.');
        await this.ensureSafeRuntime();
        await this.mailbox.registerAgents([]);
        const registeredAgents = (await this.mailbox.status()).agents;
        await this.acquireLock();
        try {
            this.server = http.createServer((request, response) => {
                this.activeHttpRequests += 1;
                void this.handle(request, response)
                    .catch((error) => {
                    const failure = httpFailure(error);
                    this.respond(response, failure.status, {
                        ok: false,
                        error: { code: failure.code, message: failure.message, retriable: failure.retriable }
                    });
                })
                    .finally(() => {
                    this.activeHttpRequests -= 1;
                });
            });
            this.server.keepAliveTimeout = 5_000;
            this.server.requestTimeout = 35_000;
            this.server.headersTimeout = 10_000;
            await new Promise((resolve, reject) => {
                this.server.once('error', reject);
                this.server.listen(port, '127.0.0.1', () => {
                    this.server.off('error', reject);
                    resolve();
                });
            });
            const address = this.server.address();
            if (!address || typeof address === 'string') {
                throw new Error('Harness server did not bind a TCP address.');
            }
            await this.provisionCredentials(registeredAgents);
            const endpoint = {
                schemaVersion: 1,
                instanceId: this.instanceId,
                host: '127.0.0.1',
                port: address.port,
                authScheme: 'Bearer',
                seats: registeredAgents,
                pid: process.pid,
                coordinationRoot: this.workspaceRoot,
                workdir: this.workdir,
                startedAt: new Date().toISOString()
            };
            await this.atomicJson(this.endpointPath, endpoint);
            await this.persistLeases();
            this.leaseTimer = setInterval(() => void this.auditLeaseTransitions(), this.leaseSweepMs);
            this.leaseTimer.unref();
            await this.audit({ event: 'server_started', instanceId: this.instanceId, port: address.port }).catch(() => undefined);
            return { host: endpoint.host, port: endpoint.port, tokenPath: this.tokenPath, seatTokenPaths: Object.fromEntries(this.seatTokenPaths) };
        }
        catch (error) {
            await this.cleanupOwnedArtifacts(true);
            throw error;
        }
    }
    async provisionCredentials(agents) {
        await fs.mkdir(this.credentialInstanceDir, { recursive: true, mode: 0o700 });
        const writeToken = async (destination, value) => {
            const handle = await fs.open(destination, 'wx', 0o600);
            await handle.writeFile(`${value}\n`, 'utf8');
            await handle.close();
            await fs.chmod(destination, 0o600).catch(() => undefined);
        };
        await writeToken(this.tokenPath, this.token);
        this.principals.set(this.token, { kind: 'operator', id: 'operator' });
        const seatsDir = path.join(this.credentialInstanceDir, 'seats');
        await fs.mkdir(seatsDir, { mode: 0o700 });
        for (const agent of agents) {
            const token = this.injectedSeatTokens[agent] ?? mintToken(agent);
            const destination = path.join(seatsDir, `${agent}.token`);
            await writeToken(destination, token);
            this.principals.set(token, { kind: 'seat', id: agent });
            this.seatTokenPaths.set(agent, destination);
        }
    }
    async stop() {
        if ((!this.server && !this.ownsLock) || (this.stopping && !this.server))
            return;
        this.stopping = true;
        this.wakeAbort.abort();
        this.capabilityAbort.abort();
        if (this.leaseTimer) {
            clearInterval(this.leaseTimer);
            this.leaseTimer = undefined;
        }
        if (this.server) {
            const current = this.server;
            this.server = undefined;
            const closed = new Promise((resolve) => current.close(() => resolve()));
            const drainDeadline = Date.now() + 1_500;
            while (this.activeHttpRequests > 0 && Date.now() < drainDeadline) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
            current.closeIdleConnections?.();
            if (this.activeHttpRequests > 0)
                current.closeAllConnections?.();
            await closed;
        }
        await this.audit({ event: 'server_stopped', instanceId: this.instanceId }).catch(() => undefined);
        await this.persistLeases(new Date().toISOString()).catch(() => undefined);
        await this.cleanupOwnedArtifacts(false);
    }
    async ensureSafeRuntime() {
        const realRoot = await fs.realpath(this.workspaceRoot);
        let current = realRoot;
        for (const segment of ['.ai-bus', 'runtime', 'harness', 'requests']) {
            const candidate = path.join(current, segment);
            try {
                const stat = await fs.lstat(candidate);
                if (stat.isSymbolicLink() || !stat.isDirectory()) {
                    throw new Error(`Unsafe harness runtime path: ${candidate}`);
                }
            }
            catch (error) {
                if (error.code !== 'ENOENT')
                    throw error;
                await fs.mkdir(candidate);
            }
            const resolved = await fs.realpath(candidate);
            const relative = path.relative(realRoot, resolved);
            if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
                throw new Error(`Harness runtime escapes the workspace: ${candidate}`);
            }
            current = resolved;
        }
    }
    async acquireLock() {
        const attempt = async (duringRecovery = false) => {
            if (!duringRecovery && await pathExists(this.recoveryLockPath)) {
                const owner = await this.readJsonFile(this.recoveryLockPath).catch(() => undefined);
                const detail = !owner || typeof owner.instanceId !== 'string' || !Number.isSafeInteger(owner.pid)
                    ? 'The harness recovery lock is malformed; stop all bus processes and inspect it before removing only that file.'
                    : processAlive(owner.pid)
                        ? `Another process (PID ${owner.pid}) is recovering the harness server lock.`
                        : `A dead process (PID ${owner.pid}) left the harness recovery lock; stop all bus processes and inspect it before removing only that file.`;
                throw new HarnessHttpError(409, 'server_lock_recovery', detail, true);
            }
            await this.publishExclusiveLock(this.lockPath, { instanceId: this.instanceId, pid: process.pid, at: new Date().toISOString() });
            this.ownsLock = true;
        };
        try {
            await attempt();
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
            const existing = await this.readJsonFile(this.lockPath).catch(() => ({}));
            if (!existing.instanceId || !existing.pid || processAlive(existing.pid)) {
                throw new HarnessHttpError(409, 'server_running', `A harness server already owns this workspace (PID ${existing.pid}).`);
            }
            await this.recoverServerLock(existing.instanceId, existing.pid, attempt);
        }
    }
    async recoverServerLock(expectedInstanceId, expectedPid, attempt) {
        let recoveryOwned = false;
        try {
            await this.publishExclusiveLock(this.recoveryLockPath, { instanceId: this.instanceId, pid: process.pid, at: new Date().toISOString() });
            recoveryOwned = true;
            const current = await this.readJsonFile(this.lockPath).catch(() => undefined);
            if (!current || current.instanceId !== expectedInstanceId || current.pid !== expectedPid) {
                throw new HarnessHttpError(409, 'server_lock_changed', 'Harness server lock changed during recovery.', true);
            }
            if (processAlive(expectedPid)) {
                throw new HarnessHttpError(409, 'server_running', `A harness server already owns this workspace (PID ${expectedPid}).`);
            }
            await fs.rm(this.lockPath);
            await attempt(true);
        }
        catch (error) {
            if (error.code === 'EEXIST') {
                throw new HarnessHttpError(409, 'server_lock_recovery', 'Another process is recovering the harness server lock.', true);
            }
            throw error;
        }
        finally {
            if (recoveryOwned) {
                const owner = await this.readJsonFile(this.recoveryLockPath).catch(() => undefined);
                if (owner?.instanceId === this.instanceId)
                    await fs.rm(this.recoveryLockPath, { force: true });
            }
        }
    }
    async cleanupOwnedArtifacts(closeServer) {
        if (closeServer && this.server) {
            const current = this.server;
            this.server = undefined;
            await new Promise((resolve) => current.close(() => resolve()));
        }
        const endpoint = await this.readJsonFile(this.endpointPath).catch(() => undefined);
        if (endpoint?.instanceId === this.instanceId)
            await fs.rm(this.endpointPath, { force: true });
        await fs.rm(this.credentialInstanceDir, { recursive: true, force: true });
        this.principals.clear();
        this.seatTokenPaths.clear();
        if (this.ownsLock) {
            const lock = await this.readJsonFile(this.lockPath).catch(() => undefined);
            if (lock?.instanceId === this.instanceId)
                await fs.rm(this.lockPath, { force: true });
            this.ownsLock = false;
        }
    }
    async readJsonFile(filePath) {
        return JSON.parse(await fs.readFile(filePath, 'utf8'));
    }
    async publishExclusiveLock(destination, owner) {
        const candidate = `${destination}.${process.pid}.${(0, node_crypto_1.randomUUID)()}.candidate`;
        try {
            await fs.writeFile(candidate, `${JSON.stringify(owner)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
            await fs.link(candidate, destination);
        }
        finally {
            await fs.rm(candidate, { force: true });
        }
    }
    tools() {
        const object = (properties, required = []) => ({
            type: 'object',
            properties,
            required,
            additionalProperties: false
        });
        const agent = { type: 'string', pattern: '^[a-zA-Z0-9_.-]+$' };
        const paths = { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 256 };
        const rounds = { type: 'array', items: { type: 'integer', minimum: 1 }, maxItems: 256 };
        return [
            { name: 'mailbox_status', description: 'Read rounds, registered agents, unread counts, claims, and workspace commit.', inputSchema: object({}) },
            { name: 'mailbox_inbox', description: 'Peek at a bounded page of unread messages without acknowledging them; use afterSeq to advance.', inputSchema: object({ agent, all: { type: 'boolean' }, afterSeq: { type: 'integer', minimum: 0 } }, ['agent']) },
            { name: 'mailbox_read', description: 'Read FIFO mail, or acknowledge exactly the supplied unread sequences.', inputSchema: object({ agent, all: { type: 'boolean' }, seqs: { type: 'array', items: { type: 'integer', minimum: 1 }, minItems: 1, maxItems: MAX_TOOL_MESSAGES } }, ['agent']) },
            { name: 'mailbox_supersede', description: 'Replace one message you sent with a newer message you also sent.', inputSchema: object({ agent, seq: { type: 'integer', minimum: 1 }, by: { type: 'integer', minimum: 1 }, reason: { type: 'string' } }, ['agent', 'seq', 'by', 'reason']) },
            {
                name: 'mailbox_send',
                description: 'Send one durable coordination message.',
                inputSchema: object({
                    from: agent,
                    to: agent,
                    kind: { type: 'string' },
                    subject: { type: 'string' },
                    body: { type: 'string' },
                    // "I am reporting progress, not handing over." Omitted, an ack keeps the baton
                    // and everything else passes it. This was missing from the schema AND from the
                    // handler below, so --keep-baton worked on the direct CLI and was silently
                    // dropped on the HTTP path - which is the only path agents actually use.
                    keepBaton: { type: 'boolean' },
                    // Item 18, audit finding - and it is the SAME defect the keepBaton note above
                    // records, made twice. `supersedes` reached only MailboxStore.send, so the
                    // atomic superseding send was unreachable from the HTTP path, which is the only
                    // path agents actually use. When a store gains a capability, every surface that
                    // fronts it is part of the change.
                    supersedes: { type: 'integer', minimum: 1 },
                    supersedeReason: { type: 'string' }
                }, ['from', 'to', 'subject', 'body'])
            },
            // Item 7: `why` is REQUIRED. A claim that cannot say what it is for is refused by the
            // store, so the schema must say so rather than let the call fail deeper in.
            { name: 'mailbox_claim', description: 'Hold existing workspace paths now after conflict checks; success is final and requires no acceptance step.', inputSchema: object({ agent, paths, why: { type: 'string' } }, ['agent', 'paths', 'why']) },
            { name: 'mailbox_release', description: 'Release exact paths, or all claims when paths is omitted.', inputSchema: object({ agent, paths }, ['agent']) },
            { name: 'mailbox_record_evidence', description: 'Record an UNTRUSTED evidence claim keyed to mailbox work. This is not verification.', inputSchema: object({ agent, subject: { type: 'string' }, statement: { type: 'string' }, workId: { type: 'integer', minimum: 1 } }, ['agent', 'subject', 'statement']) },
            { name: 'mailbox_promote_evidence', description: 'Observe the world and promote an evidence claim. The caller names a verifier kind; it cannot supply the observation.', inputSchema: object({ agent, id: { type: 'string' }, kind: { type: 'string', enum: ['commit-diff', 'runner-result', 'lifecycle-transition'] }, invocation: { type: 'string' }, transition: { type: 'string' } }, ['agent', 'id', 'kind']) },
            { name: 'mailbox_list_evidence', description: 'List evidence records, optionally filtered to one mailbox work sequence.', inputSchema: object({ workId: { type: 'integer', minimum: 1 } }) },
            { name: 'mailbox_complete_step', description: 'Record structured step completion and apply the configured step halt policy.', inputSchema: object({ agent, summary: { type: 'string' }, evidence: paths }, ['agent', 'summary']) },
            { name: 'mailbox_complete_goal', description: 'Operator-only: record structured goal completion and apply the configured goal halt policy.', inputSchema: object({ agent, summary: { type: 'string' }, evidence: paths }, ['agent', 'summary']) },
            { name: 'mailbox_configure_halting', description: 'Operator-only: configure max/designated-round, step-completion, and goal-completion halting.', inputSchema: object({ onStepCompletion: { type: 'boolean' }, onGoalCompletion: { type: 'boolean' }, atRounds: rounds, everyRounds: { type: ['integer', 'null'], minimum: 0 } }) },
            { name: 'capability_list', description: 'List allowlisted workspace capabilities.', inputSchema: object({}) },
            { name: 'capability_run', description: 'Run one allowlisted capability without a shell and write an evidence receipt.', inputSchema: object({ id: { type: 'string' }, timeoutMs: { type: 'integer', minimum: 100 } }, ['id']) }
        ];
    }
    async handle(request, response) {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        const principal = this.authenticate(request);
        if (!principal) {
            this.respond(response, 401, { ok: false, error: { code: 'unauthorized', message: 'Unauthorized', retriable: false } });
            return;
        }
        if (this.stopping)
            throw new HarnessHttpError(503, 'server_stopping', 'Harness server is stopping.', true);
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');
        if (request.method === 'GET' && url.pathname === '/v1/status') {
            const [mailbox, allCapabilities] = await Promise.all([this.mailbox.status(), this.capabilities.list()]);
            const capabilities = principal.kind === 'operator'
                ? allCapabilities
                : allCapabilities.filter((item) => (item.allowedSeats ?? []).some((seat) => seat === '*' || seat === principal.id));
            this.respond(response, 200, {
                ok: true,
                mailbox,
                capabilities,
                activeCapabilityRuns: this.activeCapabilityRuns,
                workerLeases: this.leaseSnapshot(mailbox.agents)
            });
            return;
        }
        if (request.method === 'GET' && url.pathname === '/v1/tools') {
            this.respond(response, 200, { ok: true, protocolVersion: 1, tools: this.tools() });
            return;
        }
        if (request.method === 'GET' && url.pathname === '/v1/wake') {
            if (this.activeWakeRequests >= MAX_CONCURRENT_WAKES) {
                throw new HarnessHttpError(429, 'wake_concurrency_limit', `Wake concurrency limit reached (${MAX_CONCURRENT_WAKES}).`, true);
            }
            const agent = this.authorizedAgent(principal, url.searchParams.get('agent'));
            const clientId = principal.kind === 'seat'
                ? requiredClientId(url.searchParams.get('clientId'))
                : optionalClientId(url.searchParams.get('clientId'));
            const lease = principal.kind === 'seat'
                ? await this.touchLease(agent, clientId, 'wake', {
                    leaseId: requiredLeaseId(url.searchParams.get('leaseId')),
                    generation: requiredGeneration(url.searchParams.get('generation'))
                })
                : undefined;
            const requestedTimeout = Number(url.searchParams.get('timeoutMs') ?? 25_000);
            const timeoutMs = Math.max(0, Math.min(MAX_WAKE_MS, Number.isFinite(requestedTimeout) ? requestedTimeout : 25_000));
            const afterSeq = optionalSequence(url.searchParams.get('afterSeq'));
            this.activeWakeRequests += 1;
            try {
                const wake = await this.mailbox.waitFor(agent, timeoutMs, 500, afterSeq, this.wakeAbort.signal);
                const pending = wake === 'message' ? (await this.mailbox.inbox(agent)).filter((message) => message.seq > afterSeq) : [];
                const messages = this.pageWakeMessages(pending);
                this.respond(response, 200, {
                    ok: true,
                    instanceId: this.instanceId,
                    wake,
                    messages,
                    hasMore: pending.length > messages.length,
                    ...(lease ? { leaseId: lease.leaseId, generation: lease.generation } : {})
                });
            }
            finally {
                this.activeWakeRequests -= 1;
            }
            return;
        }
        if (request.method === 'POST' && url.pathname === '/v1/heartbeat') {
            if (principal.kind !== 'seat') {
                throw new HarnessHttpError(403, 'seat_required', 'Only a seat credential may acquire or renew a worker lease.');
            }
            const body = await this.readBody(request);
            const agent = this.authorizedAgent(principal, body.agent);
            const clientId = requiredClientId(body.clientId);
            const identity = optionalLeaseIdentity(body);
            const acquisitionId = identity ? optionalAcquisitionId(body.acquisitionId) : requiredAcquisitionId(body.acquisitionId);
            const lease = await this.touchLease(agent, clientId, 'heartbeat', identity, acquisitionId);
            const mailboxEpoch = await this.mailbox.epoch();
            await this.audit({ event: 'heartbeat', principal: principal.id, agent, clientId });
            this.respond(response, 200, {
                ok: true,
                instanceId: this.instanceId,
                leaseId: lease.leaseId,
                generation: lease.generation,
                mailboxEpoch,
                expiresAt: new Date(Date.parse(leaseLastSeen(lease)) + this.leaseStaleMs).toISOString(),
                renewAfterMs: Math.max(50, Math.floor(this.leaseStaleMs / 3)),
                staleAfterMs: this.leaseStaleMs
            });
            return;
        }
        if (request.method === 'POST' && url.pathname === '/v1/workers/release') {
            if (principal.kind !== 'seat') {
                throw new HarnessHttpError(403, 'seat_required', 'Only a seat credential may release a worker lease.');
            }
            const body = await this.readBody(request);
            const agent = this.authorizedAgent(principal, body.agent);
            const clientId = requiredClientId(body.clientId);
            const released = await this.releaseLease(agent, clientId, {
                leaseId: requiredLeaseId(body.leaseId),
                generation: requiredGeneration(body.generation)
            });
            this.respond(response, 200, { ok: true, instanceId: this.instanceId, released });
            return;
        }
        if (request.method === 'POST' && url.pathname === '/v1/tool') {
            let body;
            try {
                body = validateToolRequest(await this.readBody(request));
            }
            catch (error) {
                if (error instanceof HarnessHttpError)
                    throw error;
                throw new HarnessHttpError(400, 'invalid_request', asMessage(error));
            }
            const result = await this.executeIdempotent(principal, body);
            this.respond(response, 200, { ok: true, instanceId: this.instanceId, requestId: body.requestId, result });
            return;
        }
        this.respond(response, 404, { ok: false, error: { code: 'not_found', message: 'Not found', retriable: false } });
    }
    async executeIdempotent(principal, request) {
        const principalKey = `${principal.kind}:${principal.id}`;
        const cacheKey = `${principalKey}:${request.requestId}`;
        const fingerprint = requestFingerprint({ principal: principalKey, request });
        const active = this.inFlight.get(cacheKey);
        if (active) {
            this.assertMatchingFingerprint(request.requestId, fingerprint, active.fingerprint);
            return active.promise;
        }
        const memory = this.completed.get(cacheKey);
        if (memory) {
            this.assertMatchingFingerprint(request.requestId, fingerprint, memory.fingerprint);
            return memory.result;
        }
        const operation = (async () => {
            const stored = await this.loadStoredRequest(request.requestId, principalKey);
            if (stored) {
                this.assertMatchingFingerprint(request.requestId, fingerprint, stored.fingerprint);
                if (stored.state === 'completed') {
                    this.rememberCompleted(cacheKey, fingerprint, stored.result);
                    return stored.result;
                }
                if (stored.state === 'in_progress') {
                    throw new HarnessHttpError(409, 'indeterminate_request', `Request ${request.requestId} was interrupted while in progress; inspect its evidence before choosing a new request id.`);
                }
                throw new HarnessHttpError(409, 'recorded_failure', stored.error ?? `Request ${request.requestId} previously failed.`);
            }
            const startedAt = new Date().toISOString();
            await this.storeRequest({ schemaVersion: 1, requestId: request.requestId, fingerprint, tool: request.name, state: 'in_progress', startedAt, principal: principalKey });
            await this.audit({ event: 'tool_start', principal: principalKey, requestId: request.requestId, tool: request.name });
            try {
                const result = await this.executeTool(principal, request);
                const finishedAt = new Date().toISOString();
                await this.storeRequest({ schemaVersion: 1, requestId: request.requestId, fingerprint, tool: request.name, state: 'completed', startedAt, finishedAt, result, principal: principalKey });
                this.rememberCompleted(cacheKey, fingerprint, result);
                await this.audit({ event: 'tool_complete', principal: principalKey, requestId: request.requestId, tool: request.name, result: summarize(result) }).catch(() => undefined);
                return result;
            }
            catch (error) {
                await this.storeRequest({
                    schemaVersion: 1,
                    requestId: request.requestId,
                    fingerprint,
                    tool: request.name,
                    state: 'failed',
                    startedAt,
                    finishedAt: new Date().toISOString(),
                    error: asMessage(error),
                    principal: principalKey
                }).catch(() => undefined);
                throw error;
            }
        })().finally(() => this.inFlight.delete(cacheKey));
        this.inFlight.set(cacheKey, { fingerprint, promise: operation });
        return operation;
    }
    pageWakeMessages(messages) {
        const selected = [];
        let bytes = 0;
        for (const message of messages) {
            if (selected.length >= this.maxWakeMessages)
                break;
            const messageBytes = Buffer.byteLength(JSON.stringify(message), 'utf8') + 1;
            if (selected.length > 0 && bytes + messageBytes > this.maxWakeResponseBytes)
                break;
            if (messageBytes > this.maxWakeResponseBytes) {
                throw new HarnessHttpError(500, 'wake_message_too_large', 'One mailbox message exceeds the configured wake response limit.');
            }
            selected.push(message);
            bytes += messageBytes;
        }
        return selected;
    }
    assertMatchingFingerprint(requestId, actual, expected) {
        if (actual !== expected) {
            throw new HarnessHttpError(409, 'request_id_reuse', `Request id ${requestId} was already bound to a different tool or input.`);
        }
    }
    rememberCompleted(requestId, fingerprint, result) {
        this.completed.set(requestId, { fingerprint, result });
        while (this.completed.size > 1_000) {
            const oldest = this.completed.keys().next().value;
            if (!oldest)
                break;
            this.completed.delete(oldest);
        }
    }
    storedRequestPath(requestId, principal = '') {
        const key = (0, node_crypto_1.createHash)('sha256').update(`${principal}\0${requestId}`).digest('hex');
        return path.join(this.requestsDir, `${key}.json`);
    }
    async loadStoredRequest(requestId, principal) {
        try {
            return JSON.parse(await fs.readFile(this.storedRequestPath(requestId, principal), 'utf8'));
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return undefined;
            throw error;
        }
    }
    async storeRequest(value) {
        await fs.mkdir(this.requestsDir, { recursive: true });
        await this.atomicJson(this.storedRequestPath(value.requestId, value.principal), value);
        await this.pruneStoredRequests();
    }
    async pruneStoredRequests() {
        const entries = await fs.readdir(this.requestsDir, { withFileTypes: true });
        const files = await Promise.all(entries
            .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
            .map(async (entry) => ({ name: entry.name, stat: await fs.stat(path.join(this.requestsDir, entry.name)) })));
        const cutoff = Date.now() - 7 * 24 * 60 * 60_000;
        const ordered = files.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
        for (const entry of ordered) {
            if (entry.stat.mtimeMs < cutoff || ordered.indexOf(entry) >= 1_000) {
                await fs.rm(path.join(this.requestsDir, entry.name), { force: true });
            }
        }
    }
    async executeTool(principal, request) {
        const input = request.input ?? {};
        if (['mailbox_read', 'mailbox_send', 'mailbox_supersede', 'mailbox_claim', 'mailbox_release', 'mailbox_record_evidence', 'mailbox_promote_evidence', 'capability_run'].includes(request.name)) {
            const status = await this.mailbox.status();
            if (status.roundWarning) {
                await this.audit({
                    event: 'round_guard_approaching',
                    principal: principal.kind === 'seat' ? principal.id : 'operator',
                    tool: request.name,
                    round: status.round,
                    maxRounds: status.maxRounds,
                    warning: status.roundWarning
                }).catch(() => undefined);
            }
            if (status.halted || status.round >= status.maxRounds) {
                throw new mailbox_1.BusHaltedError(status.stopReason ?? `round guard reached (${status.round}/${status.maxRounds}); mutating tools fail closed.`);
            }
        }
        switch (request.name) {
            case 'mailbox_status':
                return this.mailbox.status();
            case 'mailbox_inbox': {
                const afterSeq = input.afterSeq === undefined ? 0 : requireInteger(input.afterSeq, 'afterSeq');
                if (afterSeq < 0)
                    throw new InputValidationError('afterSeq must be non-negative.');
                const pending = (await this.mailbox.inbox(this.authorizedAgent(principal, input.agent))).filter((message) => message.seq > afterSeq);
                const limit = input.all === true ? MAX_TOOL_MESSAGES : 1;
                const messages = this.pageWakeMessages(pending.slice(0, limit));
                return { messages, hasMore: pending.length > messages.length };
            }
            case 'mailbox_read': {
                const agent = this.authorizedAgent(principal, input.agent);
                const messages = await (input.seqs === undefined
                    ? this.mailbox.read(agent, input.all === true, MAX_TOOL_MESSAGES)
                    : this.mailbox.acknowledge(agent, input.seqs));
                return { messages, hasMore: (await this.mailbox.inbox(agent)).length > 0 };
            }
            case 'mailbox_supersede': {
                const agent = this.authorizedAgent(principal, input.agent);
                try {
                    return await this.mailbox.supersedeMessage(requireInteger(input.seq, 'seq'), requireInteger(input.by, 'by'), requireString(input.reason, 'reason', 1_000), agent);
                }
                catch (error) {
                    if (error instanceof Error && /may supersede only messages it sent itself/.test(error.message)) {
                        throw new HarnessHttpError(403, 'forbidden', error.message);
                    }
                    throw error;
                }
            }
            case 'mailbox_send':
                const from = this.authorizedAgent(principal, input.from);
                const to = requireAgent(input.to);
                await Promise.all([this.assertRegisteredAgent(from), this.assertRegisteredAgent(to)]);
                return this.mailbox.send({
                    from,
                    to,
                    kind: optionalString(input.kind, 100) || 'note',
                    subject: requireString(input.subject, 'subject', 1_000),
                    body: requireString(input.body, 'body', 256 * 1024),
                    // Forwarded, not defaulted: `undefined` must reach the store so its own
                    // "an ack keeps the baton" rule still decides. Coercing to false here would
                    // silently undo that.
                    ...(input.keepBaton === undefined
                        ? {}
                        : { keepBaton: optionalBoolean(input.keepBaton, 'keepBaton') }),
                    // Item 18: same forwarding discipline. The store owns every rule about what a
                    // supersession means, including refusing to supersede a message this seat did not
                    // send; passing `undefined` through keeps that the single definition.
                    ...(input.supersedes === undefined
                        ? {}
                        : { supersedes: requireInteger(input.supersedes, 'supersedes') }),
                    ...(input.supersedeReason === undefined
                        ? {}
                        : { supersedeReason: requireString(input.supersedeReason, 'supersedeReason', 1_000) })
                });
            case 'mailbox_claim': {
                const requested = requireStringArray(input.paths, 'paths');
                const held = await this.mailbox.claim({
                    agent: this.authorizedAgent(principal, input.agent),
                    paths: requested,
                    why: optionalString(input.why, 1_000),
                    repoRoot: this.claimRepo
                });
                return {
                    status: 'HELD NOW',
                    message: 'The requested paths are HELD NOW. No acceptance or further claim step is required.',
                    requested,
                    held
                };
            }
            case 'mailbox_release':
                return this.mailbox.release(this.authorizedAgent(principal, input.agent), input.paths === undefined ? undefined : requireStringArray(input.paths, 'paths'));
            case 'mailbox_record_evidence':
                return this.mailbox.recordEvidence({
                    agent: this.authorizedAgent(principal, input.agent),
                    subject: requireString(input.subject, 'subject', 500),
                    statement: requireString(input.statement, 'statement', 4_096),
                    workId: input.workId === undefined ? undefined : requireInteger(input.workId, 'workId')
                });
            case 'mailbox_promote_evidence': {
                const kind = requireString(input.kind, 'kind', 40);
                if (kind !== 'commit-diff' && kind !== 'runner-result' && kind !== 'lifecycle-transition') {
                    throw new InputValidationError('kind must be commit-diff, runner-result, or lifecycle-transition.');
                }
                return this.mailbox.promoteEvidence({
                    agent: this.authorizedAgent(principal, input.agent),
                    id: requireString(input.id, 'id', 200),
                    kind,
                    invocation: optionalString(input.invocation, 1_000) || undefined,
                    transition: optionalString(input.transition, 200) || undefined
                });
            }
            case 'mailbox_list_evidence':
                return this.mailbox.listEvidence(input.workId === undefined ? undefined : requireInteger(input.workId, 'workId'));
            case 'mailbox_complete_step':
                return this.mailbox.complete({
                    scope: 'step',
                    actor: this.authorizedAgent(principal, input.agent),
                    summary: requireString(input.summary, 'summary', 10_000),
                    evidence: input.evidence === undefined ? [] : requireStringArray(input.evidence, 'evidence')
                });
            case 'mailbox_complete_goal':
                if (principal.kind !== 'operator')
                    throw new HarnessHttpError(403, 'operator_required', 'Only the operator may complete the overall goal.');
                return this.mailbox.complete({
                    scope: 'goal',
                    actor: requireAgent(input.agent),
                    summary: requireString(input.summary, 'summary', 10_000),
                    evidence: input.evidence === undefined ? [] : requireStringArray(input.evidence, 'evidence')
                });
            case 'mailbox_configure_halting':
                if (principal.kind !== 'operator')
                    throw new HarnessHttpError(403, 'operator_required', 'Only the operator may configure halt policies.');
                return this.mailbox.configureHalting({
                    onStepCompletion: optionalBoolean(input.onStepCompletion, 'onStepCompletion'),
                    onGoalCompletion: optionalBoolean(input.onGoalCompletion, 'onGoalCompletion'),
                    atRounds: input.atRounds === undefined ? undefined : requireIntegerArray(input.atRounds, 'atRounds'),
                    everyRounds: input.everyRounds === undefined || input.everyRounds === null
                        ? input.everyRounds
                        : requireInteger(input.everyRounds, 'everyRounds')
                });
            case 'capability_list':
                return principal.kind === 'operator'
                    ? this.capabilities.list()
                    : (await this.capabilities.list()).filter((item) => (item.allowedSeats ?? []).some((seat) => seat === '*' || seat === principal.id));
            case 'capability_run': {
                if (this.activeCapabilityRuns >= this.maxConcurrentRuns) {
                    throw new HarnessHttpError(429, 'concurrency_limit', `Capability concurrency limit reached (${this.maxConcurrentRuns}).`, true);
                }
                this.activeCapabilityRuns += 1;
                try {
                    const id = requireString(input.id, 'id', 100);
                    const definition = await this.capabilities.get(id);
                    if (principal.kind === 'seat' && !(definition.allowedSeats ?? []).some((seat) => seat === '*' || seat === principal.id)) {
                        throw new HarnessHttpError(403, 'capability_denied', `Seat ${principal.id} is not authorized to run capability ${id}.`);
                    }
                    return await this.capabilities.run(id, {
                        timeoutMs: input.timeoutMs === undefined ? undefined : requireInteger(input.timeoutMs, 'timeoutMs'),
                        seat: principal.kind === 'seat' ? principal.id : undefined,
                        signal: this.capabilityAbort.signal
                    });
                }
                finally {
                    this.activeCapabilityRuns -= 1;
                }
            }
            default:
                throw new HarnessHttpError(404, 'unknown_tool', `Unknown harness tool: ${request.name}`);
        }
    }
    authorizedAgent(principal, supplied) {
        if (principal.kind === 'seat') {
            if (supplied !== undefined && supplied !== null && supplied !== '' && requireAgent(supplied) !== principal.id) {
                throw new HarnessHttpError(403, 'seat_scope', `Seat ${principal.id} cannot act as another agent.`);
            }
            return principal.id;
        }
        return requireAgent(supplied);
    }
    async assertRegisteredAgent(agent) {
        if (!(await this.mailbox.status()).agents.includes(agent)) {
            throw new HarnessHttpError(403, 'unknown_seat', `Recipient ${agent} is not a registered seat.`);
        }
    }
    authenticate(request) {
        const header = String(request.headers.authorization ?? '');
        if (!/^Bearer\s+\S+$/i.test(header))
            return undefined;
        const supplied = header.replace(/^Bearer\s+/i, '');
        for (const [token, principal] of this.principals) {
            const left = Buffer.from(supplied);
            const right = Buffer.from(token);
            if (left.length === right.length && left.length > 0 && (0, node_crypto_1.timingSafeEqual)(left, right))
                return principal;
        }
        return undefined;
    }
    async readBody(request) {
        const chunks = [];
        let total = 0;
        for await (const raw of request) {
            const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
            total += chunk.length;
            if (total > this.maxBodyBytes) {
                throw new HarnessHttpError(413, 'body_too_large', `Request body exceeds ${this.maxBodyBytes} bytes.`);
            }
            chunks.push(chunk);
        }
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new InputValidationError('Request body must be a JSON object.');
        }
        return parsed;
    }
    respond(response, status, value) {
        if (response.headersSent) {
            return;
        }
        let content = `${JSON.stringify(value)}\n`;
        if (Buffer.byteLength(content, 'utf8') > MAX_HTTP_RESPONSE_BYTES) {
            status = 507;
            content = `${JSON.stringify({ ok: false, error: { code: 'response_too_large', message: `Response exceeds ${MAX_HTTP_RESPONSE_BYTES} bytes; request a smaller page.`, retriable: false } })}\n`;
        }
        response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(content);
    }
    async audit(value) {
        await fs.mkdir(this.runtimeDir, { recursive: true });
        const entry = redact({ at: new Date().toISOString(), ...value });
        await fs.appendFile(this.auditPath, `${JSON.stringify(entry)}\n`, 'utf8');
    }
    async touchLease(seat, clientId, event, identity, acquisitionId) {
        const now = new Date().toISOString();
        const nowMs = Date.now();
        const key = `${seat}:${clientId}`;
        let existing = this.leases.get(key);
        const existingLive = existing && nowMs - Date.parse(leaseLastSeen(existing)) <= this.leaseStaleMs;
        if (event === 'wake') {
            if (!existing || !existingLive || !identity || existing.leaseId !== identity.leaseId || existing.generation !== identity.generation) {
                throw new HarnessHttpError(409, 'lease_lost', `Worker lease is no longer valid for ${seat}/${clientId}.`, true);
            }
        }
        else if (identity) {
            if (!existing || !existingLive || existing.leaseId !== identity.leaseId || existing.generation !== identity.generation) {
                throw new HarnessHttpError(409, 'lease_lost', `Worker lease is no longer valid for ${seat}/${clientId}.`, true);
            }
        }
        else if (existingLive) {
            if (!acquisitionId || existing.acquisitionId !== acquisitionId) {
                throw new HarnessHttpError(409, 'lease_held', `Seat ${seat} already has a live worker lease.`, true);
            }
        }
        else {
            const wasPreviouslyStale = this.staleLeaseKeys.has(key) || Boolean(existing);
            const competing = [...this.leases.values()].find((lease) => lease.seat === seat && lease.clientId !== clientId && nowMs - Date.parse(leaseLastSeen(lease)) <= this.leaseStaleMs);
            if (competing) {
                throw new HarnessHttpError(409, 'lease_held', `Seat ${seat} already has a live worker lease.`, true);
            }
            const generation = Math.max(0, ...[...this.leases.values()].filter((lease) => lease.seat === seat).map((lease) => lease.generation)) + 1;
            existing = undefined;
            this.leases.delete(key);
            if (this.leases.size >= this.maxWorkerLeases) {
                // Prune only leases that are already STALE. The previous behaviour evicted the
                // oldest-seen lease unconditionally, which under pressure could drop a live one - the
                // victim then looks like a network flake to whoever held it, which is the hardest
                // class of fault to diagnose afterwards. Grok flagged this; refusing is the honest
                // answer, because the cap means we genuinely cannot serve the request.
                const stale = [...this.leases.entries()]
                    .filter(([key]) => this.staleLeaseKeys.has(key))
                    .sort(([, left], [, right]) => leaseLastSeen(left).localeCompare(leaseLastSeen(right)))[0];
                if (stale) {
                    this.leases.delete(stale[0]);
                    this.staleLeaseKeys.delete(stale[0]);
                    await this.audit({ event: 'worker_lease_pruned', seat: stale[1].seat, clientId: stale[1].clientId }).catch(() => undefined);
                }
                else {
                    await this.audit({ event: 'worker_lease_capacity', seat, clientId }).catch(() => undefined);
                    throw new HarnessHttpError(429, 'lease_capacity', `Worker lease capacity reached (${this.maxWorkerLeases}) and every lease is live. Retry shortly.`, true);
                }
            }
            this.leases.set(key, {
                seat,
                clientId,
                leaseId: (0, node_crypto_1.randomUUID)(),
                generation,
                instanceId: this.instanceId,
                acquisitionId: acquisitionId,
                firstSeenAt: now,
                lastHeartbeatAt: now
            });
            existing = this.leases.get(key);
            if (wasPreviouslyStale)
                this.staleLeaseKeys.add(key);
        }
        if (!existing)
            throw new HarnessHttpError(409, 'lease_lost', `Worker lease is missing for ${seat}/${clientId}.`, true);
        const wasStale = this.staleLeaseKeys.delete(key);
        const lease = { ...existing, lastHeartbeatAt: event === 'heartbeat' ? now : existing.lastHeartbeatAt,
            lastWakeAt: event === 'wake' ? now : existing.lastWakeAt };
        this.leases.set(key, lease);
        await this.persistLeases();
        if (wasStale)
            await this.audit({ event: 'worker_lease_recovered', seat, clientId, lastSeenAt: leaseLastSeen(lease) }).catch(() => undefined);
        return lease;
    }
    async releaseLease(seat, clientId, identity) {
        const key = `${seat}:${clientId}`;
        const existing = this.leases.get(key);
        if (!existing)
            return false;
        if (existing.leaseId !== identity.leaseId || existing.generation !== identity.generation) {
            throw new HarnessHttpError(409, 'lease_lost', `Worker lease is no longer valid for ${seat}/${clientId}.`, false);
        }
        this.leases.delete(key);
        this.staleLeaseKeys.delete(key);
        await this.persistLeases();
        await this.audit({ event: 'worker_lease_released', seat, clientId, generation: identity.generation }).catch(() => undefined);
        return true;
    }
    leaseSnapshot(registeredSeats) {
        const now = Date.now();
        const sessions = [...this.leases.values()]
            .map((lease) => {
            const lastSeenAt = leaseLastSeen(lease);
            const ageMs = Math.max(0, now - Date.parse(lastSeenAt));
            return { ...lease, lastSeenAt, ageMs, state: ageMs <= this.leaseStaleMs ? 'live' : 'stale' };
        })
            .sort((left, right) => left.seat.localeCompare(right.seat) || left.clientId.localeCompare(right.clientId));
        const liveSeats = new Set(sessions.filter((lease) => lease.state === 'live').map((lease) => lease.seat));
        const seenSeats = new Set(sessions.map((lease) => lease.seat));
        const seats = registeredSeats.map((seat) => ({
            seat,
            state: liveSeats.has(seat) ? 'live' : seenSeats.has(seat) ? 'stale' : 'never_seen'
        }));
        return { instanceId: this.instanceId, staleAfterMs: this.leaseStaleMs, seats, sessions };
    }
    persistLeases(stoppedAt) {
        this.leaseWrite = this.leaseWrite.catch(() => undefined).then(() => this.atomicJson(this.leasesPath, {
            schemaVersion: 1,
            instanceId: this.instanceId,
            state: stoppedAt ? 'stopped' : 'running',
            updatedAt: new Date().toISOString(),
            staleAfterMs: this.leaseStaleMs,
            ...(stoppedAt ? { stoppedAt } : {}),
            leases: [...this.leases.values()]
        }));
        return this.leaseWrite;
    }
    async auditLeaseTransitions() {
        const now = Date.now();
        for (const [key, lease] of this.leases) {
            const lastSeenAt = leaseLastSeen(lease);
            const stale = now - Date.parse(lastSeenAt) > this.leaseStaleMs;
            if (stale && !this.staleLeaseKeys.has(key)) {
                this.staleLeaseKeys.add(key);
                await this.audit({ event: 'worker_lease_stale', seat: lease.seat, clientId: lease.clientId, lastSeenAt }).catch(() => undefined);
            }
            else if (!stale && this.staleLeaseKeys.delete(key)) {
                await this.audit({ event: 'worker_lease_recovered', seat: lease.seat, clientId: lease.clientId, lastSeenAt }).catch(() => undefined);
            }
        }
    }
    async atomicJson(destination, value) {
        const temporary = `${destination}.${process.pid}.${(0, node_crypto_1.randomUUID)()}.tmp`;
        try {
            await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
            for (let attempt = 0;; attempt += 1) {
                try {
                    await fs.rename(temporary, destination);
                    break;
                }
                catch (error) {
                    const code = error.code;
                    if (attempt >= 5 || (code !== 'EPERM' && code !== 'EACCES'))
                        throw error;
                    await new Promise((resolve) => setTimeout(resolve, 10 * (2 ** attempt)));
                }
            }
        }
        finally {
            await fs.rm(temporary, { force: true });
        }
    }
}
exports.HarnessServer = HarnessServer;
function validateToolRequest(value) {
    const requestId = requireString(value.requestId, 'requestId', 100);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,99}$/.test(requestId)) {
        throw new Error('Invalid requestId.');
    }
    return {
        requestId,
        name: requireString(value.name, 'name', 100),
        input: value.input === undefined ? {} : requireObject(value.input, 'input')
    };
}
async function pathExists(candidate) {
    try {
        await fs.access(candidate);
        return true;
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
}
class HarnessHttpError extends Error {
    status;
    code;
    retriable;
    constructor(status, code, message, retriable = false) {
        super(message);
        this.status = status;
        this.code = code;
        this.retriable = retriable;
        this.name = 'HarnessHttpError';
    }
}
class InputValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InputValidationError';
    }
}
function httpFailure(error) {
    if (error instanceof HarnessHttpError)
        return error;
    if (error instanceof InputValidationError)
        return new HarnessHttpError(400, 'invalid_request', error.message);
    if (error instanceof mailbox_1.BusHaltedError)
        return new HarnessHttpError(423, 'bus_halted', error.message);
    if (error instanceof mailbox_1.ClaimConflictError)
        return new HarnessHttpError(409, 'claim_conflict', error.message, true);
    if (error instanceof mailbox_1.ClaimPathMissingError)
        return new HarnessHttpError(400, 'claim_path_missing', error.message);
    // Items 7 and 13. Both are bad requests the caller can fix, not server faults — a 500 would
    // tell a seat "the bus is broken" when the answer is "say why" or "claim fewer paths".
    if (error instanceof mailbox_1.ClaimReasonRequiredError)
        return new HarnessHttpError(400, 'claim_reason_required', error.message);
    if (error instanceof mailbox_1.WholeRepositoryClaimError)
        return new HarnessHttpError(400, 'claim_too_broad', error.message);
    if (error instanceof evidence_1.EvidencePromotionError)
        return new HarnessHttpError(409, 'evidence_not_promoted', error.message);
    if (error instanceof SyntaxError)
        return new HarnessHttpError(400, 'invalid_json', error.message);
    return new HarnessHttpError(500, 'internal_error', asMessage(error), true);
}
function requestFingerprint(request) {
    return (0, node_crypto_1.createHash)('sha256').update(stableJson(request)).digest('hex');
}
function stableJson(value) {
    if (Array.isArray(value))
        return `[${value.map(stableJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}
function requireAgent(value) {
    const agent = requireString(value, 'agent', 100);
    if (!/^[a-zA-Z0-9_.-]+$/.test(agent)) {
        throw new InputValidationError('Invalid agent id.');
    }
    return agent;
}
function optionalClientId(value) {
    if (value === undefined || value === null || value === '')
        return 'anonymous';
    const clientId = requireString(value, 'clientId', 100);
    if (!/^[a-zA-Z0-9_.:-]+$/.test(clientId))
        throw new InputValidationError('Invalid clientId.');
    return clientId;
}
function requiredClientId(value) {
    if (value === undefined || value === null || value === '')
        throw new InputValidationError('clientId is required for worker lease operations.');
    return optionalClientId(value);
}
function optionalAcquisitionId(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    return requiredAcquisitionId(value);
}
function requiredAcquisitionId(value) {
    const acquisitionId = requireString(value, 'acquisitionId', 100);
    if (!/^[a-zA-Z0-9-]{16,100}$/.test(acquisitionId))
        throw new InputValidationError('Invalid acquisitionId.');
    return acquisitionId;
}
function optionalLeaseIdentity(value) {
    if (value.leaseId === undefined && value.generation === undefined)
        return undefined;
    return { leaseId: requiredLeaseId(value.leaseId), generation: requiredGeneration(value.generation) };
}
function requiredLeaseId(value) {
    const leaseId = requireString(value, 'leaseId', 100);
    if (!/^[a-zA-Z0-9-]{16,100}$/.test(leaseId))
        throw new InputValidationError('Invalid leaseId.');
    return leaseId;
}
function requiredGeneration(value) {
    const generation = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(generation) || generation < 1)
        throw new InputValidationError('generation must be a positive integer.');
    return generation;
}
function optionalSequence(value) {
    if (value === undefined || value === null || value === '')
        return 0;
    const sequence = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isSafeInteger(sequence) || sequence < 0)
        throw new InputValidationError('afterSeq must be a non-negative integer.');
    return sequence;
}
function leaseLastSeen(lease) {
    return [lease.lastHeartbeatAt, lease.lastWakeAt, lease.firstSeenAt].filter((value) => Boolean(value)).sort().at(-1);
}
function requireString(value, field, maxLength) {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength || value.includes('\0')) {
        throw new InputValidationError(`${field} must be a non-empty string up to ${maxLength} characters.`);
    }
    return value;
}
function optionalString(value, maxLength) {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    return requireString(value, 'value', maxLength);
}
function requireObject(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new InputValidationError(`${field} must be an object.`);
    }
    return value;
}
function requireStringArray(value, field) {
    if (!Array.isArray(value) || value.length === 0 || value.length > 256) {
        throw new InputValidationError(`${field} must be a non-empty array with at most 256 items.`);
    }
    return value.map((item) => requireString(item, field, 4_096));
}
function requireIntegerArray(value, field) {
    if (!Array.isArray(value) || value.length > 256 || value.some((item) => !Number.isSafeInteger(item) || item < 1)) {
        throw new InputValidationError(`${field} must be an array of at most 256 positive integers.`);
    }
    return value;
}
function requireInteger(value, field) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new InputValidationError(`${field} must be an integer.`);
    }
    return value;
}
function optionalBoolean(value, field) {
    if (value === undefined)
        return undefined;
    if (typeof value !== 'boolean')
        throw new InputValidationError(`${field} must be a boolean.`);
    return value;
}
function redact(value) {
    if (Array.isArray(value)) {
        return value.map(redact);
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key,
            /password|authorization|token|secret|api[_-]?key/i.test(key) ? '[REDACTED]' : redact(item)
        ]));
    }
    if (typeof value === 'string') {
        return value.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]');
    }
    return value;
}
function summarize(value) {
    const text = JSON.stringify(redact(value));
    return text.length <= 2_000 ? JSON.parse(text) : { sha256: (0, node_crypto_1.createHash)('sha256').update(text).digest('hex'), bytes: Buffer.byteLength(text) };
}
function asMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function boundedInteger(value, minimum, maximum, name) {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
    }
    return value;
}
function processAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code === 'EPERM';
    }
}
function mintToken(principal) {
    return `pab1.${principal}.${(0, node_crypto_1.randomBytes)(32).toString('base64url')}`;
}
async function runCli(argv = process.argv.slice(2)) {
    const command = argv[0];
    if (command !== 'serve') {
        throw new Error('Usage: harness.js serve [--root PATH] [--workdir REPO] [--claim-repo PATH] [--port N]');
    }
    const root = option(argv, '--root') ?? path.resolve(__dirname, '..', '..');
    const workdir = option(argv, '--workdir') ?? root;
    const claimRepo = path.resolve(uniqueOption(argv, '--claim-repo') ?? root);
    const port = Number(option(argv, '--port') ?? DEFAULT_PORT);
    if (!Number.isInteger(port) || port < 0 || port > 65_535) {
        throw new Error('port must be an integer from 0 through 65535.');
    }
    const claimRepoStat = await fs.stat(claimRepo).catch(() => undefined);
    if (!claimRepoStat?.isDirectory()) {
        throw new Error(`--claim-repo is not a directory: ${claimRepo}`);
    }
    const server = new HarnessServer(root, { workdir, claimRepo });
    const endpoint = await server.start(port);
    process.stdout.write(`Portable AI Bus harness listening at http://${endpoint.host}:${endpoint.port}\n`);
    process.stdout.write(`Bearer token: ${endpoint.tokenPath}\n`);
    const stop = async () => {
        await server.stop();
        process.exit(0);
    };
    process.once('SIGINT', () => void stop());
    process.once('SIGTERM', () => void stop());
}
function option(argv, name) {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
}
function uniqueOption(argv, name) {
    const indexes = argv.flatMap((value, index) => value === name ? [index] : []);
    if (indexes.length > 1)
        throw new Error(`Duplicate option: ${name}`);
    if (indexes.length === 0)
        return undefined;
    const value = argv[indexes[0] + 1];
    if (value === undefined || value.startsWith('--'))
        throw new Error(`Missing value for ${name}.`);
    return value;
}
if (require.main === module) {
    runCli().catch((error) => {
        process.stderr.write(`${asMessage(error)}\n`);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=harness.js.map