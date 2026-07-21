"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankRegistry = exports.VakifBankExtractor = exports.ZiraatExtractor = exports.BankSync = exports.MovementLoader = void 0;
const movementLoader_1 = require("./movementLoader");
const bankSync_1 = require("./bankSync");
const ziraatMovementExtractor_1 = require("./ziraat/ziraatMovementExtractor");
const vakifBankMovementExtractor_1 = require("./vakifBank/vakifBankMovementExtractor");
Object.defineProperty(exports, "MovementLoader", { enumerable: true, get: () => movementLoader_1.MovementLoader });
Object.defineProperty(exports, "BankSync", { enumerable: true, get: () => bankSync_1.BankSync });
Object.defineProperty(exports, "ZiraatExtractor", { enumerable: true, get: () => ziraatMovementExtractor_1.ZiraatExtractor });
Object.defineProperty(exports, "VakifBankExtractor", { enumerable: true, get: () => vakifBankMovementExtractor_1.VakifBankExtractor });
class BankRegistry {
    constructor(config, repository) {
        const loader = new movementLoader_1.MovementLoader(config, repository);
        const ziraatExtractor = new ziraatMovementExtractor_1.ZiraatExtractor(config);
        const vakifExtractor = new vakifBankMovementExtractor_1.VakifBankExtractor(config);
        this.extractors = new Map([
            ['ZIRAAT', ziraatExtractor],
            ['VAKIFBANK', vakifExtractor],
        ]);
        this.syncByBank = new Map([
            ['ZIRAAT', new bankSync_1.BankSync('ZIRAAT', ziraatExtractor, loader)],
            ['VAKIFBANK', new bankSync_1.BankSync('VAKIFBANK', vakifExtractor, loader)],
        ]);
    }
    getSync(bankType) {
        const sync = this.syncByBank.get(bankType);
        if (!sync) {
            throw new Error(`Unknown bank: ${bankType}`);
        }
        return sync;
    }
    getExtractor(bankType) {
        const extractor = this.extractors.get(bankType);
        if (!extractor) {
            throw new Error(`Unknown bank extractor: ${bankType}`);
        }
        return extractor;
    }
}
exports.BankRegistry = BankRegistry;
