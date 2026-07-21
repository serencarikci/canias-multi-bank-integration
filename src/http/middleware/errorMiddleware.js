"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationIdMiddleware = correlationIdMiddleware;
exports.errorHandler = errorHandler;
const uuid_1 = require("uuid");
const application_errors_1 = require("../../domain/applicationErrors");
function correlationIdMiddleware(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] ?? (0, uuid_1.v4)();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
}
function errorHandler(config) {
    return (err, req, res, _next) => {
        const correlationId = req.correlationId ?? (0, uuid_1.v4)();
        if (err instanceof application_errors_1.ApplicationError) {
            const body = {
                error: {
                    code: err.code,
                    message: err.message,
                    details: err.details,
                    correlationId: err.correlationId ?? correlationId,
                },
            };
            res.status(err.statusCode).json(body);
            return;
        }
        const body = {
            error: {
                code: application_errors_1.ErrorCode.APPLICATION_ERROR,
                message: 'Unexpected internal error',
                details: [],
                correlationId,
            },
        };
        if (config.nodeEnv !== 'production' && err instanceof Error) {
            body.error.details.push({ message: err.message });
        }
        res.status(500).json(body);
    };
}
