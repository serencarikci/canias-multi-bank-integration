"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationServices = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const application_errors_1 = require("./domain/applicationErrors");
const parsers_1 = require("./domain/parsers");
const SERVICE_BASE = '/api/v1/services';
class IntegrationServices {
    startedAt = Date.now();
    constructor(deps) {
        this.config = deps.config;
        this.useCase = deps.useCase;
        this.runService = deps.runService;
        this.repository = deps.repository;
        this.packagePath = deps.packagePath ?? node_path_1.join(process.cwd(), 'package.json');
    }
    listServices() {
        return {
            basePath: SERVICE_BASE,
            services: [
                {
                    id: 'catalog',
                    method: 'GET',
                    path: SERVICE_BASE,
                    description: 'List available service operations (this response).',
                },
                {
                    id: 'getVersion',
                    method: 'GET',
                    path: `${SERVICE_BASE}/version`,
                    description: 'Application and runtime version information.',
                },
                {
                    id: 'getConfig',
                    method: 'GET',
                    path: `${SERVICE_BASE}/config`,
                    description: 'Non-secret configuration snapshot (accounts and credentials redacted).',
                    auth: 'API key when API_KEY_ENABLED=true',
                },
                {
                    id: 'getStatus',
                    method: 'GET',
                    path: `${SERVICE_BASE}/status`,
                    description: 'Scheduler state, last run outcome, and cumulative counters.',
                },
                {
                    id: 'fetchMovements',
                    method: 'POST',
                    path: `${SERVICE_BASE}/fetch-movements`,
                    description: 'Pull bank movements over SOAP for a time window; optional DB insert.',
                    auth: 'API key when API_KEY_ENABLED=true',
                    body: {
                        bank: 'ZIRAAT | VAKIFBANK (optional — all enabled banks if omitted)',
                        networkId: 'string (optional — filter one account)',
                        startDateTime: 'ISO-8601 with offset (optional — default rolling window from env)',
                        endDateTime: 'ISO-8601 with offset (optional — required with startDateTime)',
                        persistToDatabase: 'boolean (default true — set false to dry-run without INSERT)',
                        creditFilterOnly: 'boolean (optional — override MOVEMENT_FILTER_CREDIT_ONLY for this run)',
                        includeMovementPreview: 'boolean (default true when persistToDatabase=false)',
                        previewLimit: 'integer 1–100 (default 20, max movements returned per account in preview)',
                    },
                },
                {
                    id: 'previewMovements',
                    method: 'POST',
                    path: `${SERVICE_BASE}/fetch-movements/preview`,
                    description: 'Shortcut for fetch-movements with persistToDatabase=false (SOAP only, no MSSQL insert).',
                    auth: 'API key when API_KEY_ENABLED=true',
                    body: 'Same fields as fetch-movements except persistToDatabase (forced false).',
                },
            ],
            legacy: {
                process: 'POST /api/v1/process — insert run (same as fetch-movements with persistToDatabase=true)',
                version: 'GET /api/v1/version',
                status: 'GET /api/v1/status',
            },
        };
    }
    getVersion() {
        const pkg = JSON.parse((0, node_fs_1.readFileSync)(this.packagePath, 'utf8'));
        return {
            applicationName: pkg.name,
            version: pkg.version,
            nodeVersion: process.version,
            environment: this.config.nodeEnv,
            commitSha: this.config.commitSha ?? null,
        };
    }
    getConfig() {
        return {
            serviceName: this.config.serviceName,
            timezone: this.config.timezone,
            schedulerEnabled: this.config.schedulerEnabled,
            schedulerCron: this.config.schedulerCron,
            dataExtractionDurationMinutes: this.config.dataExtractionDurationMinutes,
            queryOverlapMinutes: this.config.queryOverlapMinutes,
            movementFilterCreditOnly: this.config.movementFilterCreditOnly,
            maxManualQueryRangeHours: this.config.maxManualQueryRangeHours,
            bankHttpTimeoutMs: this.config.bankHttpTimeoutMs,
            bankHttpMaxRetries: this.config.bankHttpMaxRetries,
            apiKeyEnabled: this.config.apiKeyEnabled,
            db: {
                host: this.config.db.host,
                port: this.config.db.port,
                name: this.config.db.name,
                user: this.config.db.user,
                encrypt: this.config.db.encrypt,
                trustServerCertificate: this.config.db.trustServerCertificate,
                poolMin: this.config.db.poolMin,
                poolMax: this.config.db.poolMax,
            },
            banks: this.config.banks
                .filter((b) => b.enabled)
                .map((bank) => ({
                type: bank.type,
                endpoint: bank.endpoint,
                accounts: bank.accounts.map((account) => ({
                    networkId: account.networkId,
                    account: (0, parsers_1.maskAccount)('customerNumber' in account ? account.customerNumber : account.accountNumber),
                })),
            })),
        };
    }
    getStatus() {
        const state = this.runService.getState();
        const enabledBanks = this.config.banks
            .filter((b) => b.enabled)
            .map((b) => ({
            type: b.type,
            accounts: b.accounts.map((a) => ({
                networkId: a.networkId,
                account: (0, parsers_1.maskAccount)('accountNumber' in a ? a.accountNumber : a.customerNumber),
            })),
        }));
        return {
            schedulerEnabled: this.config.schedulerEnabled,
            isRunning: state.isRunning,
            lastRunStart: state.lastRunStart,
            lastRunEnd: state.lastRunEnd,
            lastRunOutcome: state.lastRunOutcome,
            lastSuccessfulRun: state.lastSuccessfulRun,
            enabledBanks,
            counters: {
                totalReceived: state.totalReceived,
                totalInserted: state.totalInserted,
                totalDuplicates: state.totalDuplicates,
                totalFiltered: state.totalFiltered,
                totalFailed: state.totalFailed,
            },
            uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
        };
    }
    async checkDatabaseReady() {
        await this.repository.healthCheck();
        return { status: 'ready', timestamp: new Date().toISOString() };
    }
    assertAccountConfigured(bank, networkId) {
        if (!bank) {
            return;
        }
        const exists = this.config.enabledAccounts.some((a) => a.bankType === bank && (!networkId || a.networkId === networkId));
        if (!exists) {
            throw new application_errors_1.ValidationError('Bank or network is not configured', []);
        }
    }
    async fetchMovements(input, correlationId) {
        if (this.runService.getState().isRunning) {
            throw new application_errors_1.ConcurrentExecutionError();
        }
        this.assertAccountConfigured(input.bank, input.networkId);
        const persistToDatabase = input.persistToDatabase ?? true;
        const includeMovementPreview = input.includeMovementPreview ?? !persistToDatabase;
        return this.useCase.execute({
            bank: input.bank,
            networkId: input.networkId,
            startDateTime: input.startDateTime,
            endDateTime: input.endDateTime,
            correlationId,
            persistToDatabase,
            creditFilterOnly: input.creditFilterOnly,
            includeMovementPreview,
            previewLimit: input.previewLimit,
            updateRunCounters: persistToDatabase,
        });
    }
}
exports.IntegrationServices = IntegrationServices;
