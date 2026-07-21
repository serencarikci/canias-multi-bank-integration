"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSoapAction = exports.buildSoapEnvelope = void 0;
exports.buildSoapEnvelope = buildSoapEnvelope;
const soapXml_1 = require("../common/soapXml");
const parsers_1 = require("../../domain/parsers");
function buildSoapEnvelope(bank, account, query, timezone) {
    const start = (0, parsers_1.formatSoapDateTime)(query.start, timezone);
    const end = (0, parsers_1.formatSoapDateTime)(query.end, timezone);
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tem:GetirHareket>
      <tem:KullaniciAdi>${(0, soapXml_1.escapeXml)(bank.username)}</tem:KullaniciAdi>
      <tem:Sifre>${(0, soapXml_1.escapeXml)(bank.password)}</tem:Sifre>
      <tem:HesapNo>${(0, soapXml_1.escapeXml)(account.accountNumber)}</tem:HesapNo>
      <tem:MusteriNo>${(0, soapXml_1.escapeXml)(account.clientNumber ?? '')}</tem:MusteriNo>
      <tem:BaslangicTarihi>${(0, soapXml_1.escapeXml)(start)}</tem:BaslangicTarihi>
      <tem:BitisTarihi>${(0, soapXml_1.escapeXml)(end)}</tem:BitisTarihi>
    </tem:GetirHareket>
  </soap:Body>
</soap:Envelope>`;
}
exports.defaultSoapAction = 'http://tempuri.org/GetirHareket';
