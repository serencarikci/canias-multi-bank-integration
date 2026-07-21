"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vakifBankResponseParser_1 = require("../src/banks/vakifBank/vakifBankResponseParser");
const process_bank_movements_use_case_1 = require("../src/application/processBankMovementsUseCase");
const pino_1 = __importDefault(require("pino"));
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
const processing_run_service_1 = require("../src/application/processingRunService");
describe('additional branch coverage', () => {
    it('maps vakifbank iban fallback field', () => {
        const movement = (0, vakifBankResponseParser_1.mapMovement)({
            IslemNo: '1',
            IslemTarihZamani: '2026-07-21T10:00:00',
            Tutar: '10',
            BorcAlacak: 'A',
            Detaylar: { GonderenIbanNumarasi: 'TR120001001234567890123456' },
        }, { networkId: '033', accountNumber: '1', clientNumber: '2' }, new Date());
        expect(movement?.senderIban).toBe('TR120001001234567890123456');
    });
    it('uses explicit override window', () => {
        const start = new Date('2026-01-01T00:00:00Z');
        const end = new Date('2026-01-02T00:00:00Z');
        const window = (0, process_bank_movements_use_case_1.calculateQueryWindow)({ dataExtractionDurationMinutes: 60, queryOverlapMinutes: 0, timezone: 'UTC' }, { start, end });
        expect(window.start.toISOString()).toBe(start.toISOString());
    });
    it('partial when bank integration throws', async () => {
        const config = (0, load_config_1.loadAppConfig)({
            ...process.env,
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
        });
        const useCase = new process_bank_movements_use_case_1.ProcessBankMovementsUseCase(config, {
            getSync: () => {
                throw new Error('factory failure');
            },
        }, new processing_run_service_1.ProcessingRunService(), (0, pino_1.default)({ level: 'silent' }));
        const summary = await useCase.execute({ bank: 'ZIRAAT' });
        expect(summary.status).toBe('partial');
    });
});
