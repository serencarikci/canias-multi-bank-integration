"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const application_errors_1 = require("../src/domain/applicationErrors");
const logger_1 = require("../src/logger");
const scheduler_service_1 = require("../src/schedulerService");
const processing_run_service_1 = require("../src/application/processingRunService");
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
const pino_1 = __importDefault(require("pino"));
const node_cron_1 = __importDefault(require("node-cron"));
jest.mock('node-cron', () => ({
    validate: jest.fn(() => true),
    schedule: jest.fn(() => ({ stop: jest.fn() })),
}));
describe('application errors', () => {
    it('constructs typed errors', () => {
        expect(new application_errors_1.ValidationError('v').code).toBe(application_errors_1.ErrorCode.VALIDATION_ERROR);
        expect(new application_errors_1.ConfigurationError('c').statusCode).toBe(500);
        expect(new application_errors_1.BankIntegrationError('b', { bankCode: '09' }).bankCode).toBe('09');
        expect(new application_errors_1.SoapFaultError('s').code).toBe(application_errors_1.ErrorCode.SOAP_FAULT);
        expect(new application_errors_1.SoapParseError('p').code).toBe(application_errors_1.ErrorCode.SOAP_PARSE_ERROR);
        expect(new application_errors_1.DatabaseError('d').code).toBe(application_errors_1.ErrorCode.DATABASE_ERROR);
        expect(new application_errors_1.DuplicateMovementError().code).toBe(application_errors_1.ErrorCode.DUPLICATE_MOVEMENT);
        expect(new application_errors_1.ConcurrentExecutionError().statusCode).toBe(409);
        expect(new application_errors_1.ApplicationError('a').code).toBe(application_errors_1.ErrorCode.APPLICATION_ERROR);
    });
});
describe('logger', () => {
    it('creates pino logger with redaction', () => {
        const logger = (0, logger_1.createLogger)('silent');
        expect(logger).toBeDefined();
    });
});
describe('scheduler start', () => {
    it('starts cron when enabled', () => {
        const config = (0, load_config_1.loadAppConfig)({
            ...process.env,
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
            SCHEDULER_ENABLED: 'true',
        });
        const scheduler = new scheduler_service_1.SchedulerService(config, { execute: jest.fn() }, new processing_run_service_1.ProcessingRunService(), (0, pino_1.default)({ level: 'silent' }));
        scheduler.start();
        expect(node_cron_1.default.schedule).toHaveBeenCalled();
        scheduler.stop();
    });
    it('does not start when disabled', () => {
        const config = (0, load_config_1.loadAppConfig)({
            ...process.env,
            BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
            SCHEDULER_ENABLED: 'false',
        });
        const scheduler = new scheduler_service_1.SchedulerService(config, { execute: jest.fn() }, new processing_run_service_1.ProcessingRunService(), (0, pino_1.default)({ level: 'silent' }));
        scheduler.start();
        expect(node_cron_1.default.schedule).not.toHaveBeenCalled();
    });
});
