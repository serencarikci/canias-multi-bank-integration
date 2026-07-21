process.env.NODE_ENV = 'test';
const path = require('node:path');

process.env.BANK_CONFIG_PATH = path.resolve(__dirname, 'testFixtures/banks.json');
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_NAME = process.env.DB_NAME ?? 'canias_bank_test';
process.env.DB_USER = process.env.DB_USER ?? 'sa';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'YourLocalOnly_SqlPassword123!';
process.env.SCHEDULER_ENABLED = 'false';
