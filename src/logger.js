"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.redactSecretsInText = redactSecretsInText;
const pino_1 = __importDefault(require("pino"));
const redactPaths = [
    'password',
    'sifre',
    'username',
    'institutionCode',
    'authorization',
    'cookie',
    'accountNumber',
    'customerNumber',
    'clientNumber',
    'senderIban',
    'iban',
    'req.headers.authorization',
    'req.headers.cookie',
    'soapRequest',
    'db.password',
];
function createLogger(level = process.env.LOG_LEVEL ?? 'info') {
    return (0, pino_1.default)({
        level,
        redact: {
            paths: redactPaths,
            censor: '[REDACTED]',
        },
        formatters: {
            level(label) {
                return { level: label };
            },
        },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
    });
}
function redactSecretsInText(text) {
    return text
        .replace(/("password"\s*:\s*")[^"]+"/gi, '$1[REDACTED]"')
        .replace(/("sifre"\s*:\s*")[^"]+"/gi, '$1[REDACTED]"');
}
