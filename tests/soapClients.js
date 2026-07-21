"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parsers_1 = require("../src/domain/parsers");
const soapHttpClient_1 = require("../src/banks/common/soapHttpClient");
const axios_1 = __importDefault(require("axios"));
const ziraatSoapClient_1 = require("../src/banks/ziraat/ziraatSoapClient");
const vakifBankSoapClient_1 = require("../src/banks/vakifBank/vakifBankSoapClient");
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('parsers extended', () => {
    it('validates movement shape errors', () => {
        const errors = (0, parsers_1.isValidMovementShape)({
            transactionNumber: '',
            transactionDateTime: new Date('invalid'),
            amount: NaN,
            debitCredit: 'X',
            accountNumber: '',
            networkId: '',
            bankName: 'OTHER',
        });
        expect(errors.length).toBeGreaterThan(3);
    });
    it('parses multiple date formats', () => {
        expect((0, parsers_1.parseBankDate)('21.07.2026 10:00:00')).toBeInstanceOf(Date);
        expect((0, parsers_1.parseBankDate)('2026-07-21')).toBeInstanceOf(Date);
    });
    it('formats soap datetime in timezone', () => {
        const formatted = (0, parsers_1.formatSoapDateTime)(new Date('2026-07-21T00:00:00Z'), 'Europe/Istanbul');
        expect(formatted).toMatch(/2026-07-21T/);
    });
    it('normalizes iban null cases', () => {
        expect((0, parsers_1.normalizeIban)('   ')).toBeNull();
    });
});
describe('SoapHttpClient', () => {
    it('returns SOAP body on success', async () => {
        mockedAxios.create.mockReturnValue({
            post: jest.fn().mockResolvedValue({ status: 200, data: '<xml/>' }),
        });
        const client = new soapHttpClient_1.SoapHttpClient({
            bankHttpTimeoutMs: 1000,
            bankHttpMaxRetries: 0,
            bankHttpRetryDelayMs: 1,
            bankHttpMaxResponseBytes: 10000,
        });
        const body = await client.postSoap({
            url: 'https://bank.test',
            body: '<a/>',
            bank: 'ZIRAAT',
            correlationId: 'c1',
        });
        expect(body).toBe('<xml/>');
    });
});
describe('SOAP bank clients with mocked HTTP', () => {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
    });
    const ziraatAccount = config.enabledAccounts.find((a) => a.bankType === 'ZIRAAT');
    const vakifAccount = config.enabledAccounts.find((a) => a.bankType === 'VAKIFBANK');
    it('fetches ziraat movements from fixture xml', async () => {
        const xml = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'testFixtures/ziraatSuccess.xml'), 'utf8');
        mockedAxios.create.mockReturnValue({
            post: jest.fn().mockResolvedValue({ status: 200, data: xml }),
        });
        const client = new ziraatSoapClient_1.ZiraatSoapClient(config);
        const movements = await client.fetchMovements(ziraatAccount, { start: new Date(), end: new Date() }, { correlationId: 'c', runId: 'r', logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), child: () => ({}) } });
        expect(movements.length).toBeGreaterThan(0);
    });
    it('fetches vakifbank movements from fixture xml', async () => {
        const xml = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'testFixtures/vakifBankSuccess.xml'), 'utf8');
        mockedAxios.create.mockReturnValue({
            post: jest.fn().mockResolvedValue({ status: 200, data: xml }),
        });
        const client = new vakifBankSoapClient_1.VakifBankSoapClient(config);
        const movements = await client.fetchMovements(vakifAccount, { start: new Date(), end: new Date() }, { correlationId: 'c', runId: 'r', logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), child: () => ({}) } });
        expect(movements.length).toBeGreaterThan(0);
    });
});
