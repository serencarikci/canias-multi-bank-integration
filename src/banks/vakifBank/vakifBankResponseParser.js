"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapMovement = mapMovement;
exports.extractMovements = extractMovements;
const parsers_1 = require("../../domain/parsers");
const soapXml_1 = require("../common/soapXml");
function pickSenderIban(detaylar) {
    if (!detaylar || typeof detaylar !== 'object') {
        return null;
    }
    const d = detaylar;
    const candidates = ['GonderenIbanKumarasi', 'GonderenIbanNumarasi', 'GonderenIban'];
    for (const key of candidates) {
        const val = (0, parsers_1.emptyToNull)(d[key]);
        if (val) {
            return val;
        }
    }
    return null;
}
function mapMovement(raw, account, processedAt) {
    const transactionNumber = (0, parsers_1.emptyToNull)(String(raw.IslemNo ?? ''));
    const transactionDateTime = (0, parsers_1.parseBankDate)(raw.IslemTarihZamani) ?? (0, parsers_1.parseBankDate)(raw.IslemTarihi);
    const amount = (0, parsers_1.parseDecimalAmount)(raw.Tutar);
    const debitCredit = (0, parsers_1.normalizeDebitCredit)(raw.BorcAlacak);
    const description = (0, parsers_1.emptyToNull)(String(raw.Aciklama ?? ''));
    if (!transactionNumber || !transactionDateTime || amount === null || !debitCredit) {
        return null;
    }
    const detaylar = raw.Detaylar;
    const senderIban = pickSenderIban(detaylar);
    return {
        transactionNumber,
        transactionDateTime,
        amount,
        debitCredit,
        description,
        senderIban,
        accountNumber: account.accountNumber,
        clientNumber: account.clientNumber ?? null,
        networkId: account.networkId,
        bankName: 'VAKIFBANK',
        processedAt,
    };
}
function extractMovements(parsed, account, processedAt) {
    if (!parsed || typeof parsed !== 'object') {
        return [];
    }
    const root = parsed;
    const envelope = (root.Envelope ?? root);
    const body = (envelope.Body ?? {});
    const response = body.GetirHareketResponse ??
        findNested(body, 'GetirHareketResponse') ??
        body;
    const result = response.GetirHareketResult ??
        findNested(response, 'GetirHareketResult');
    if (!result || typeof result !== 'object') {
        return [];
    }
    const hesaplar = result.Hesaplar;
    const hesapList = (0, soapXml_1.asArray)(hesaplar?.DtoEkstreHesap ?? hesaplar);
    const movements = [];
    for (const hesap of hesapList) {
        if (!hesap || typeof hesap !== 'object') {
            continue;
        }
        const hareketler = hesap.Hareketler;
        const hareketNodes = (0, soapXml_1.asArray)(hareketler?.DtoEkstreHareket ?? hareketler);
        for (const node of hareketNodes) {
            if (!node || typeof node !== 'object') {
                continue;
            }
            const mapped = mapMovement(node, account, processedAt);
            if (mapped) {
                movements.push(mapped);
            }
        }
    }
    return movements;
}
function findNested(obj, key) {
    if (!obj || typeof obj !== 'object') {
        return undefined;
    }
    const record = obj;
    if (key in record) {
        return record[key];
    }
    for (const value of Object.values(record)) {
        const found = findNested(value, key);
        if (found !== undefined) {
            return found;
        }
    }
    return undefined;
}
