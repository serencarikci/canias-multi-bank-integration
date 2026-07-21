"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const ziraatRequestBuilder_1 = require("../src/banks/ziraat/ziraatRequestBuilder");
const ziraatResponseParser_1 = require("../src/banks/ziraat/ziraatResponseParser");
const soapXml_1 = require("../src/banks/common/soapXml");
const application_errors_1 = require("../src/domain/applicationErrors");
const fixture = (name) => node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'testFixtures', name), 'utf8');
describe('Ziraat request builder', () => {
    it('builds SOAP envelope with escaped credentials placeholders', () => {
        const xml = (0, ziraatRequestBuilder_1.buildSoapEnvelope)({
            customerNumber: '123',
            additionalNumber: '001',
            startDateTime: '2026-07-21T00:00:00',
            endDateTime: '2026-07-21T06:00:00',
            institutionCode: 'INST',
            password: 'secret&pass',
            iptalFisGetir: 'H',
        });
        expect(xml).toContain('<tem:iptalFisGetir>H</tem:iptalFisGetir>');
        expect(xml).toContain('secret&amp;pass');
        expect(xml).not.toContain('secret&pass');
    });
    it('formats request params from query window', () => {
        const params = (0, ziraatRequestBuilder_1.buildRequestParams)({
            type: 'ZIRAAT',
            enabled: true,
            endpoint: 'https://example.com',
            institutionCode: 'INST',
            password: 'pwd',
            iptalFisGetir: 'H',
            accounts: [],
        }, { networkId: '033', customerNumber: '1', additionalNumber: '2' }, { start: new Date('2026-07-21T00:00:00Z'), end: new Date('2026-07-21T06:00:00Z') }, 'Europe/Istanbul');
        expect(params.startDateTime).toMatch(/2026-07-21T/);
    });
});
describe('Ziraat response parser', () => {
    const account = { networkId: '033', customerNumber: '999', additionalNumber: '001' };
    it('parses success with multiple movements', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('ziraatSuccess.xml'));
        const movements = (0, ziraatResponseParser_1.parseResponse)(parsed, account, 'corr-1');
        expect(movements).toHaveLength(2);
        expect(movements[0].transactionNumber).toBe('ZR-TS-001');
        expect(movements[0].debitCredit).toBe('A');
        expect(movements[0].amount).toBeCloseTo(750.25);
    });
    it('treats code 06 as empty success', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('ziraatCode06.xml'));
        const movements = (0, ziraatResponseParser_1.parseResponse)(parsed, account, 'corr-2');
        expect(movements).toEqual([]);
    });
    it('throws on code 09', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('ziraatCode09.xml'));
        expect(() => (0, ziraatResponseParser_1.parseResponse)(parsed, account, 'corr-3')).toThrow(application_errors_1.BankIntegrationError);
    });
    it('throws recoverable error on code 12', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('ziraatCode12.xml'));
        try {
            (0, ziraatResponseParser_1.parseResponse)(parsed, account, 'corr-4');
            fail('expected error');
        }
        catch (error) {
            expect(error).toBeInstanceOf(application_errors_1.BankIntegrationError);
            expect(error.recoverable).toBe(true);
        }
    });
    it('supports namespace prefix variations', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('ziraatCode09.xml'));
        expect((0, soapXml_1.extractSoapFault)(parsed)).toBeNull();
    });
    it('resolves transaction id fallback order', () => {
        expect((0, ziraatResponseParser_1.resolveTransactionNumber)({ timeStamp: 'A' })).toBe('A');
        expect((0, ziraatResponseParser_1.resolveTransactionNumber)({ dekontNo: 'B' })).toBe('B');
        expect((0, ziraatResponseParser_1.resolveTransactionNumber)({ muhref: 'C' })).toBe('C');
        expect((0, ziraatResponseParser_1.resolveTransactionNumber)({})).toBeNull();
    });
    it('interprets response codes', () => {
        expect((0, ziraatResponseParser_1.interpretResponseCode)('06').empty).toBe(true);
        expect((0, ziraatResponseParser_1.interpretResponseCode)('00').empty).toBe(false);
        expect((0, ziraatResponseParser_1.interpretResponseCode)('09').error).toBeDefined();
    });
});
