"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMovementsServiceSchema = exports.processRequestSchema = void 0;
const zod_1 = require("zod");
const luxon_1 = require("luxon");
function refineDateRange(value, ctx) {
    if (value.startDateTime && value.endDateTime) {
        const start = luxon_1.DateTime.fromISO(value.startDateTime);
        const end = luxon_1.DateTime.fromISO(value.endDateTime);
        if (!start.isValid || !end.isValid) {
            ctx.addIssue({ code: 'custom', message: 'Invalid ISO date format' });
            return;
        }
        if (start >= end) {
            ctx.addIssue({ code: 'custom', message: 'startDateTime must be before endDateTime' });
        }
    }
    if ((value.startDateTime && !value.endDateTime) || (!value.startDateTime && value.endDateTime)) {
        ctx.addIssue({ code: 'custom', message: 'startDateTime and endDateTime must both be set' });
    }
}
exports.processRequestSchema = zod_1.z
    .object({
    bank: zod_1.z.enum(['ZIRAAT', 'VAKIFBANK']).optional(),
    networkId: zod_1.z.string().min(1).optional(),
    startDateTime: zod_1.z.string().datetime({ offset: true }).optional(),
    endDateTime: zod_1.z.string().datetime({ offset: true }).optional(),
})
    .superRefine(refineDateRange);
exports.fetchMovementsServiceSchema = zod_1.z
    .object({
    bank: zod_1.z.enum(['ZIRAAT', 'VAKIFBANK']).optional(),
    networkId: zod_1.z.string().min(1).optional(),
    startDateTime: zod_1.z.string().datetime({ offset: true }).optional(),
    endDateTime: zod_1.z.string().datetime({ offset: true }).optional(),
    persistToDatabase: zod_1.z.boolean().optional().default(true),
    creditFilterOnly: zod_1.z.boolean().optional(),
    includeMovementPreview: zod_1.z.boolean().optional(),
    previewLimit: zod_1.z.number().int().min(1).max(100).optional().default(20),
})
    .superRefine(refineDateRange);

