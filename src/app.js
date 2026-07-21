"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const error_middleware_1 = require("./http/middleware/errorMiddleware");
const routes_1 = require("./http/routes");
function createApp(deps) {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    app.use(express_1.default.json({ limit: '256kb' }));
    app.use(error_middleware_1.correlationIdMiddleware);
    app.use((0, pino_http_1.default)({
        logger: deps.logger,
        genReqId: (req) => req.correlationId ?? 'unknown',
    }));
    app.use((0, routes_1.createHttpRouter)({
        config: deps.config,
        processController: deps.processController,
        statusController: deps.statusController,
        servicesController: deps.servicesController,
        repository: deps.repository,
    }));
    app.use((0, error_middleware_1.errorHandler)(deps.config));
    return app;
}
