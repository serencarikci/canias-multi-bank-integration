"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const soapXml_1 = require("../src/banks/common/soapXml");
const vakifBankRequestBuilder_1 = require("../src/banks/vakifBank/vakifBankRequestBuilder");
const banks_1 = require("../src/banks");
const process_bank_movements_use_case_1 = require("../src/application/processBankMovementsUseCase");
const application_errors_1 = require("../src/domain/applicationErrors");
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
const error_middleware_1 = require("../src/http/middleware/errorMiddleware");
const application_errors_2 = require("../src/domain/applicationErrors");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
describe('soapXml helpers', () => {
    it('escapes xml characters', () => {
        expect((0, soapXml_1.escapeXml)(`a&b<c>"'`)).toBe('a&amp;b&lt;c&gt;&quot;&apos;');
    });
    it('normalizes arrays', () => {
        expect((0, soapXml_1.asArray)(undefined)).toEqual([]);
        expect((0, soapXml_1.asArray)('x')).toEqual(['x']);
        expect((0, soapXml_1.asArray)(['a', 'b'])).toEqual(['a', 'b']);
    });
    it('finds nested keys', () => {
        expect((0, soapXml_1.findFirstKey)({ a: { b: { c: 1 } } }, ['c'])).toBe(1);
    });
    it('extracts soap body and fault', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(`<?xml version="1.0"?><Envelope><Body><Fault><faultstring>Err</faultstring></Fault></Body></Envelope>`);
        expect((0, soapXml_1.extractSoapBody)(parsed)).toBeTruthy();
        expect((0, soapXml_1.extractSoapFault)(parsed)?.message).toContain('Err');
    });
    it('sanitizes soap log output', () => {
        const sanitized = (0, soapXml_1.sanitizeXmlForLog)('<sifre>secret</sifre><password>x</password>');
        expect(sanitized).not.toContain('secret');
    });
    it('rejects non-xml input', () => {
        expect(() => (0, soapXml_1.parseXmlDocument)('plain')).toThrow();
    });
});
describe('vakifbank request builder', () => {
    it('builds envelope', () => {
        const xml = (0, vakifBankRequestBuilder_1.buildSoapEnvelope)({
            type: 'VAKIFBANK',
            enabled: true,
            endpoint: 'https://example.com',
            username: 'user',
            password: 'pass',
            accounts: [],
        }, { networkId: '033', accountNumber: '123', clientNumber: '456' }, { start: new Date('2026-07-21T00:00:00Z'), end: new Date('2026-07-21T01:00:00Z') }, 'Europe/Istanbul');
        expect(xml).toContain('GetirHareket');
        expect(xml).toContain('user');
    });
});
describe('BankRegistry', () => {
    it('returns extractors for supported banks', () => {
        const config = (0, load_config_1.loadAppConfig)({
            ...process.env,
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
        });
        const repo = { insertMovement: async () => 'inserted', listMovements: async () => ({ items: [], total: 0, page: 1, pageSize: 50 }), healthCheck: async () => { } };
        const registry = new banks_1.BankRegistry(config, repo);
        expect(registry.getExtractor('ZIRAAT').bankType).toBe('ZIRAAT');
        expect(registry.getExtractor('VAKIFBANK').bankType).toBe('VAKIFBANK');
    });
});
describe('query window helpers', () => {
    it('calculates default window', () => {
        const window = (0, process_bank_movements_use_case_1.calculateQueryWindow)({
            dataExtractionDurationMinutes: 60,
            queryOverlapMinutes: 5,
            timezone: 'Europe/Istanbul',
        });
        expect(window.end.getTime()).toBeGreaterThan(window.start.getTime());
    });
    it('validates manual range', () => {
        const start = new Date('2026-01-01T00:00:00Z');
        const end = new Date('2026-01-01T01:00:00Z');
        expect((0, process_bank_movements_use_case_1.validateManualQueryRange)(start, end, 24).valid).toBe(true);
        expect((0, process_bank_movements_use_case_1.validateManualQueryRange)(end, start, 24).valid).toBe(false);
    });
});
describe('configuration errors', () => {
    it('fails when env placeholder missing', () => {
        expect(() => (0, load_config_1.loadAppConfig)({
            NODE_ENV: 'test',
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
            DB_HOST: 'localhost',
            DB_NAME: 'db',
            DB_USER: 'sa',
            DB_PASSWORD: 'pwd',
            ZIRAAT_INSTITUTION_CODE: '',
        })).not.toThrow();
    });
    it('throws for missing bank config file', () => {
        expect(() => (0, load_config_1.loadAppConfig)({
            BANK_CONFIG_PATH: '/does/not/exist.json',
            DB_HOST: 'x',
            DB_NAME: 'x',
            DB_USER: 'x',
            DB_PASSWORD: 'x',
        })).toThrow(application_errors_1.ConfigurationError);
    });
});
describe('error middleware', () => {
    it('returns structured validation errors', async () => {
        const config = (0, load_config_1.loadAppConfig)({
            ...process.env,
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
        });
        const app = (0, express_1.default)();
        app.use(error_middleware_1.correlationIdMiddleware);
        app.get('/boom', () => {
            throw new application_errors_2.ValidationError('bad', [], 'cid-1');
        });
        app.use((0, error_middleware_1.errorHandler)(config));
        const res = await (0, supertest_1.default)(app).get('/boom');
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});
