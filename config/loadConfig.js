"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfigSchema = void 0;
exports.loadBankConfigFile = loadBankConfigFile;
exports.flattenEnabledAccounts = flattenEnabledAccounts;
exports.loadAppConfig = loadAppConfig;
const zod_1 = require("zod");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const application_errors_1 = require("../src/domain/applicationErrors");
const defaultBankConfigPath = 'config/banks.json';
const defaultEnvPath = node_path_1.default.join(process.cwd(), 'config/.env');
dotenv_1.default.config({ path: defaultEnvPath });
const envPlaceholderRegex = /\$\{([A-Z0-9_]+)\}/g;
function resolvePlaceholders(value, env) {
    return value.replace(envPlaceholderRegex, (_, key) => {
        const resolved = env[key];
        if (resolved === undefined || resolved === '') {
            throw new application_errors_1.ConfigurationError(`Missing required environment variable: ${key}`);
        }
        return resolved;
    });
}
function resolveDeep(input, env) {
    if (typeof input === 'string') {
        return resolvePlaceholders(input, env);
    }
    if (Array.isArray(input)) {
        return input.map((item) => resolveDeep(item, env));
    }
    if (input !== null && typeof input === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(input)) {
            out[k] = resolveDeep(v, env);
        }
        return out;
    }
    return input;
}
const ziraatAccountSchema = zod_1.z.object({
    networkId: zod_1.z.string().min(1),
    customerNumber: zod_1.z.string().min(1),
    additionalNumber: zod_1.z.string().min(1),
    accountNumber: zod_1.z.string().optional(),
});
const vakifbankAccountSchema = zod_1.z.object({
    networkId: zod_1.z.string().min(1),
    accountNumber: zod_1.z.string().min(1),
    clientNumber: zod_1.z.string().optional(),
});
const ziraatBankSchema = zod_1.z.object({
    type: zod_1.z.literal('ZIRAAT'),
    enabled: zod_1.z.boolean(),
    endpoint: zod_1.z.string().url(),
    institutionCode: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
    iptalFisGetir: zod_1.z.enum(['E', 'H']).default('H'),
    accounts: zod_1.z.array(ziraatAccountSchema),
});
const vakifbankBankSchema = zod_1.z.object({
    type: zod_1.z.literal('VAKIFBANK'),
    enabled: zod_1.z.boolean(),
    endpoint: zod_1.z.string().url(),
    username: zod_1.z.string().min(1),
    password: zod_1.z.string().min(1),
    soapAction: zod_1.z.string().optional(),
    accounts: zod_1.z.array(vakifbankAccountSchema),
});
const bankConfigFileSchema = zod_1.z.object({
    banks: zod_1.z.array(zod_1.z.union([ziraatBankSchema, vakifbankBankSchema])),
});
const boolFromEnv = (value, defaultValue) => {
    if (value === undefined) {
        return defaultValue;
    }
    return value.toLowerCase() === 'true' || value === '1';
};
const intFromEnv = (value, defaultValue) => {
    if (value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        throw new application_errors_1.ConfigurationError(`Invalid integer env value: ${value}`);
    }
    return parsed;
};
exports.appConfigSchema = zod_1.z.object({
    nodeEnv: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    port: zod_1.z.number().int().positive(),
    serviceName: zod_1.z.string().default('canias-bank-movement-integration'),
    timezone: zod_1.z.string().default('Europe/Istanbul'),
    schedulerEnabled: zod_1.z.boolean(),
    schedulerCron: zod_1.z.string(),
    dataExtractionDurationMinutes: zod_1.z.number().int().positive(),
    queryOverlapMinutes: zod_1.z.number().int().nonnegative(),
    movementFilterCreditOnly: zod_1.z.boolean(),
    maxManualQueryRangeHours: zod_1.z.number().int().positive(),
    bankConfigPath: zod_1.z.string(),
    bankHttpTimeoutMs: zod_1.z.number().int().positive(),
    bankHttpMaxRetries: zod_1.z.number().int().nonnegative(),
    bankHttpRetryDelayMs: zod_1.z.number().int().nonnegative(),
    bankHttpMaxResponseBytes: zod_1.z.number().int().positive(),
    apiKeyEnabled: zod_1.z.boolean(),
    apiKey: zod_1.z.string().optional(),
    shutdownTimeoutMs: zod_1.z.number().int().positive(),
    commitSha: zod_1.z.string().optional(),
    db: zod_1.z.object({
        host: zod_1.z.string().min(1),
        port: zod_1.z.number().int().positive(),
        name: zod_1.z.string().min(1),
        user: zod_1.z.string().min(1),
        password: zod_1.z.string().min(1),
        encrypt: zod_1.z.boolean(),
        trustServerCertificate: zod_1.z.boolean(),
        poolMin: zod_1.z.number().int().nonnegative(),
        poolMax: zod_1.z.number().int().positive(),
        connectionTimeoutMs: zod_1.z.number().int().positive(),
        requestTimeoutMs: zod_1.z.number().int().positive(),
    }),
});
function validateUniqueAccounts(banks) {
    const keys = new Set();
    for (const bank of banks) {
        if (!bank.enabled) {
            continue;
        }
        if (bank.accounts.length === 0) {
            throw new application_errors_1.ConfigurationError(`Enabled bank ${bank.type} has no accounts`);
        }
        for (const account of bank.accounts) {
            const key = `${bank.type}:${account.networkId}:${'customerNumber' in account ? account.customerNumber : account.accountNumber}`;
            if (keys.has(key)) {
                throw new application_errors_1.ConfigurationError(`Duplicate bank account configuration: ${key}`);
            }
            keys.add(key);
        }
    }
}
function loadBankConfigFile(configPath, env) {
    const absolute = node_path_1.default.isAbsolute(configPath) ? configPath : node_path_1.default.resolve(process.cwd(), configPath);
    if (!node_fs_1.default.existsSync(absolute)) {
        throw new application_errors_1.ConfigurationError(`Bank config file not found: ${absolute}`);
    }
    const raw = JSON.parse(node_fs_1.default.readFileSync(absolute, 'utf8'));
    const resolved = resolveDeep(raw, env);
    const parsed = bankConfigFileSchema.safeParse(resolved);
    if (!parsed.success) {
        throw new application_errors_1.ConfigurationError('Invalid bank configuration file', [
            { message: parsed.error.message },
        ]);
    }
    validateUniqueAccounts(parsed.data.banks);
    return parsed.data.banks;
}
function flattenEnabledAccounts(banks) {
    const accounts = [];
    for (const bank of banks) {
        if (!bank.enabled) {
            continue;
        }
        if (bank.type === 'ZIRAAT') {
            for (const account of bank.accounts) {
                accounts.push({ ...account, bankType: 'ZIRAAT', bankConfig: bank });
            }
        }
        else {
            for (const account of bank.accounts) {
                accounts.push({ ...account, bankType: 'VAKIFBANK', bankConfig: bank });
            }
        }
    }
    return accounts;
}
function loadAppConfig(env = process.env) {
    const apiKeyEnabled = boolFromEnv(env.API_KEY_ENABLED, false);
    const apiKey = env.API_KEY;
    if (apiKeyEnabled && (!apiKey || apiKey.trim() === '')) {
        throw new application_errors_1.ConfigurationError('API_KEY is required when API_KEY_ENABLED=true');
    }
    const bankConfigPath = env.BANK_CONFIG_PATH ?? defaultBankConfigPath;
    const banks = loadBankConfigFile(bankConfigPath, env);
    const enabledAccounts = flattenEnabledAccounts(banks);
    const base = {
        nodeEnv: env.NODE_ENV ?? 'development',
        port: intFromEnv(env.PORT, 3000),
        serviceName: env.SERVICE_NAME ?? 'canias-bank-movement-integration',
        timezone: env.TIMEZONE ?? 'Europe/Istanbul',
        schedulerEnabled: boolFromEnv(env.SCHEDULER_ENABLED, true),
        schedulerCron: env.SCHEDULER_CRON ?? '*/15 * * * *',
        dataExtractionDurationMinutes: intFromEnv(env.DATA_EXTRACTION_DURATION_MINUTES, 360),
        queryOverlapMinutes: intFromEnv(env.QUERY_OVERLAP_MINUTES, 5),
        movementFilterCreditOnly: boolFromEnv(env.MOVEMENT_FILTER_CREDIT_ONLY, true),
        maxManualQueryRangeHours: intFromEnv(env.MAX_MANUAL_QUERY_RANGE_HOURS, 24),
        bankConfigPath,
        bankHttpTimeoutMs: intFromEnv(env.BANK_HTTP_TIMEOUT_MS, 30000),
        bankHttpMaxRetries: intFromEnv(env.BANK_HTTP_MAX_RETRIES, 2),
        bankHttpRetryDelayMs: intFromEnv(env.BANK_HTTP_RETRY_DELAY_MS, 1000),
        bankHttpMaxResponseBytes: intFromEnv(env.BANK_HTTP_MAX_RESPONSE_BYTES, 5_000_000),
        apiKeyEnabled,
        apiKey: apiKey?.trim(),
        shutdownTimeoutMs: intFromEnv(env.SHUTDOWN_TIMEOUT_MS, 30000),
        commitSha: env.COMMIT_SHA,
        db: {
            host: env.DB_HOST ?? '',
            port: intFromEnv(env.DB_PORT, 1433),
            name: env.DB_NAME ?? '',
            user: env.DB_USER ?? '',
            password: env.DB_PASSWORD ?? '',
            encrypt: boolFromEnv(env.DB_ENCRYPT, false),
            trustServerCertificate: boolFromEnv(env.DB_TRUST_SERVER_CERTIFICATE, true),
            poolMin: intFromEnv(env.DB_POOL_MIN, 1),
            poolMax: intFromEnv(env.DB_POOL_MAX, 10),
            connectionTimeoutMs: intFromEnv(env.DB_CONNECTION_TIMEOUT_MS, 15000),
            requestTimeoutMs: intFromEnv(env.DB_REQUEST_TIMEOUT_MS, 30000),
        },
    };
    const parsed = exports.appConfigSchema.safeParse(base);
    if (!parsed.success) {
        throw new application_errors_1.ConfigurationError('Invalid application configuration', [
            { message: parsed.error.message },
        ]);
    }
    for (const field of ['host', 'name', 'user', 'password']) {
        if (!parsed.data.db[field]) {
            throw new application_errors_1.ConfigurationError(`DB_${field.toUpperCase()} is required`);
        }
    }
    return { ...parsed.data, banks, enabledAccounts };
}
