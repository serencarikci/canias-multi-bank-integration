"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRequestParams = buildRequestParams;
exports.buildSoapEnvelope = buildSoapEnvelope;
const soapXml_1 = require("../common/soapXml");
const parsers_1 = require("../../domain/parsers");
function buildRequestParams(bank, account, query, timezone) {
    return {
        customerNumber: account.customerNumber,
        additionalNumber: account.additionalNumber,
        startDateTime: (0, parsers_1.formatSoapDateTime)(query.start, timezone),
        endDateTime: (0, parsers_1.formatSoapDateTime)(query.end, timezone),
        institutionCode: bank.institutionCode,
        password: bank.password,
        iptalFisGetir: bank.iptalFisGetir ?? 'H',
    };
}
function buildSoapEnvelope(params) {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:SorgulaHesapHareketZamanIle>
      <tem:musteriNo>${(0, soapXml_1.escapeXml)(params.customerNumber)}</tem:musteriNo>
      <tem:ekNo>${(0, soapXml_1.escapeXml)(params.additionalNumber)}</tem:ekNo>
      <tem:baslangicZamani>${(0, soapXml_1.escapeXml)(params.startDateTime)}</tem:baslangicZamani>
      <tem:bitisZamani>${(0, soapXml_1.escapeXml)(params.endDateTime)}</tem:bitisZamani>
      <tem:kurumKod>${(0, soapXml_1.escapeXml)(params.institutionCode)}</tem:kurumKod>
      <tem:sifre>${(0, soapXml_1.escapeXml)(params.password)}</tem:sifre>
      <tem:iptalFisGetir>${(0, soapXml_1.escapeXml)(params.iptalFisGetir)}</tem:iptalFisGetir>
    </tem:SorgulaHesapHareketZamanIle>
  </soap:Body>
</soap:Envelope>`;
}
