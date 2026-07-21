"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessBankMovementsUseCase = exports.validateManualQueryRange = exports.calculateQueryWindow = void 0;
const uuid_1 = require("uuid");
const luxon_1 = require("luxon");
const application_errors_1 = require("../domain/applicationErrors");
function calculateQueryWindow(config, override) {
    if (override?.start && override?.end) {
        return { start: new Date(override.start.getTime()), end: new Date(override.end.getTime()) };
    }
    const end = luxon_1.DateTime.now().setZone(config.timezone).toUTC();
    const start = end.minus({ minutes: config.dataExtractionDurationMinutes + config.queryOverlapMinutes });
    return { start: start.toJSDate(), end: end.toJSDate() };
}
exports.calculateQueryWindow = calculateQueryWindow;
function validateManualQueryRange(start, end, maxHours) {
    if (start >= end) {
        return { valid: false, message: 'startDateTime must be before endDateTime' };
    }
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours > maxHours) {
        return {
            valid: false,
            message: `Query range exceeds maximum of ${maxHours} hours`,
        };
    }
    return { valid: true };
}
exports.validateManualQueryRange = validateManualQueryRange;
class ProcessBankMovementsUseCase {
    constructor(config, bankIntegrations, runService, rootLogger) {
        this.config = config;
        this.bankIntegrations = bankIntegrations;
        this.runService = runService;
        this.rootLogger = rootLogger;
    }
    async execute(request = {}) {
        if (request.startDateTime && request.endDateTime) {
            const range = validateManualQueryRange(request.startDateTime, request.endDateTime, this.config.maxManualQueryRangeHours);
            if (!range.valid) {
                throw new application_errors_1.ValidationError(range.message ?? 'Invalid date range', [], request.correlationId);
            }
        }
        if (!this.runService.tryAcquire()) {
            throw new application_errors_1.ConcurrentExecutionError();
        }
        const runId = (0, uuid_1.v4)();
        const correlationId = (0, uuid_1.v4)();
        const logger = this.rootLogger.child({ runId, correlationId });
        const startedAt = new Date();
        this.runService.markStart();
        const persistToDatabase = request.persistToDatabase !== false;
        const updateRunCounters = request.updateRunCounters !== false && persistToDatabase;
        const summary = {
            runId,
            status: 'completed',
            startedAt: startedAt.toISOString(),
            finishedAt: null,
            persistToDatabase,
            banks: [],
        };
        const syncOptions = {
            persistToDatabase,
            creditFilterOnly: request.creditFilterOnly,
            includeMovementPreview: request.includeMovementPreview ?? !persistToDatabase,
            previewLimit: request.previewLimit ?? 20,
        };
        let hadFailure = false;
        try {
            const window = calculateQueryWindow(this.config, {
                start: request.startDateTime,
                end: request.endDateTime,
            });
            const accounts = this.selectAccounts(request.bank, request.networkId);
            for (const account of accounts) {
                const bankName = account.bankType;
                const accountLogger = logger.child({ bankName, networkId: account.networkId });
                try {
                    const sync = this.bankIntegrations.getSync(bankName);
                    const metrics = await sync.syncAccount(account, window, {
                        correlationId,
                        runId,
                        logger: accountLogger,
                        syncOptions,
                    });
                    if (metrics.failed > 0 &&
                        metrics.inserted === 0 &&
                        metrics.received === 0 &&
                        (metrics.eligibleForInsert ?? 0) === 0) {
                        hadFailure = true;
                    }
                    summary.banks.push(metrics);
                    if (updateRunCounters) {
                        this.runService.addMetrics({
                            received: metrics.received,
                            inserted: metrics.inserted,
                            duplicates: metrics.duplicates,
                            filtered: metrics.filtered,
                            failed: metrics.failed,
                        });
                    }
                }
                catch (error) {
                    hadFailure = true;
                    accountLogger.error({ err: error }, 'Bank integration failed');
                    summary.banks.push({
                        bank: bankName,
                        networkId: account.networkId,
                        received: 0,
                        valid: 0,
                        filtered: 0,
                        inserted: 0,
                        duplicates: 0,
                        failed: 1,
                        eligibleForInsert: 0,
                        persistToDatabase,
                        previewMovements: [],
                    });
                }
            }
            summary.status = hadFailure ? 'partial' : 'completed';
            this.runService.release(summary.status, !hadFailure && updateRunCounters);
        }
        catch (error) {
            summary.status = 'failed';
            this.runService.release('failed', false);
            throw error;
        }
        finally {
            summary.finishedAt = new Date().toISOString();
        }
        return summary;
    }
    selectAccounts(bank, networkId) {
        let accounts = this.config.enabledAccounts;
        if (bank) {
            accounts = accounts.filter((a) => a.bankType === bank);
        }
        if (networkId) {
            accounts = accounts.filter((a) => a.networkId === networkId);
        }
        return accounts;
    }
}
exports.ProcessBankMovementsUseCase = ProcessBankMovementsUseCase;
