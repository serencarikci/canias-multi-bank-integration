"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementLoader = void 0;
const parsers_1 = require("../domain/parsers");
class MovementLoader {
    constructor(config, repository) {
        this.config = config;
        this.repository = repository;
    }
    validateMovement(movement, context) {
        const errors = (0, parsers_1.isValidMovementShape)(movement);
        if (errors.length > 0) {
            context.logger.warn({ bankName: movement.bankName, networkId: movement.networkId, errors }, 'Movement validation failed');
        }
        return errors;
    }
    shouldPersist(movement, creditFilterOnly = this.config.movementFilterCreditOnly) {
        if (!creditFilterOnly) {
            return true;
        }
        return movement.debitCredit === 'A' && movement.amount > 0;
    }
    async persist(bankName, movements, context) {
        const syncOptions = context.syncOptions ?? {};
        const persistToDatabase = syncOptions.persistToDatabase !== false;
        const creditFilterOnly = syncOptions.creditFilterOnly ?? this.config.movementFilterCreditOnly;
        const includeMovementPreview = syncOptions.includeMovementPreview !== false;
        const previewLimit = syncOptions.previewLimit ?? 20;
        const metrics = {
            bank: bankName,
            networkId: movements[0]?.networkId ?? '',
            received: movements.length,
            valid: 0,
            filtered: 0,
            inserted: 0,
            duplicates: 0,
            failed: 0,
            eligibleForInsert: 0,
            persistToDatabase,
            previewMovements: [],
        };
        if (movements.length > 0) {
            metrics.networkId = movements[0].networkId;
        }
        for (const movement of movements) {
            const validationErrors = this.validateMovement(movement, context);
            if (validationErrors.length > 0) {
                metrics.failed += 1;
                continue;
            }
            metrics.valid += 1;
            if (!this.shouldPersist(movement, creditFilterOnly)) {
                metrics.filtered += 1;
                continue;
            }
            if (!persistToDatabase) {
                metrics.eligibleForInsert += 1;
                if (includeMovementPreview && metrics.previewMovements.length < previewLimit) {
                    metrics.previewMovements.push((0, parsers_1.movementPreviewDto)(movement));
                }
                continue;
            }
            try {
                const result = await this.repository.insertMovement(movement);
                if (result === 'inserted') {
                    metrics.inserted += 1;
                }
                else if (result === 'duplicate') {
                    metrics.duplicates += 1;
                }
                else {
                    metrics.failed += 1;
                }
            }
            catch {
                metrics.failed += 1;
            }
        }
        return metrics;
    }
    emptyMetrics(bankName, networkId) {
        return {
            bank: bankName,
            networkId,
            received: 0,
            valid: 0,
            filtered: 0,
            inserted: 0,
            duplicates: 0,
            failed: 0,
            eligibleForInsert: 0,
            persistToDatabase: true,
            previewMovements: [],
        };
    }
}
exports.MovementLoader = MovementLoader;
