"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const application_errors_1 = require("./domain/applicationErrors");
class SchedulerService {
    task = null;
    constructor(config, useCase, runService, logger) {
        this.config = config;
        this.useCase = useCase;
        this.runService = runService;
        this.logger = logger;
    }
    start() {
        if (!this.config.schedulerEnabled) {
            this.logger.info('Scheduler disabled');
            return;
        }
        if (!node_cron_1.default.validate(this.config.schedulerCron)) {
            throw new Error(`Invalid cron expression: ${this.config.schedulerCron}`);
        }
        this.task = node_cron_1.default.schedule(this.config.schedulerCron, () => {
            void this.trigger('scheduler');
        });
        this.logger.info({ cron: this.config.schedulerCron }, 'Scheduler started');
    }
    stop() {
        this.task?.stop();
        this.task = null;
    }
    async trigger(source) {
        if (this.runService.getState().isRunning) {
            this.logger.warn({ source }, 'Skipped scheduled run — already running');
            return;
        }
        try {
            await this.useCase.execute();
        }
        catch (error) {
            if (error instanceof application_errors_1.ConcurrentExecutionError) {
                this.logger.warn({ source }, 'Skipped scheduled run — already running');
                return;
            }
            this.logger.error({ err: error, source }, 'Scheduled processing failed');
        }
    }
}
exports.SchedulerService = SchedulerService;
