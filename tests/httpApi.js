"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const pino_1 = __importDefault(require("pino"));
const load_config_1 = require("../config/loadConfig");
const app_1 = require("../src/app");
const system_controller_1 = require("../src/http/controllers/systemController");
const services_controller_1 = require("../src/http/controllers/servicesController");
const services_1 = require("../src/services");
const process_bank_movements_use_case_1 = require("../src/application/processBankMovementsUseCase");
const processing_run_service_1 = require("../src/application/processingRunService");
const node_path_1 = __importDefault(require("node:path"));
class StubRepo {
    async insertMovement() {
        return 'inserted';
    }
    async healthCheck() { }
}
function createTestApp(apiKeyEnabled = false) {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
        API_KEY_ENABLED: apiKeyEnabled ? 'true' : 'false',
        API_KEY: apiKeyEnabled ? 'test-key' : undefined,
    });
    const runService = new processing_run_service_1.ProcessingRunService();
    const integrations = {
        getSync: () => ({
            syncAccount: async (account) => ({
                bank: account.bankType,
                networkId: account.networkId,
                received: 0,
                valid: 0,
                filtered: 0,
                inserted: 0,
                duplicates: 0,
                failed: 0,
                eligibleForInsert: 0,
                persistToDatabase: true,
                previewMovements: [],
            }),
        }),
    };
    const useCase = new process_bank_movements_use_case_1.ProcessBankMovementsUseCase(config, integrations, runService, (0, pino_1.default)({ level: 'silent' }));
    const repository = new StubRepo();
    const integrationServices = new services_1.IntegrationServices({
        config,
        useCase,
        runService,
        repository,
    });
    return {
        app: (0, app_1.createApp)({
            config,
            logger: (0, pino_1.default)({ level: 'silent' }),
            processController: new system_controller_1.ProcessController(integrationServices),
            statusController: new system_controller_1.StatusController(integrationServices),
            servicesController: new services_controller_1.ServicesController(integrationServices),
            repository,
        }),
        config,
    };
}
describe('HTTP API', () => {
    const { app } = createTestApp(false);
    it('returns health', async () => {
        const res = await (0, supertest_1.default)(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('up');
    });
    it('returns version', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/v1/version');
        expect(res.status).toBe(200);
        expect(res.body.version).toBeDefined();
    });
    it('returns status', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/v1/status');
        expect(res.status).toBe(200);
        expect(res.body.enabledBanks).toBeDefined();
    });
    it('lists service catalog', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/v1/services');
        expect(res.status).toBe(200);
        expect(res.body.services.some((s) => s.id === 'fetchMovements')).toBe(true);
    });
    it('validates process request dates', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/v1/process')
            .send({ startDateTime: '2026-07-21T10:00:00+03:00', endDateTime: '2026-07-21T09:00:00+03:00' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
    it('returns ready when repository healthy', async () => {
        const res = await (0, supertest_1.default)(app).get('/ready');
        expect(res.status).toBe(200);
    });
    it('processes manually', async () => {
        const res = await (0, supertest_1.default)(app).post('/api/v1/process').send({});
        expect(res.status).toBe(200);
        expect(res.body.runId).toBeDefined();
    });
    it('preview fetch without insert', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/v1/services/fetch-movements/preview')
            .send({ bank: 'ZIRAAT' });
        expect(res.status).toBe(200);
        expect(res.body.persistToDatabase).toBe(false);
    });
    it('returns consistent error shape', async () => {
        const res = await (0, supertest_1.default)(app).post('/api/v1/process').send({ bank: 'INVALID' });
        expect(res.status).toBe(400);
        expect(res.body.error.correlationId).toBeDefined();
    });
});
describe('API key middleware', () => {
    it('rejects missing key when enabled', async () => {
        const { app } = createTestApp(true);
        const res = await (0, supertest_1.default)(app).post('/api/v1/process').send({});
        expect(res.status).toBe(401);
    });
});
