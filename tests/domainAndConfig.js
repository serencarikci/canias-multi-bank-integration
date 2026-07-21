"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parsers_1 = require("../src/domain/parsers");
const banks_1 = require("../src/banks");
const application_errors_1 = require("../src/domain/applicationErrors");
const processing_run_service_1 = require("../src/application/processingRunService");
const load_config_1 = require("../config/loadConfig");
const logger_1 = require("../src/logger");
const node_path_1 = __importDefault(require("node:path"));
describe('domain parsers', () => {
    it('parses decimal comma and dot formats', () => {
        expect((0, parsers_1.parseDecimalAmount)('1.234,56')).toBeCloseTo(1234.56);
        expect((0, parsers_1.parseDecimalAmount)('10,5')).toBeCloseTo(10.5);
    });
    it('parses bank dates', () => {
        const d = (0, parsers_1.parseBankDate)('2026-07-21T10:15:00');
        expect(d).toBeInstanceOf(Date);
    });
    it('normalizes iban and masks', () => {
        const iban = (0, parsers_1.normalizeIban)(' tr12 0001 0012 3456 7890 1234 56 ');
        expect(iban).toBe('TR120001001234567890123456');
        expect((0, parsers_1.maskIban)(iban)).toMatch(/^TR12\*+3456$/);
    });
    it('masks account numbers', () => {
        expect((0, parsers_1.maskAccount)('1234567890')).toMatch(/7890$/);
    });
    it('normalizes debit credit', () => {
        expect((0, parsers_1.normalizeDebitCredit)('A')).toBe('A');
        expect((0, parsers_1.normalizeDebitCredit)('borc')).toBe('B');
    });
});
describe('movement filter', () => {
    const movement = {
        transactionNumber: '1',
        transactionDateTime: new Date(),
        amount: 10,
        debitCredit: 'B',
        description: null,
        senderIban: null,
        accountNumber: '1',
        clientNumber: null,
        networkId: '033',
        bankName: 'ZIRAAT',
        processedAt: new Date(),
    };
    it('filters credit only by default', () => {
        const loader = new banks_1.MovementLoader({ movementFilterCreditOnly: true }, {});
        expect(loader.shouldPersist({ ...movement, debitCredit: 'A', amount: 5 })).toBe(true);
        expect(loader.shouldPersist(movement)).toBe(false);
    });
    it('allows debit when disabled', () => {
        const loader = new banks_1.MovementLoader({ movementFilterCreditOnly: false }, {});
        expect(loader.shouldPersist(movement)).toBe(true);
    });
});
describe('duplicate classification', () => {
    it('detects mssql duplicate errors', () => {
        expect((0, application_errors_1.isMssqlDuplicateKeyError)({ number: 2601 })).toBe(true);
        expect((0, application_errors_1.isMssqlDuplicateKeyError)({ number: 2627 })).toBe(true);
        expect((0, application_errors_1.isMssqlDuplicateKeyError)({ number: 500 })).toBe(false);
    });
});
describe('concurrent execution lock', () => {
    it('prevents double acquire', () => {
        const service = new processing_run_service_1.ProcessingRunService();
        expect(service.tryAcquire()).toBe(true);
        expect(service.tryAcquire()).toBe(false);
        service.release('done', true);
        expect(service.tryAcquire()).toBe(true);
    });
});
describe('configuration validation', () => {
    it('loads test bank config', () => {
        const config = (0, load_config_1.loadAppConfig)({
            ...process.env,
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
        });
        expect(config.enabledAccounts.length).toBeGreaterThan(0);
    });
});
describe('secret redaction', () => {
    it('redacts password fields in text', () => {
        const text = (0, logger_1.redactSecretsInText)('{"password":"secret-value"}');
        expect(text).not.toContain('secret-value');
    });
});
