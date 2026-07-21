"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretResponseCode = interpretResponseCode;
exports.resolveTransactionNumber = resolveTransactionNumber;
exports.mapMovement = mapMovement;
exports.parseResponse = parseResponse;
const parsers_1 = require("../../domain/parsers");
const application_errors_1 = require("../../domain/applicationErrors");
const soapXml_1 = require("../common/soapXml");
const successCodes = new Set(['00', '06']);
function interpretResponseCode(code, correlationId) {
    if (code === '06') {
        return { empty: true };
    }
    if (code === '12') {
        return {
            empty: false,
            error: new application_errors_1.BankIntegrationError('Ziraat record limit exceeded; reduce time range', {
                bankCode: code,
                recoverable: true,
                correlationId,
            }),
        };
    }
    if (!successCodes.has(code)) {
        const messages = {
            '01': 'Customer number missing',
            '02': 'Additional number missing',
            '05': 'Institution code missing',
            '07': 'Account not configured',
            '08': 'Password missing',
            '09': 'Username/password validation failure',
            '10': 'Start and end times cannot be equal',
            '11': 'Account information not found',
        };
        return {
            empty: false,
            error: new application_errors_1.BankIntegrationError(messages[code] ?? `Ziraat error code ${code}`, {
                bankCode: code,
                recoverable: false,
                correlationId,
            }),
        };
    }
    return { empty: false };
}
function resolveTransactionNumber(raw) {
    const timeStamp = (0, parsers_1.emptyToNull)(String(raw.timeStamp ?? raw.TimeStamp ?? ''));
    if (timeStamp) {
        return timeStamp;
    }
    const dekontNo = (0, parsers_1.emptyToNull)(String(raw.dekontNo ?? raw.DekontNo ?? ''));
    if (dekontNo) {
        return dekontNo;
    }
    const muhref = (0, parsers_1.emptyToNull)(String(raw.muhref ?? raw.Muhref ?? ''));
    return muhref;
}
function mapMovement(raw, account, responseAccountNumber, processedAt) {
    const transactionNumber = resolveTransactionNumber(raw);
    if (!transactionNumber) {
        return null;
    }
    const transactionDateTime = (0, parsers_1.parseBankDate)(raw.islemTarihi ?? raw.IslemTarihi);
    const amount = (0, parsers_1.parseDecimalAmount)(raw.tutar ?? raw.Tutar);
    const debitCredit = (0, parsers_1.normalizeDebitCredit)(raw.borcAlacak ?? raw.BorcAlacak);
    const description = (0, parsers_1.emptyToNull)(String(raw.aciklama ?? raw.Aciklama ?? '')) ??
        (0, parsers_1.emptyToNull)(String(raw.islemAciklama ?? raw.IslemAciklama ?? ''));
    if (!transactionDateTime || amount === null || !debitCredit) {
        return null;
    }
    const accountNumber = (0, parsers_1.emptyToNull)(responseAccountNumber ?? '') ?? account.accountNumber ?? account.customerNumber;
    return {
        transactionNumber,
        transactionDateTime,
        amount,
        debitCredit,
        description,
        senderIban: (0, parsers_1.emptyToNull)(String(raw.iban ?? raw.Iban ?? '')),
        accountNumber,
        clientNumber: account.customerNumber,
        networkId: account.networkId,
        bankName: 'ZIRAAT',
        processedAt,
    };
}
function parseResponse(parsed, account, correlationId) {
    if (!parsed || typeof parsed !== 'object') {
        throw new application_errors_1.BankIntegrationError('Empty Ziraat response', { correlationId });
    }
    const body = findBody(parsed);
    const response = body.SorgulaHesapHareketZamanIleResponse ??
        findKeyDeep(body, 'SorgulaHesapHareketZamanIleResponse');
    const result = response?.SorgulaHesapHareketZamanIleResult ??
        findKeyDeep(response, 'SorgulaHesapHareketZamanIleResult');
    if (!result || typeof result !== 'object') {
        throw new application_errors_1.BankIntegrationError('Missing Ziraat result node', { correlationId });
    }
    const record = result;
    const rawCode = String(record.hataKodu ?? record.HataKodu ?? '00').trim();
    const digits = rawCode.replace(/\D/g, '');
    const finalCode = digits.length === 0 ? '00' : digits.padStart(2, '0').slice(-2);
    const interpretation = interpretResponseCode(finalCode, correlationId);
    if (interpretation.error) {
        throw interpretation.error;
    }
    if (interpretation.empty) {
        return [];
    }
    const hesapNo = (0, parsers_1.emptyToNull)(String(record.hesapNo ?? record.HesapNo ?? ''));
    const hareketDetay = record.hareketdetay ?? record.HareketDetay ?? record.hareketDetay;
    const detailRecord = hareketDetay && typeof hareketDetay === 'object'
        ? hareketDetay
        : {};
    const hareketler = (0, soapXml_1.asArray)(detailRecord.HareketlerDetay ?? detailRecord.hareketlerDetay ?? detailRecord.Hareketler);
    const processedAt = new Date();
    const movements = [];
    for (const item of hareketler) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const mapped = mapMovement(item, account, hesapNo, processedAt);
        if (mapped) {
            movements.push(mapped);
        }
    }
    return movements;
}
function findBody(parsed) {
    const root = parsed;
    const envelope = (root.Envelope ?? root['soap:Envelope'] ?? root);
    return (envelope.Body ?? envelope['soap:Body'] ?? {});
}
function findKeyDeep(obj, key) {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }
    const record = obj;
    if (key in record) {
        return record[key];
    }
    for (const value of Object.values(record)) {
        const found = findKeyDeep(value, key);
        if (found !== undefined) {
            return found;
        }
    }
    return undefined;
}
