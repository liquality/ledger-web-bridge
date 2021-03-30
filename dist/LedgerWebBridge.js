"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerWebBridge = void 0;
const hw_transport_u2f_1 = __importDefault(require("@ledgerhq/hw-transport-u2f"));
const hw_app_eth_1 = __importDefault(require("@ledgerhq/hw-app-eth"));
const hw_app_btc_1 = __importDefault(require("@ledgerhq/hw-app-btc"));
const config_1 = require("./config");
const utils_1 = require("./utils");
class LedgerWebBridge {
    constructor() {
        this._transports = { ETH: null, BTC: null };
        this._apps = { ETH: null, BTC: null };
    }
    async clear() {
        this._apps.BTC = null;
        this._apps.ETH = null;
        await this._transports.BTC?.close();
        await this._transports.ETH?.close();
        this._transports = { ETH: null, BTC: null };
    }
    async ensureTransportCreated(appType, origin) {
        if (!this._transports[appType]) {
            try {
                this._transports[appType] = await hw_transport_u2f_1.default.create();
                this._transports[appType].on('disconnect', async () => {
                    await this.clear();
                    this.sendMessage(origin, {
                        action: `transport::${appType}::disconnect`,
                        success: true
                    });
                });
            }
            catch (error) {
                await this.clear();
                console.error(error);
                this.sendMessage(origin, {
                    action: `transport::${appType}::error`,
                    success: false,
                    payload: error
                });
            }
        }
    }
    async createLedgerApp(appType, origin) {
        await this.ensureTransportCreated(appType, origin);
        if (!this._apps[appType]) {
            this._apps[appType] = {
                ETH: new hw_app_eth_1.default(this._transports[appType]),
                BTC: new hw_app_btc_1.default(this._transports[appType])
            }[appType];
        }
        return this._apps[appType];
    }
    startListening() {
        window.addEventListener('message', async (event) => {
            if (!event) {
                return;
            }
            const { data, currentTarget, origin } = event;
            if (!data || !origin || !origin.startsWith('chrome-extension://')) {
                return;
            }
            console.log('[LEDGER-BRIDGE::MESSAGE RECEIVED]::', event);
            const { app, method, payload, callType } = data;
            const { name } = currentTarget;
            const replyOrigin = origin.replace('chrome-extension://', '');
            if (name === config_1.BRIDGE_IFRAME_NAME && method) {
                const reply = `reply::${app}::${method}::${callType}`;
                try {
                    const ledgerApp = await this.createLedgerApp(app, replyOrigin);
                    let call = null;
                    let result = null;
                    if (method.startsWith('TRANSPORT::')) {
                        const methodParts = method.split('::');
                        const { transport } = ledgerApp;
                        call = transport[methodParts[1]].bind(transport);
                    }
                    else {
                        call = ledgerApp[method].bind(ledgerApp);
                    }
                    const parsedInput = utils_1.parseInputPayload(payload);
                    switch (callType) {
                        case 'METHOD':
                            result = call(...parsedInput);
                            break;
                        case 'ASYNC_METHOD':
                            result = await call(...parsedInput);
                            break;
                        case 'PROP':
                            result = call;
                            break;
                        default:
                            break;
                    }
                    const parsedOutput = utils_1.parseOutputPayload(result);
                    this.sendMessage(replyOrigin, {
                        action: reply,
                        success: true,
                        payload: parsedOutput
                    });
                }
                catch (error) {
                    await this.clear();
                    this.sendMessage(replyOrigin, {
                        action: reply,
                        success: false,
                        payload: error
                    });
                }
            }
        });
    }
    sendMessage(origin, message) {
        console.log('[LEDGER-BRIDGE::SENDING MESSAGE TO EXTENSION]', origin, message);
        chrome.runtime.sendMessage(origin, message, (response) => {
        });
    }
}
exports.LedgerWebBridge = LedgerWebBridge;
