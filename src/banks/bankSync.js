"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankSync = void 0;
class BankSync {
    constructor(bankName, extractor, loader) {
        this.bankName = bankName;
        this.extractor = extractor;
        this.loader = loader;
    }
    async syncAccount(account, window, context) {
        if (account.bankType !== this.bankName) {
            throw new Error(`${this.bankName}: invalid account type`);
        }
        context.logger.info({ bankName: this.bankName, networkId: account.networkId, persistToDatabase: context.syncOptions?.persistToDatabase !== false }, 'Starting bank SOAP fetch');
        try {
            const movements = await this.extractor.extract(account, window, context);
            if (movements.length === 0) {
                return this.loader.emptyMetrics(this.bankName, account.networkId);
            }
            return await this.loader.persist(this.bankName, movements, context);
        }
        catch (error) {
            context.logger.error({ err: error }, `${this.bankName} sync failed`);
            const metrics = this.loader.emptyMetrics(this.bankName, account.networkId);
            metrics.failed += 1;
            return metrics;
        }
    }
}
exports.BankSync = BankSync;
