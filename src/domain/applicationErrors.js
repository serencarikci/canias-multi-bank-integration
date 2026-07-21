"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrentExecutionError = exports.DuplicateMovementError = exports.DatabaseError = exports.SoapParseError = exports.SoapFaultError = exports.BankIntegrationError = exports.ConfigurationError = exports.ValidationError = exports.ApplicationError = exports.ErrorCode = void 0;
exports.isMssqlDuplicateKeyError = isMssqlDuplicateKeyError;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["APPLICATION_ERROR"] = "APPLICATION_ERROR";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
    ErrorCode["BANK_INTEGRATION_ERROR"] = "BANK_INTEGRATION_ERROR";
    ErrorCode["SOAP_FAULT"] = "SOAP_FAULT";
    ErrorCode["SOAP_PARSE_ERROR"] = "SOAP_PARSE_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["DUPLICATE_MOVEMENT"] = "DUPLICATE_MOVEMENT";
    ErrorCode["CONCURRENT_EXECUTION"] = "CONCURRENT_EXECUTION";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class ApplicationError extends Error {
    constructor(message, options = {}) {
        super(message, { cause: options.cause });
        this.name = 'ApplicationError';
        this.code = options.code ?? ErrorCode.APPLICATION_ERROR;
        this.statusCode = options.statusCode ?? 500;
        this.details = options.details ?? [];
        this.correlationId = options.correlationId;
        this.exposeStack = options.exposeStack ?? false;
    }
}
exports.ApplicationError = ApplicationError;
class ValidationError extends ApplicationError {
    constructor(message, details = [], correlationId) {
        super(message, {
            code: ErrorCode.VALIDATION_ERROR,
            statusCode: 400,
            details,
            correlationId,
        });
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class ConfigurationError extends ApplicationError {
    constructor(message, details = []) {
        super(message, {
            code: ErrorCode.CONFIGURATION_ERROR,
            statusCode: 500,
            details,
        });
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class BankIntegrationError extends ApplicationError {
    constructor(message, options = {}) {
        super(message, {
            code: ErrorCode.BANK_INTEGRATION_ERROR,
            statusCode: options.statusCode ?? 502,
            correlationId: options.correlationId,
            cause: options.cause,
        });
        this.name = 'BankIntegrationError';
        this.bankCode = options.bankCode;
        this.recoverable = options.recoverable ?? false;
    }
}
exports.BankIntegrationError = BankIntegrationError;
class SoapFaultError extends ApplicationError {
    constructor(message, correlationId) {
        super(message, {
            code: ErrorCode.SOAP_FAULT,
            statusCode: 502,
            correlationId,
        });
        this.name = 'SoapFaultError';
    }
}
exports.SoapFaultError = SoapFaultError;
class SoapParseError extends ApplicationError {
    constructor(message, correlationId, cause) {
        super(message, {
            code: ErrorCode.SOAP_PARSE_ERROR,
            statusCode: 502,
            correlationId,
            cause,
        });
        this.name = 'SoapParseError';
    }
}
exports.SoapParseError = SoapParseError;
class DatabaseError extends ApplicationError {
    constructor(message, cause) {
        super(message, {
            code: ErrorCode.DATABASE_ERROR,
            statusCode: 500,
            cause,
        });
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class DuplicateMovementError extends ApplicationError {
    constructor(message = 'Duplicate movement') {
        super(message, {
            code: ErrorCode.DUPLICATE_MOVEMENT,
            statusCode: 409,
        });
        this.name = 'DuplicateMovementError';
    }
}
exports.DuplicateMovementError = DuplicateMovementError;
class ConcurrentExecutionError extends ApplicationError {
    constructor(message = 'Processing already in progress') {
        super(message, {
            code: ErrorCode.CONCURRENT_EXECUTION,
            statusCode: 409,
        });
        this.name = 'ConcurrentExecutionError';
    }
}
exports.ConcurrentExecutionError = ConcurrentExecutionError;
function isMssqlDuplicateKeyError(error) {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const err = error;
    const num = err.number ?? err.originalError?.info?.number;
    return num === 2601 || num === 2627;
}
