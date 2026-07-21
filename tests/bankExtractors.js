"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const banks_1 = require("../src/banks");
const load_config_1 = require("../config/loadConfig");
class InMemoryRepo {
    store = [];
    async insertMovement(m) {
        if (this.store.some((x) => x.transactionNumber === m.transactionNumber)) {
            return 'duplicate';
        }
        this.store.push(m);
        return 'inserted';
    }
    async listMovements() {
        return { items: [], total: 0, page: 1, pageSize: 50 };
    }
    async healthCheck() { }
}
describe('Bank extractors (Ziraat and VakifBank)', () => {
    const config = (0, load_config_1.loadAppConfig)({
        ...process.env,
        BANK_CONFIG_PATH: node_path_1.default.resolve(__dirname, 'testFixtures/banks.json'),
    });
    const repo = new InMemoryRepo();
    const loader = new banks_1.MovementLoader(config, repo);
    it('ZiraatExtractor.parseDocument parses fixture XML', () => {
        const xml = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'testFixtures/ziraatSuccess.xml'), 'utf8');
        const account = config.enabledAccounts.find((a) => a.bankType === 'ZIRAAT');
        const extractor = new banks_1.ZiraatExtractor(config);
        const movements = extractor.parseDocument(xml, account, 'corr-1');
        expect(movements.length).toBeGreaterThan(0);
    });
    it('persists Ziraat movements after parse', async () => {
        const xml = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'testFixtures/ziraatSuccess.xml'), 'utf8');
        const account = config.enabledAccounts.find((a) => a.bankType === 'ZIRAAT');
        const extractor = new banks_1.ZiraatExtractor(config);
        const movements = extractor.parseDocument(xml, account, 'corr-2');
        const metrics = await loader.persist('ZIRAAT', movements, {
            correlationId: 'c',
            runId: 'r',
            logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), child: jest.fn() },
        });
        expect(metrics.inserted).toBeGreaterThan(0);
    });
    it('VakifBankExtractor.parseDocument parses fixture XML', () => {
        const xml = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, 'testFixtures/vakifBankSuccess.xml'), 'utf8');
        const account = config.enabledAccounts.find((a) => a.bankType === 'VAKIFBANK');
        const extractor = new banks_1.VakifBankExtractor(config);
        const movements = extractor.parseDocument(xml, account);
        expect(movements.length).toBe(2);
    });
});
