"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scheduler_service_1 = require("../src/schedulerService");
const processing_run_service_1 = require("../src/application/processingRunService");
const pino_1 = __importDefault(require("pino"));
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
describe('SchedulerService', () => {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
        SCHEDULER_ENABLED: 'true',
    });
    it('skips when run is active', async () => {
        const runService = new processing_run_service_1.ProcessingRunService();
        runService.tryAcquire();
        const useCase = { execute: jest.fn() };
        const scheduler = new scheduler_service_1.SchedulerService(config, useCase, runService, (0, pino_1.default)({ level: 'silent' }));
        await scheduler.trigger('test');
        expect(useCase.execute).not.toHaveBeenCalled();
        runService.release('cleanup', true);
    });
});
