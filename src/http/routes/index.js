"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpRouter = createHttpRouter;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const security_middleware_1 = require("../middleware/securityMiddleware");
const async_middleware_1 = require("../middleware/asyncMiddleware");
function createHttpRouter(deps) {
    const router = (0, express_1.Router)();
    const { config, processController, statusController, servicesController, repository } = deps;
    router.get('/', statusController.root);
    router.get('/health', statusController.health);
    router.get('/ready', async (_req, res) => {
        try {
            await repository.healthCheck();
            res.json({ status: 'ready', timestamp: new Date().toISOString() });
        }
        catch {
            res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
        }
    });
    router.get('/api/v1/status', statusController.status);
    router.get('/api/v1/version', statusController.version);
    router.get('/api/v1/services', servicesController.catalog);
    router.get('/api/v1/services/version', servicesController.version);
    router.get('/api/v1/services/status', servicesController.status);
    const protectedMiddleware = (0, security_middleware_1.apiKeyMiddleware)(config);
    router.get('/api/v1/services/config', protectedMiddleware, servicesController.config);
    const processLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60_000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
    });
    router.post('/api/v1/process', protectedMiddleware, processLimiter, (0, async_middleware_1.asyncHandler)(processController.process));
    router.post('/api/v1/services/fetch-movements', protectedMiddleware, processLimiter, (0, async_middleware_1.asyncHandler)(servicesController.fetchMovements));
    router.post('/api/v1/services/fetch-movements/preview', protectedMiddleware, processLimiter, (0, async_middleware_1.asyncHandler)(servicesController.previewMovements));
    return router;
}
