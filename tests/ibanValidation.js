"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parsers_1 = require("../src/domain/parsers");
describe('iban validation', () => {
    it('flags invalid iban pattern', () => {
        const errors = (0, parsers_1.isValidMovementShape)({
            transactionNumber: '1',
            transactionDateTime: new Date(),
            amount: 1,
            debitCredit: 'A',
            accountNumber: '1',
            networkId: '033',
            bankName: 'ZIRAAT',
            senderIban: 'INVALID-IBAN',
        });
        expect(errors.some((e) => e.toLowerCase().includes('iban'))).toBe(true);
    });
});
