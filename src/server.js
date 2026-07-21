"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const load_config_1 = require("../config/loadConfig");
const logger_1 = require("./logger");
const app_1 = require("./app");
const mssql_bank_movement_repository_1 = require("./mssqlBankMovementRepository");
const banks_1 = require("./banks");
const processing_run_service_1 = require("./application/processingRunService");
const process_bank_movements_use_case_1 = require("./application/processBankMovementsUseCase");
const system_controller_1 = require("./http/controllers/systemController");
const services_controller_1 = require("./http/controllers/servicesController");
const services_1 = require("./services");
const scheduler_service_1 = require("./schedulerService");
const application_errors_1 = require("./domain/applicationErrors");
async function bootstrap() {
    const logger = (0, logger_1.createLogger)();
    let config;
    try {
        config = (0, load_config_1.loadAppConfig)();
    }
    catch (error) {
        logger.fatal({ err: error }, 'Configuration failed');
        throw error;
    }
    const repository = new mssql_bank_movement_repository_1.MssqlBankMovementRepository(config);
    await repository.connect();
    const runService = new processing_run_service_1.ProcessingRunService();
    const bankIntegrations = new banks_1.BankRegistry(config, repository);
    const useCase = new process_bank_movements_use_case_1.ProcessBankMovementsUseCase(config, bankIntegrations, runService, logger);
    const integrationServices = new services_1.IntegrationServices({
        config,
        useCase,
        runService,
        repository,
    });
    const servicesController = new services_controller_1.ServicesController(integrationServices);
    const processController = new system_controller_1.ProcessController(integrationServices);
    const statusController = new system_controller_1.StatusController(integrationServices);
    const app = (0, app_1.createApp)({
        config,
        logger,
        processController,
        statusController,
        servicesController,
        repository,
    });
    const server = node_http_1.default.createServer(app);
    const scheduler = new scheduler_service_1.SchedulerService(config, useCase, runService, logger);
    scheduler.start();
    server.listen(config.port, () => {
        logger.info({ port: config.port }, 'HTTP server listening');
    });
    const shutdown = async (signal, exitCode) => {
        logger.info({ signal }, 'Shutdown initiated');
        scheduler.stop();
        server.close();
        const timeout = setTimeout(() => {
            logger.error('Shutdown timeout exceeded');
            process.exit(exitCode);
        }, config.shutdownTimeoutMs);
        timeout.unref();
        try {
            await repository.close();
            clearTimeout(timeout);
            process.exit(exitCode);
        }
        catch (error) {
            logger.error({ err: error }, 'Shutdown error');
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
    process.on('SIGINT', () => void shutdown('SIGINT', 0));
    process.on('uncaughtException', (error) => {
        logger.fatal({ err: error }, 'Uncaught exception');
        void shutdown('uncaughtException', 1);
    });
    process.on('unhandledRejection', (reason) => {
        logger.fatal({ err: reason }, 'Unhandled rejection');
        void shutdown('unhandledRejection', 1);
    });
}
bootstrap().catch((error) => {
    const logger = (0, logger_1.createLogger)();
    if (error instanceof application_errors_1.ConfigurationError) {
        logger.fatal({ err: error }, error.message);
    }
    else {
        logger.fatal({ err: error }, 'Bootstrap failed');
    }
    process.exit(1);
});
