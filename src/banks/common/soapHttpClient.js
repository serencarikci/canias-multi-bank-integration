"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoapHttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
const transientCodes = new Set(['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'EAI_AGAIN']);
const transientHttp = new Set([429, 502, 503, 504]);
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function jitter(base) {
    return base + Math.floor(Math.random() * base * 0.25);
}
class SoapHttpClient {
    constructor(config) {
        this.config = config;
        this.client = axios_1.default.create({
            timeout: config.bankHttpTimeoutMs,
            maxContentLength: config.bankHttpMaxResponseBytes,
            maxBodyLength: config.bankHttpMaxResponseBytes,
            validateStatus: (status) => status >= 200 && status < 600,
        });
    }
    async postSoap(request) {
        let attempt = 0;
        const maxAttempts = this.config.bankHttpMaxRetries + 1;
        while (attempt < maxAttempts) {
            attempt += 1;
            try {
                const headers = {
                    'Content-Type': 'text/xml; charset=utf-8',
                };
                if (request.soapAction) {
                    headers.SOAPAction = request.soapAction;
                }
                const response = await this.client.post(request.url, request.body, {
                    headers,
                    responseType: 'text',
                    transformResponse: [(data) => data],
                });
                if (response.status >= 200 && response.status < 300) {
                    return String(response.data);
                }
                if (!transientHttp.has(response.status) || attempt >= maxAttempts) {
                    throw new Error(`Bank HTTP error: ${response.status}`);
                }
            }
            catch (error) {
                const axiosError = error;
                const code = axiosError.code;
                const status = axiosError.response?.status;
                const transient = (code && transientCodes.has(code)) || (status !== undefined && transientHttp.has(status));
                if (!transient || attempt >= maxAttempts) {
                    throw error;
                }
                await sleep(jitter(this.config.bankHttpRetryDelayMs * attempt));
            }
        }
        throw new Error('SOAP request failed after retries');
    }
}
exports.SoapHttpClient = SoapHttpClient;
