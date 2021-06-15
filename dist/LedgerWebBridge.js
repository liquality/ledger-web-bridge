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
const hw_transport_u2f_1 = __importDefault(require("@ledgerhq/hw-transport-u2f"));
const WebSocketTransport_1 = __importDefault(require("@ledgerhq/hw-transport-http/lib/WebSocketTransport"));
class LedgerWebBridge {
    constructor() {
        this._transport = null;
        this._useLedgerLive = false;
        this._app = null;
    }
    async clear() {
        await this._transport?.close();
        this._app = null;
    }
    appShouldBeCreated(appTypeAsset) {
        const appType = config_1.APP_TYPES_MAP[appTypeAsset];
        if (!this._app
            || this._app instanceof hw_app_btc_1.default && appType === 'ETH'
            || this._app instanceof hw_app_eth_1.default && appType === 'BTC') {
            return true;
        }
        return false;
    }
    async setupLedgerApp(network, appTypeAsset, origin) {
        if (this._useLedgerLive) {
            let reestablish = false;
            try {
                await WebSocketTransport_1.default.check(config_1.LEDGER_LIVE_URL);
            }
            catch (_err) {
                console.log(appTypeAsset, network);
                const appName = config_1.LEDGER_APP_NAMES[appTypeAsset][network];
                window.open(`ledgerlive://bridge?appName=${appName}`);
                await utils_1.checkWSTransportLoop();
                reestablish = true;
            }
            if (this.appShouldBeCreated(appTypeAsset) || reestablish) {
                this._transport = await WebSocketTransport_1.default.open(config_1.LEDGER_LIVE_URL);
                this.createLedgerApp(appTypeAsset);
            }
        }
        else {
            this._transport = await hw_transport_u2f_1.default.create();
            this.createLedgerApp(appTypeAsset);
        }
        this._transport?.on('disconnect', async () => {
            await this.clear();
            this.sendMessage(origin, {
                action: `transport::${appTypeAsset}::disconnect`,
                success: true
            });
        });
    }
    createLedgerApp(appTypeAsset) {
        const appType = config_1.APP_TYPES_MAP[appTypeAsset];
        switch (appType) {
            case 'ETH':
                this._app = new hw_app_eth_1.default(this._transport);
                break;
            case 'BTC':
                this._app = new hw_app_btc_1.default(this._transport);
                break;
            default:
                break;
        }
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
            const { network, app, method, payload, callType } = data;
            const { name } = currentTarget;
            const replyOrigin = origin.replace('chrome-extension://', '');
            if (name === config_1.BRIDGE_IFRAME_NAME && method) {
                const reply = `reply::${network}::${app}::${method}::${callType}`;
                try {
                    let call = null;
                    let result = null;
                    if (method === 'UPDATE-TRANSPORT-PREFERENCE') {
                        const { useLedgerLive } = payload;
                        await this.clear();
                        this._useLedgerLive = useLedgerLive || false;
                        this.sendMessage(replyOrigin, {
                            action: reply,
                            success: true
                        });
                    }
                    else {
                        await this.setupLedgerApp(network, app, replyOrigin);
                        if (this._app) {
                            if (method.startsWith('TRANSPORT::')) {
                                const methodParts = method.split('::');
                                const { transport } = this._app;
                                call = transport[methodParts[1]].bind(transport);
                            }
                            else {
                                const ledgerApp = this._app;
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
                        else {
                            throw new Error('No ledger app created');
                        }
                    }
                }
                catch (error) {
                    console.error(error);
                    this.sendMessage(replyOrigin, {
                        action: reply,
                        success: false,
                        payload: error
                    });
                }
                finally {
                    if (!this._useLedgerLive) {
                        await this.clear();
                    }
                }
            }
        }, false);
    }
    sendMessage(origin, message) {
        const data = {
            ...message,
            useLedgerLive: this._useLedgerLive
        };
        console.log('[LEDGER-BRIDGE::SENDING MESSAGE TO EXTENSION]', origin, data);
        chrome.runtime.sendMessage(origin, data, (response) => {
        });
    }
}
exports.LedgerWebBridge = LedgerWebBridge;
