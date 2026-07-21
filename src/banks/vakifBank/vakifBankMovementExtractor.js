"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VakifBankExtractor = void 0;
const vakifBankSoapClient_1 = require("./vakifBankSoapClient");
const soapXml_1 = require("../common/soapXml");
const vakifBankResponseParser_1 = require("./vakifBankResponseParser");
class VakifBankExtractor {
    constructor(appConfig) {
        this.bankType = 'VAKIFBANK';
        this.soapClient = new vakifBankSoapClient_1.VakifBankSoapClient(appConfig);
    }
    async extract(account, window, context) {
        if (account.bankType !== 'VAKIFBANK') {
            throw new Error('VakifBankExtractor supports VAKIFBANK accounts only');
        }
        return this.soapClient.fetchMovements(account, window, context);
    }
    parseDocument(xml, account) {
        if (account.bankType !== 'VAKIFBANK') {
            throw new Error('VakifBankExtractor supports VAKIFBANK accounts only');
        }
        const parsed = (0, soapXml_1.parseXmlDocument)(xml);
        return (0, vakifBankResponseParser_1.extractMovements)(parsed, account, new Date());
    }
}
exports.VakifBankExtractor = VakifBankExtractor;
