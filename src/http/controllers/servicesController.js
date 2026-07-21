"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicesController = void 0;
const application_errors_1 = require("../../domain/applicationErrors");
const request_schemas_1 = require("../schemas/requestSchemas");
class ServicesController {
    constructor(services) {
        this.services = services;
    }
    catalog = (_req, res) => {
        res.json(this.services.listServices());
    };
    version = (_req, res) => {
        res.json(this.services.getVersion());
    };
    config = (_req, res) => {
        res.json(this.services.getConfig());
    };
    status = (_req, res) => {
        res.json(this.services.getStatus());
    };
    fetchMovements = async (req, res) => {
        await this.runFetch(req, res, false);
    };
    previewMovements = async (req, res) => {
        await this.runFetch(req, res, true);
    };
    async runFetch(req, res, forcePreview) {
        const parsed = request_schemas_1.fetchMovementsServiceSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            throw new application_errors_1.ValidationError('Invalid fetch-movements request', [
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
                persistToDatabase: forcePreview ? false : parsed.data.persistToDatabase,
                creditFilterOnly: parsed.data.creditFilterOnly,
                includeMovementPreview: parsed.data.includeMovementPreview,
                previewLimit: parsed.data.previewLimit,
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
    }
}
exports.ServicesController = ServicesController;
