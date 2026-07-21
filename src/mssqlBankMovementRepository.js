"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MssqlBankMovementRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const application_errors_1 = require("./domain/applicationErrors");
class MssqlBankMovementRepository {
    pool = null;
    connecting = null;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        if (this.pool) {
            return;
        }
        if (this.connecting) {
            return this.connecting;
        }
        this.connecting = this.createPool();
        try {
            await this.connecting;
        }
        finally {
            this.connecting = null;
        }
    }
    async createPool() {
        const { db } = this.config;
        const pool = new mssql_1.default.ConnectionPool({
            server: db.host,
            port: db.port,
            database: db.name,
            user: db.user,
            password: db.password,
            options: {
                encrypt: db.encrypt,
                trustServerCertificate: db.trustServerCertificate,
            },
            pool: {
                min: db.poolMin,
                max: db.poolMax,
            },
            connectionTimeout: db.connectionTimeoutMs,
            requestTimeout: db.requestTimeoutMs,
        });
        let attempt = 0;
        const maxAttempts = 3;
        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                await pool.connect();
                this.pool = pool;
                return;
            }
            catch (error) {
                if (attempt >= maxAttempts) {
                    throw new application_errors_1.DatabaseError('Failed to connect to MSSQL', error);
                }
                await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
        }
    }
    async healthCheck() {
        await this.connect();
        await this.getPool().request().query('SELECT 1 AS ok');
    }
    async close() {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
        }
    }
    async insertMovement(movement) {
        await this.connect();
        const amount = new decimal_js_1.default(movement.amount).toFixed(2);
        try {
            const request = this.getPool().request();
            request.input('ISLEM_NO', mssql_1.default.NVarChar(100), movement.transactionNumber);
            request.input('ISLEM_TARIH_ZAMANI', mssql_1.default.DateTime2, movement.transactionDateTime);
            request.input('TUTAR', mssql_1.default.Decimal(18, 2), amount);
            request.input('BORC_ALACAK', mssql_1.default.Char(1), movement.debitCredit);
            request.input('ACIKLAMA', mssql_1.default.NVarChar(1000), movement.description);
            request.input('GONDEREN_IBAN', mssql_1.default.NVarChar(34), movement.senderIban);
            request.input('HESAP_NO', mssql_1.default.NVarChar(50), movement.accountNumber);
            request.input('CLIENT_NO', mssql_1.default.NVarChar(50), movement.clientNumber);
            request.input('NETWORK_ID', mssql_1.default.NVarChar(50), movement.networkId);
            request.input('BANK_NAME', mssql_1.default.NVarChar(50), movement.bankName);
            request.input('PROCESSED_AT', mssql_1.default.DateTime2, movement.processedAt);
            await request.query(`
        INSERT INTO dbo.BANK_MOVEMENTS (
          ISLEM_NO, ISLEM_TARIH_ZAMANI, TUTAR, BORC_ALACAK, ACIKLAMA,
          GONDEREN_IBAN, HESAP_NO, CLIENT_NO, NETWORK_ID, BANK_NAME, PROCESSED_AT
        ) VALUES (
          @ISLEM_NO, @ISLEM_TARIH_ZAMANI, @TUTAR, @BORC_ALACAK, @ACIKLAMA,
          @GONDEREN_IBAN, @HESAP_NO, @CLIENT_NO, @NETWORK_ID, @BANK_NAME, @PROCESSED_AT
        )
      `);
            return 'inserted';
        }
        catch (error) {
            if ((0, application_errors_1.isMssqlDuplicateKeyError)(error)) {
                return 'duplicate';
            }
            throw new application_errors_1.DatabaseError('Failed to insert movement', error);
        }
    }
    getPool() {
        if (!this.pool) {
            throw new application_errors_1.DatabaseError('Database pool is not initialized');
        }
        return this.pool;
    }
}
exports.MssqlBankMovementRepository = MssqlBankMovementRepository;
