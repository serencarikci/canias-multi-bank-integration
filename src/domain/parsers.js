"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankNames = void 0;
exports.normalizeWhitespace = normalizeWhitespace;
exports.emptyToNull = emptyToNull;
exports.normalizeIban = normalizeIban;
exports.maskIban = maskIban;
exports.maskAccount = maskAccount;
exports.movementPreviewDto = movementPreviewDto;
exports.parseDecimalAmount = parseDecimalAmount;
exports.parseBankDate = parseBankDate;
exports.normalizeDebitCredit = normalizeDebitCredit;
exports.isValidMovementShape = isValidMovementShape;
exports.formatSoapDateTime = formatSoapDateTime;
const luxon_1 = require("luxon");
const decimal_js_1 = __importDefault(require("decimal.js"));
const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
function normalizeWhitespace(value) {
    return value.trim().replace(/\s+/g, ' ');
}
function emptyToNull(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}
function normalizeIban(value) {
    const raw = emptyToNull(value);
    if (!raw) {
        return null;
    }
    const compact = raw.replace(/\s/g, '').toUpperCase();
    return compact.length > 0 ? compact : null;
}
function maskIban(iban) {
    if (!iban) {
        return null;
    }
    const normalized = normalizeIban(iban);
    if (!normalized || normalized.length < 8) {
        return '****';
    }
    const prefix = normalized.slice(0, 4);
    const suffix = normalized.slice(-4);
    const maskedMiddle = '*'.repeat(Math.max(0, normalized.length - 8));
    return `${prefix}${maskedMiddle}${suffix}`;
}
function maskAccount(value) {
    if (!value) {
        return '****';
    }
    const trimmed = value.trim();
    if (trimmed.length <= 4) {
        return '****';
    }
    return `${'*'.repeat(Math.max(4, trimmed.length - 4))}${trimmed.slice(-4)}`;
}
function movementPreviewDto(movement) {
    return {
        transactionNumber: movement.transactionNumber,
        transactionDateTime: movement.transactionDateTime,
        amount: movement.amount,
        debitCredit: movement.debitCredit,
        description: movement.description ? movement.description.slice(0, 120) : null,
        senderIban: maskIban(movement.senderIban),
        networkId: movement.networkId,
        bankName: movement.bankName,
    };
}
function parseDecimalAmount(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    let str = String(value).trim();
    if (str.includes(',') && str.includes('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
    }
    else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    try {
        const dec = new decimal_js_1.default(str);
        if (!dec.isFinite()) {
            return null;
        }
        return dec.toNumber();
    }
    catch {
        return null;
    }
}
function parseBankDate(value, timezone = 'Europe/Istanbul') {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return new Date(value.getTime());
    }
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const str = String(value).trim();
    const formats = [
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd',
        'dd.MM.yyyy HH:mm:ss',
        'dd.MM.yyyy',
    ];
    for (const fmt of formats) {
        const dt = luxon_1.DateTime.fromFormat(str, fmt, { zone: timezone });
        if (dt.isValid) {
            return dt.toUTC().toJSDate();
        }
    }
    const iso = luxon_1.DateTime.fromISO(str, { setZone: true });
    if (iso.isValid) {
        return iso.toUTC().toJSDate();
    }
    const parsed = Date.parse(str);
    if (!Number.isNaN(parsed)) {
        return new Date(parsed);
    }
    return null;
}
function normalizeDebitCredit(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const v = String(value).trim().toUpperCase();
    if (v === 'A' || v === 'ALACAK' || v === 'C' || v === 'CREDIT') {
        return 'A';
    }
    if (v === 'B' || v === 'BORC' || v === 'DEBIT' || v === 'D') {
        return 'B';
    }
    return null;
}
function isValidMovementShape(movement) {
    const errors = [];
    if (!movement.transactionNumber?.trim()) {
        errors.push('transactionNumber is required');
    }
    if (!movement.transactionDateTime || Number.isNaN(movement.transactionDateTime.getTime())) {
        errors.push('transactionDateTime is invalid');
    }
    if (movement.amount === undefined || !Number.isFinite(movement.amount) || Number.isNaN(movement.amount)) {
        errors.push('amount must be a finite number');
    }
    if (movement.debitCredit !== 'A' && movement.debitCredit !== 'B') {
        errors.push('debitCredit must be A or B');
    }
    if (!movement.accountNumber?.trim()) {
        errors.push('accountNumber is required');
    }
    if (!movement.networkId?.trim()) {
        errors.push('networkId is required');
    }
    if (movement.bankName !== 'VAKIFBANK' && movement.bankName !== 'ZIRAAT') {
        errors.push('bankName is unsupported');
    }
    if (movement.senderIban) {
        const iban = normalizeIban(movement.senderIban);
        if (iban && !ibanRegex.test(iban)) {
            errors.push('senderIban format is invalid');
        }
    }
    return errors;
}
function formatSoapDateTime(date, timezone) {
    return luxon_1.DateTime.fromJSDate(date, { zone: 'utc' }).setZone(timezone).toFormat("yyyy-MM-dd'T'HH:mm:ss");
}
exports.bankNames = ['VAKIFBANK', 'ZIRAAT'];
