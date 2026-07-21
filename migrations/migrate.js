"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const mssql_1 = __importDefault(require("mssql"));
require("../config/loadConfig");
function listSqlMigrations() {
    const dir = __dirname;
    return node_fs_1.default.readdirSync(dir)
        .filter((name) => name.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b));
}
async function runSqlFile(pool, filePath) {
    const script = node_fs_1.default.readFileSync(filePath, 'utf8');
    const batches = script
        .split(/^\s*GO\s*$/gim)
        .map((b) => b.trim())
        .filter(Boolean);
    for (const batch of batches.length > 0 ? batches : [script]) {
        await pool.request().query(batch);
    }
}
async function migrate() {
    const config = {
        server: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 1433),
        database: process.env.DB_NAME ?? 'canias_bank',
        user: process.env.DB_USER ?? 'sa',
        password: process.env.DB_PASSWORD ?? '',
        options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        },
    };
    const files = listSqlMigrations();
    if (files.length === 0) {
        throw new Error('No .sql migration files found');
    }
    const pool = await mssql_1.default.connect(config);
    try {
        for (const file of files) {
            const migrationPath = node_path_1.default.join(__dirname, file);
            await runSqlFile(pool, migrationPath);
            console.log(`Applied ${file}`);
        }
        console.log('Migration completed successfully');
    }
    finally {
        await pool.close();
    }
}
migrate().catch((error) => {
    console.error(error);
    process.exit(1);
});
