"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_bank_movements_use_case_1 = require("../src/application/processBankMovementsUseCase");
const processing_run_service_1 = require("../src/application/processingRunService");
const pino_1 = __importDefault(require("pino"));
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
function metrics(bank, account, overrides = {}) {
    return {
        bank,
        networkId: account.networkId,
        received: 0,
        valid: 0,
        filtered: 0,
        inserted: 0,
        duplicates: 0,
        failed: 0,
        ...overrides,
    };
}
describe('ProcessBankMovementsUseCase', () => {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
    });
    const logger = (0, pino_1.default)({ level: 'silent' });
    const createUseCase = (handler) => {
        const factory = {
            getSync: (bankType) => ({
                bankName: bankType,
                syncAccount: (account, _window, _ctx) => handler(bankType, account),
            }),
        };
        return new process_bank_movements_use_case_1.ProcessBankMovementsUseCase(config, factory, new processing_run_service_1.ProcessingRunService(), logger);
    };
    it('summarizes insert metrics from bank sync', async () => {
        const useCase = createUseCase(async (bank, account) => metrics(bank, account, { received: 2, valid: 2, inserted: 2 }));
        const summary = await useCase.execute({ bank: 'ZIRAAT' });
        expect(summary.banks[0].inserted).toBe(2);
    });
    it('marks run as partial when an account fails', async () => {
        const useCase = createUseCase(async (bank, account) => {
            if (bank === 'ZIRAAT') {
                return metrics(bank, account, { failed: 1 });
            }
            return metrics(bank, account, { inserted: 1, received: 1, valid: 1 });
        });
        const summary = await useCase.execute();
        expect(summary.status).toBe('partial');
    });
    it('blocks concurrent execution', async () => {
        const runService = new processing_run_service_1.ProcessingRunService();
        runService.tryAcquire();
        const useCase = new process_bank_movements_use_case_1.ProcessBankMovementsUseCase(config, { getSync: () => ({}) }, runService, logger);
        await expect(useCase.execute({ bank: 'ZIRAAT' })).rejects.toThrow('Processing already in progress');
        runService.release('cleanup', true);
    });
});
