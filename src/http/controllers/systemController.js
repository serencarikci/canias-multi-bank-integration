"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusController = exports.ProcessController = void 0;
const application_errors_1 = require("../../domain/applicationErrors");
const request_schemas_1 = require("../schemas/requestSchemas");
class ProcessController {
    constructor(services) {
        this.services = services;
    }
    process = async (req, res) => {
        const parsed = request_schemas_1.processRequestSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            throw new application_errors_1.ValidationError('Invalid processing request', [
                { message: parsed.error.message },
            ], req.correlationId);
        }
        const startDateTime = parsed.data.startDateTime
            ? new Date(parsed.data.startDateTime)
            : undefined;
        const endDateTime = parsed.data.endDateTime ? new Date(parsed.data.endDateTime) : undefined;
        try {
            const summary = await this.services.fetchMovements({
                bank: parsed.data.bank,
                networkId: parsed.data.networkId,
                startDateTime,
                endDateTime,
                persistToDatabase: true,
            }, req.correlationId);
            const statusCode = summary.status === 'partial' ? 207 : 200;
            res.status(statusCode).json(summary);
        }
        catch (error) {
            if (error instanceof application_errors_1.ConcurrentExecutionError) {
                res.status(409).json({
                    error: {
                        code: error.code,
                        message: error.message,
                        details: [],
                        correlationId: req.correlationId,
                    },
                });
                return;
            }
            throw error;
        }
    };
}
exports.ProcessController = ProcessController;
class StatusController {
    constructor(services) {
        this.services = services;
    }
    status = (_req, res) => {
        res.json(this.services.getStatus());
    };
    version = (_req, res) => {
        res.json(this.services.getVersion());
    };
    root = (_req, res) => {
        res.json({
            service: this.services.config.serviceName,
            health: '/health',
            ready: '/ready',
            api: '/api/v1',
            services: '/api/v1/services',
        });
    };
    health = (_req, res) => {
        res.json({
            status: 'up',
            service: this.services.config.serviceName,
            timestamp: new Date().toISOString(),
        });
    };
}
exports.StatusController = StatusController;
