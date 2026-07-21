"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_bank_movement_repository_1 = require("../src/mssqlBankMovementRepository");
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
const application_errors_1 = require("../src/domain/applicationErrors");
jest.mock('mssql', () => {
    const request = jest.fn();
    return {
        ConnectionPool: jest.fn().mockImplementation(() => ({
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            request: () => ({
                input: jest.fn().mockReturnThis(),
                query: request,
            }),
        })),
        NVarChar: jest.fn(),
        DateTime2: jest.fn(),
        Decimal: jest.fn(),
        Char: jest.fn(),
        Int: jest.fn(),
        __mockQuery: request,
    };
});
describe('MssqlBankMovementRepository (mocked)', () => {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
    });
    it('inserts movement successfully', async () => {
        const mocked = jest.requireMock('mssql');
        mocked.__mockQuery.mockResolvedValueOnce({ recordset: [] });
        const repo = new mssql_bank_movement_repository_1.MssqlBankMovementRepository(config);
        await repo.connect();
        const result = await repo.insertMovement({
            transactionNumber: 'M1',
            transactionDateTime: new Date(),
            amount: 10,
            debitCredit: 'A',
            description: null,
            senderIban: null,
            accountNumber: 'A',
            clientNumber: null,
            networkId: '033',
            bankName: 'ZIRAAT',
            processedAt: new Date(),
        });
        expect(result).toBe('inserted');
        await repo.close();
    });
    it('classifies duplicate key on insert', async () => {
        const mocked = jest.requireMock('mssql');
        mocked.__mockQuery.mockRejectedValueOnce({ number: 2627 });
        const repo = new mssql_bank_movement_repository_1.MssqlBankMovementRepository(config);
        await repo.connect();
        const result = await repo.insertMovement({
            transactionNumber: 'M1',
            transactionDateTime: new Date(),
            amount: 10,
            debitCredit: 'A',
            description: null,
            senderIban: null,
            accountNumber: 'A',
            clientNumber: null,
            networkId: '033',
            bankName: 'ZIRAAT',
            processedAt: new Date(),
        });
        expect(result).toBe('duplicate');
        expect((0, application_errors_1.isMssqlDuplicateKeyError)({ number: 2627 })).toBe(true);
        await repo.close();
    });
});
