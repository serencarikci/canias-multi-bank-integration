"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_bank_movement_repository_1 = require("../src/mssqlBankMovementRepository");
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
const runIntegration = process.env.RUN_DB_INTEGRATION === 'true';
(runIntegration ? describe : describe.skip)('MssqlBankMovementRepository integration', () => {
    let repository;
    beforeAll(async () => {
        const config = (0, load_config_1.loadAppConfig)({
            ...process.env,
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
        });
        repository = new mssql_bank_movement_repository_1.MssqlBankMovementRepository(config);
        await repository.connect();
    });
    afterAll(async () => {
        await repository.close();
    });
    it('inserts and detects duplicate', async () => {
        const movement = {
            transactionNumber: `INT-${Date.now()}`,
            transactionDateTime: new Date(),
            amount: 42.15,
            debitCredit: 'A',
            description: 'integration',
            senderIban: null,
            accountNumber: 'ACC-INT',
            clientNumber: null,
            networkId: '033',
            bankName: 'ZIRAAT',
            processedAt: new Date(),
        };
        expect(await repository.insertMovement(movement)).toBe('inserted');
        expect(await repository.insertMovement(movement)).toBe('duplicate');
    });
});
if (!runIntegration) {
    test('integration tests skipped without RUN_DB_INTEGRATION=true', () => {
        expect(true).toBe(true);
    });
}
