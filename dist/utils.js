"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkWSTransportLoop = exports.makeDelay = exports.parseOutputPayload = exports.parseInputPayload = void 0;
const WebSocketTransport_1 = __importDefault(require("@ledgerhq/hw-transport-http/lib/WebSocketTransport"));
const config_1 = require("./config");
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
const makeDelay = async (ms) => {
    return new Promise((success) => setTimeout(success, ms));
};
exports.makeDelay = makeDelay;
const checkWSTransportLoop = async (iteration = 0) => {
    const iterator = iteration || 0;
    return await WebSocketTransport_1.default.check(config_1.LEDGER_LIVE_URL).catch(async () => {
        await exports.makeDelay(config_1.TRANSPORT_CHECK_DELAY);
        if (iterator < config_1.TRANSPORT_CHECK_LIMIT) {
            return exports.checkWSTransportLoop(iterator + 1);
        }
        else {
            throw new Error('Ledger transport check timeout');
        }
    });
};
exports.checkWSTransportLoop = checkWSTransportLoop;
