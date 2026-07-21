"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const system_controller_1 = require("../src/http/controllers/systemController");
const services_1 = require("../src/services");
const security_middleware_1 = require("../src/http/middleware/securityMiddleware");
const error_middleware_1 = require("../src/http/middleware/errorMiddleware");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const load_config_1 = require("../config/loadConfig");
const node_path_1 = __importDefault(require("node:path"));
const processing_run_service_1 = require("../src/application/processingRunService");
const application_errors_1 = require("../src/domain/applicationErrors");
describe('controllers and security middleware', () => {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
    });
    it('process controller returns 409 when running', async () => {
        const runService = new processing_run_service_1.ProcessingRunService();
        runService.tryAcquire();
        const services = new services_1.IntegrationServices({
            config,
            useCase: { execute: jest.fn() },
            runService,
            repository: { healthCheck: async () => { } },
        });
        const controller = new system_controller_1.ProcessController(services);
        const status = jest.fn().mockReturnValue({ json: jest.fn() });
        const req = { body: {}, correlationId: 'x' };
        const res = { status, json: jest.fn() };
        await controller.process(req, res);
        expect(status).toHaveBeenCalledWith(409);
        runService.release('x', false);
    });
    it('process controller rejects unknown bank network', async () => {
        const services = new services_1.IntegrationServices({
            config,
            useCase: { execute: jest.fn() },
            runService: new processing_run_service_1.ProcessingRunService(),
            repository: { healthCheck: async () => { } },
        });
        const controller = new system_controller_1.ProcessController(services);
        const req = { body: { bank: 'ZIRAAT', networkId: '999' }, correlationId: 'x' };
        await expect(controller.process(req, { status: jest.fn(), json: jest.fn() })).rejects.toBeInstanceOf(application_errors_1.ValidationError);
    });
    it('requireJsonBody rejects large payload', async () => {
        const app = (0, express_1.default)();
        app.post('/x', (0, security_middleware_1.requireJsonBody)(10), (_req, res) => res.sendStatus(200));
        app.use((_err, _req, res, _next) => res.status(400).json({ ok: false }));
        const res = await (0, supertest_1.default)(app).post('/x').set('Content-Length', '100').send({});
        expect(res.status).toBe(400);
    });
    it('api key middleware accepts valid key', () => {
        const cfg = { ...config, apiKeyEnabled: true, apiKey: 'secret' };
        const mw = (0, security_middleware_1.apiKeyMiddleware)(cfg);
        const next = jest.fn();
        mw({ header: () => 'secret' }, {}, next);
        expect(next).toHaveBeenCalled();
    });
    it('error handler returns 500 for unknown errors', async () => {
        const app = (0, express_1.default)();
        app.get('/err', () => {
            throw new Error('boom');
        });
        app.use((0, error_middleware_1.errorHandler)({ ...config, nodeEnv: 'production' }));
        const res = await (0, supertest_1.default)(app).get('/err');
        expect(res.status).toBe(500);
    });
});
