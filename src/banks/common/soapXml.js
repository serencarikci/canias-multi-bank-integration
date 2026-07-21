"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseXmlDocument = parseXmlDocument;
exports.escapeXml = escapeXml;
exports.asArray = asArray;
exports.findFirstKey = findFirstKey;
exports.extractSoapBody = extractSoapBody;
exports.extractSoapFault = extractSoapFault;
exports.sanitizeXmlForLog = sanitizeXmlForLog;
const fast_xml_parser_1 = require("fast-xml-parser");
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
    parseAttributeValue: false,
});
function parseXmlDocument(xml) {
    if (!xml.includes('<')) {
        throw new Error('Invalid XML document');
    }
    try {
        return parser.parse(xml);
    }
    catch (error) {
        throw new Error('XML parse failure', { cause: error });
    }
}
function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function asArray(value) {
    if (value === null || value === undefined) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}
function findFirstKey(obj, keys) {
    if (obj === null || obj === undefined) {
        return undefined;
    }
    if (typeof obj !== 'object') {
        return undefined;
    }
    const record = obj;
    for (const key of keys) {
        if (key in record) {
            return record[key];
        }
    }
    for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
            const found = findFirstKey(value, keys);
            if (found !== undefined) {
                return found;
            }
        }
    }
    return undefined;
}
function extractSoapBody(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        return null;
    }
    const root = parsed;
    const envelope = (root.Envelope ?? root['soap:Envelope'] ?? root);
    const body = (envelope.Body ?? envelope['soap:Body']);
    return body ?? null;
}
function extractSoapFault(parsed) {
    const body = extractSoapBody(parsed);
    if (!body) {
        return null;
    }
    const fault = (body.Fault ?? body['soap:Fault']);
    if (!fault) {
        return null;
    }
    const faultString = fault.faultstring ?? fault.Reason ?? fault.faultcode;
    return {
        code: fault.faultcode ? String(fault.faultcode) : undefined,
        message: faultString ? String(faultString) : 'SOAP Fault',
    };
}
function sanitizeXmlForLog(xml) {
    return xml
        .replace(/<([a-zA-Z0-9_:]*?)sifre[^>]*>[\s\S]*?<\/\1sifre>/gi, '<sifre>[REDACTED]</sifre>')
        .replace(/<([a-zA-Z0-9_:]*?)password[^>]*>[\s\S]*?<\/\1password>/gi, '<password>[REDACTED]</password>')
        .replace(/<([a-zA-Z0-9_:]*?)username[^>]*>[\s\S]*?<\/\1username>/gi, '<username>[REDACTED]</username>')
        .replace(/<([a-zA-Z0-9_:]*?)musteriNo[^>]*>[\s\S]*?<\/\1musteriNo>/gi, '<musteriNo>[REDACTED]</musteriNo>');
}
