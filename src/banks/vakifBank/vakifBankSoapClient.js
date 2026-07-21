"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VakifBankSoapClient = void 0;
const vakifBankRequestBuilder_1 = require("./vakifBankRequestBuilder");
const vakifBankResponseParser_1 = require("./vakifBankResponseParser");
const soapHttpClient_1 = require("../common/soapHttpClient");
const soapXml_1 = require("../common/soapXml");
const application_errors_1 = require("../../domain/applicationErrors");
class VakifBankSoapClient {
    constructor(appConfig) {
        this.appConfig = appConfig;
        this.bankName = 'VAKIFBANK';
        this.http = new soapHttpClient_1.SoapHttpClient(appConfig);
    }
    async fetchMovements(account, query, context) {
        if (account.bankType !== 'VAKIFBANK') {
            throw new Error('Invalid account type for VakifBankSoapClient');
        }
        const bank = account.bankConfig;
        const body = (0, vakifBankRequestBuilder_1.buildSoapEnvelope)(bank, account, query, this.appConfig.timezone);
        context.logger.debug({ soapRequest: (0, soapXml_1.sanitizeXmlForLog)(body) }, 'VakifBank SOAP request prepared');
        const xml = await this.http.postSoap({
            url: bank.endpoint,
            soapAction: bank.soapAction ?? vakifBankRequestBuilder_1.defaultSoapAction,
            body,
            bank: this.bankName,
            correlationId: context.correlationId,
        });
        let parsed;
        try {
            parsed = (0, soapXml_1.parseXmlDocument)(xml);
        }
        catch (error) {
            throw new application_errors_1.SoapParseError('Failed to parse VakifBank SOAP response', context.correlationId, error);
        }
        const fault = (0, soapXml_1.extractSoapFault)(parsed);
        if (fault) {
            throw new application_errors_1.SoapFaultError(fault.message ?? 'VakifBank SOAP fault', context.correlationId);
        }
        return (0, vakifBankResponseParser_1.extractMovements)(parsed, account, new Date());
    }
}
exports.VakifBankSoapClient = VakifBankSoapClient;
