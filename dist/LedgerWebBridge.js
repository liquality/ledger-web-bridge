"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerWebBridge = void 0;
const hw_app_eth_1 = __importDefault(require("@ledgerhq/hw-app-eth"));
const hw_app_btc_1 = __importDefault(require("@ledgerhq/hw-app-btc"));
const config_1 = require("./config");
const utils_1 = require("./utils");
const hw_transport_webusb_1 = __importDefault(require("@ledgerhq/hw-transport-webusb"));
class LedgerWebBridge {
    constructor() {
        this._transport = null;
        this._origin = 'dmbnhcbjpmejblkannpmedcanlgblfcf';
    }
    get port() {
        this._port = chrome.runtime.connect(this._origin, { name: 'LEDGER-WEB-BRIDGE' });
        this._port?.onDisconnect.addListener((_port) => this.clear());
        return this._port;
    }
    async clear() {
        await this._transport?.close();
        this._port = null;
    }
    async createTransport() {
        this._transport = await hw_transport_webusb_1.default.create();
        this._transport?.on('disconnect', async () => {
            await this.clear();
            this.sendMessage({
                action: `TRANSPORT_DISCONECTED`
            });
        });
        this.sendMessage({
            action: 'TRANSPORT_CREATED'
        });
    }
    createLedgerApp(appTypeAsset) {
        const appType = config_1.APP_TYPES_MAP[appTypeAsset];
        if (!this._transport) {
            this.createTransport();
        }
        switch (appType) {
            case 'ETH':
                return new hw_app_eth_1.default(this._transport);
            case 'BTC':
                return new hw_app_btc_1.default(this._transport);
            default:
                return null;
        }
    }
    listenForMessages() {
        this.port.onMessage.addListener(async (message, sender, sendResponse) => {
            console.log('[LEDGER-BRIDGE::MESSAGE RECEIVED]::', message, sender);
            const { network, app, method, payload, callType } = message;
            const reply = `reply::${network}::${app}::${method}::${callType}`;
            try {
                let call = null;
                let result = null;
                const ledgerApp = await this.createLedgerApp(app);
                if (ledgerApp) {
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
                    this.sendMessage({
                        action: reply,
                        success: true,
                        payload: parsedOutput
                    });
                }
                else {
                    throw new Error('No ledger app created');
                }
            }
            catch (error) {
                console.error(error);
                this.sendMessage({
                    action: reply,
                    success: false,
                    payload: error
                });
            }
            finally {
            }
        });
    }
    sendMessage(message) {
        console.log('[LEDGER-BRIDGE::SENDING MESSAGE TO EXTENSION]', message);
        this._port?.postMessage(message);
    }
}
exports.LedgerWebBridge = LedgerWebBridge;
