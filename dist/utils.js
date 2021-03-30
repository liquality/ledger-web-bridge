"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOutputPayload = exports.parseInputPayload = void 0;
const parseInputPayload = (payload) => {
    if (payload) {
        if (payload.type && payload.type === 'Hex') {
            return Buffer.from(payload.data || '', 'hex');
        }
        if (payload instanceof Array) {
            return payload.map(i => exports.parseInputPayload(i));
        }
        if (typeof payload === 'object' && Object.keys(payload).length > 0) {
            const output = {};
            for (const key in payload) {
                output[key] = exports.parseInputPayload(payload[key]);
            }
            return output;
        }
    }
    return payload;
};
exports.parseInputPayload = parseInputPayload;
const parseOutputPayload = (payload) => {
    if (payload instanceof Buffer) {
        return { type: 'Hex', data: payload.toString('hex') };
    }
    if (payload instanceof Array) {
        return payload.map(i => exports.parseOutputPayload(i));
    }
    if (payload && typeof payload === 'object') {
        if (Object.keys(payload).length > 0) {
            const output = {};
            for (const key in payload) {
                output[key] = exports.parseOutputPayload(payload[key]);
            }
            return output;
        }
    }
    return payload;
};
exports.parseOutputPayload = parseOutputPayload;
