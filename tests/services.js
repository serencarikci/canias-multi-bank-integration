"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const services_1 = require("../src/services");
const processing_run_service_1 = require("../src/application/processingRunService");
const load_config_1 = require("../config/loadConfig");
const node_path_1 = require("node:path");
describe('IntegrationServices', () => {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.resolve(__dirname, 'testFixtures/banks.json'),
    });
    it('lists fetch-movements in catalog', () => {
        const services = new services_1.IntegrationServices({
            config,
            useCase: { execute: jest.fn() },
            runService: new processing_run_service_1.ProcessingRunService(),
            repository: {},
        });
        const catalog = services.listServices();
        expect(catalog.services.find((s) => s.id === 'previewMovements')?.path).toContain('/preview');
    });
    it('getConfig redacts account numbers', () => {
        const services = new services_1.IntegrationServices({
            config,
            useCase: { execute: jest.fn() },
            runService: new processing_run_service_1.ProcessingRunService(),
            repository: {},
        });
        const snapshot = services.getConfig();
        expect(snapshot.banks.length).toBeGreaterThan(0);
        expect(JSON.stringify(snapshot)).not.toMatch(config.banks[0]?.accounts[0]?.customerNumber ?? 'impossible');
    });
});
