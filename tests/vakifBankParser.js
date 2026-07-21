"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const vakifBankResponseParser_1 = require("../src/banks/vakifBank/vakifBankResponseParser");
const soapXml_1 = require("../src/banks/common/soapXml");
const fixture = (name) => node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'testFixtures', name), 'utf8');
describe('Vakifbank response parser', () => {
    const account = {
        networkId: '033',
        accountNumber: '1111222233333',
        clientNumber: '1234567',
    };
    it('parses multiple movements', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('vakifBankSuccess.xml'));
        const movements = (0, vakifBankResponseParser_1.extractMovements)(parsed, account, new Date('2026-07-21T08:00:00Z'));
        expect(movements).toHaveLength(2);
        expect(movements[0].senderIban).toBe('TR120001001234567890123456');
        expect(movements[0].bankName).toBe('VAKIFBANK');
    });
    it('returns empty list for empty response', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('vakifBankEmpty.xml'));
        const movements = (0, vakifBankResponseParser_1.extractMovements)(parsed, account, new Date());
        expect(movements).toEqual([]);
    });
    it('detects SOAP fault', () => {
        const parsed = (0, soapXml_1.parseXmlDocument)(fixture('vakifBankFault.xml'));
        const fault = (0, soapXml_1.extractSoapFault)(parsed);
        expect(fault?.message).toContain('Authentication');
    });
    it('handles malformed xml via parser', () => {
        expect(() => (0, soapXml_1.parseXmlDocument)(fixture('malformed.xml'))).toThrow();
    });
});
