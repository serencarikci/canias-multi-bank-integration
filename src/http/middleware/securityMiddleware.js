"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyMiddleware = apiKeyMiddleware;
exports.requireJsonBody = requireJsonBody;
const application_errors_1 = require("../../domain/applicationErrors");
function apiKeyMiddleware(config) {
    return (req, res, next) => {
        if (!config.apiKeyEnabled) {
            next();
            return;
        }
        const key = req.header('X-API-Key');
        if (!key || key !== config.apiKey) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid or missing API key',
                    details: [],
                    correlationId: req.correlationId,
                },
            });
            return;
        }
        next();
    };
}
function requireJsonBody(maxBytes) {
    return (req, _res, next) => {
        const length = Number(req.headers['content-length'] ?? 0);
        if (length > maxBytes) {
            next(new application_errors_1.ValidationError('Request body too large'));
            return;
        }
        next();
    };
}
