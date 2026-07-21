"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZiraatSoapClient = exports.ziraatSoapAction = exports.ziraatDefaultEndpoint = void 0;
const soapHttpClient_1 = require("../common/soapHttpClient");
const soapXml_1 = require("../common/soapXml");
const application_errors_1 = require("../../domain/applicationErrors");
const ziraatRequestBuilder_1 = require("./ziraatRequestBuilder");
const ziraatResponseParser_1 = require("./ziraatResponseParser");
exports.ziraatDefaultEndpoint = 'https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx';
exports.ziraatSoapAction = 'http://tempuri.org/SorgulaHesapHareketZamanIle';
class ZiraatSoapClient {
    constructor(appConfig) {
        this.appConfig = appConfig;
        this.bankName = 'ZIRAAT';
        this.http = new soapHttpClient_1.SoapHttpClient(appConfig);
    }
    async fetchMovements(account, query, context) {
        if (account.bankType !== 'ZIRAAT') {
            throw new Error('Invalid account type for ZiraatSoapClient');
        }
        const params = (0, ziraatRequestBuilder_1.buildRequestParams)(account.bankConfig, account, query, this.appConfig.timezone);
        const body = (0, ziraatRequestBuilder_1.buildSoapEnvelope)(params);
        context.logger.debug({ soapRequest: (0, soapXml_1.sanitizeXmlForLog)(body) }, 'Ziraat SOAP request prepared');
        const xml = await this.http.postSoap({
            url: account.bankConfig.endpoint,
            soapAction: exports.ziraatSoapAction,
            body,
            bank: this.bankName,
            correlationId: context.correlationId,
        });
        let parsed;
        try {
            parsed = (0, soapXml_1.parseXmlDocument)(xml);
        }
        catch (error) {
            throw new application_errors_1.SoapParseError('Failed to parse Ziraat SOAP response', context.correlationId, error);
        }
        const fault = (0, soapXml_1.extractSoapFault)(parsed);
        if (fault) {
            throw new application_errors_1.SoapFaultError(fault.message ?? 'Ziraat SOAP Fault', context.correlationId);
        }
        return (0, ziraatResponseParser_1.parseResponse)(parsed, account, context.correlationId);
    }
}
exports.ZiraatSoapClient = ZiraatSoapClient;
