"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZiraatExtractor = void 0;
const ziraatSoapClient_1 = require("./ziraatSoapClient");
const soapXml_1 = require("../common/soapXml");
const ziraatResponseParser_1 = require("./ziraatResponseParser");
class ZiraatExtractor {
    constructor(appConfig) {
        this.bankType = 'ZIRAAT';
        this.soapClient = new ziraatSoapClient_1.ZiraatSoapClient(appConfig);
    }
    async extract(account, window, context) {
        if (account.bankType !== 'ZIRAAT') {
            throw new Error('ZiraatExtractor supports ZIRAAT accounts only');
        }
        return this.soapClient.fetchMovements(account, window, context);
    }
    parseDocument(xml, account, correlationId) {
        if (account.bankType !== 'ZIRAAT') {
            throw new Error('ZiraatExtractor supports ZIRAAT accounts only');
        }
        const parsed = (0, soapXml_1.parseXmlDocument)(xml);
        return (0, ziraatResponseParser_1.parseResponse)(parsed, account, correlationId);
    }
}
exports.ZiraatExtractor = ZiraatExtractor;
