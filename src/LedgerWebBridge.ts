
import Transport from "@ledgerhq/hw-transport";
import ETH from "@ledgerhq/hw-app-eth";
import BTC from "@ledgerhq/hw-app-btc";
import {
    AppType,
    CallData,
    BRIDGE_IFRAME_NAME,
    LEDGER_APP_NAMES,
    LEDGER_LIVE_URL
} from './config';
import { checkWSTransportLoop, parseInputPayload, parseOutputPayload } from './utils';
import TransportU2F from "@ledgerhq/hw-transport-u2f";
import WebSocketTransport from '@ledgerhq/hw-transport-http/lib/WebSocketTransport';

declare var chrome: any;

export class LedgerWebBridge {

    private _transport: Transport = null;
    private _useLedgerLive: boolean = false;
    private _app: BTC | ETH = null;

    private async clear(): Promise<void> {
        await this._transport?.close();
        this._app = null;
    }

    private appShouldBeCreated(appType: AppType) {
        if (!this._app 
            || this._app instanceof BTC && appType === 'ETH'
            || this._app instanceof ETH && appType === 'BTC') {
            return true;
        }

        return false;
    }


    private async setupLedgerApp(appType: AppType, origin: string): Promise<void> {
        if (this._useLedgerLive) {
            let reestablish = false;

            try {
                await WebSocketTransport.check(LEDGER_LIVE_URL)
            } catch (_err) {
                const appName: string = LEDGER_APP_NAMES[appType];
                window.open(`ledgerlive://bridge?appName=${appName}`);
                await checkWSTransportLoop();
                reestablish = true;
            }

            if (this.appShouldBeCreated(appType) || reestablish) {
                this._transport = await WebSocketTransport.open(LEDGER_LIVE_URL);
                this.createLedgerApp(appType);
            }
        }
        else {
            this._transport = await TransportU2F.create()
            this.createLedgerApp(appType);
        }
        this._transport?.on('disconnect', async () => {
            await this.clear();
            this.sendMessage(origin, {
                action: `transport::${appType}::disconnect`,
                success: true
            });
        });
    }

    private createLedgerApp(appType: AppType): BTC | ETH {
        switch (appType) {
            case 'ETH':
                this._app = new ETH(this._transport);
                break;
            case 'BTC':
                this._app = new BTC(this._transport);
                break;
            default:
                break;
        }
    }

    startListening() {
        window.addEventListener('message', async (event: MessageEvent) => {
            if (!event) {
                return
            }

            const { data, currentTarget, origin } = event;
            if (!data || !origin || !origin.startsWith('chrome-extension://')) {
                return
            }
            console.log('[LEDGER-BRIDGE::MESSAGE RECEIVED]::', event);
            const {
                app,
                method,
                payload,
                callType
            } = data as CallData;
            const { name } = currentTarget as any;
            const replyOrigin = origin.replace('chrome-extension://', '')

            if (name === BRIDGE_IFRAME_NAME && method) {
                const reply = `reply::${app}::${method}::${callType}`;
                try {
                    let call = null;
                    let result = null;
                    if (method === 'UPDATE-TRANSPORT-PREFERENCE') {
                        const { useLedgerLive } = payload;
                        await this.clear();
                        this._useLedgerLive = useLedgerLive || false;
                        this.sendMessage(replyOrigin,
                            {
                                action: reply,
                                success: true
                            });
                    } else {
                        await this.setupLedgerApp(app, replyOrigin);
                        if (this._app) {
                            if (method.startsWith('TRANSPORT::')) {
                                const methodParts = method.split('::');
                                const { transport } = this._app
                                call = transport[methodParts[1]].bind(transport);
                            } else {
                                const ledgerApp = this._app;
                                call = ledgerApp[method].bind(ledgerApp);
                            }
    
                            const parsedInput = parseInputPayload(payload)
    
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
    
                            const parsedOutput = parseOutputPayload(result)
    
                            this.sendMessage(replyOrigin,
                                {
                                    action: reply,
                                    success: true,
                                    payload: parsedOutput
                                });   
                        } else {
                            throw new Error('No ledger app created');
                        }
                    }
                } catch (error) {
                    this.sendMessage(replyOrigin,
                        {
                            action: reply,
                            success: false,
                            payload: error
                        });
                } finally {
                    if (!this._useLedgerLive) {
                        await this.clear();
                    }
                }
            }
        }, false);
    }

    sendMessage(origin: string, message: {
        action: string,
        success: boolean,
        payload?: any
    }) {
        const data = {
            ...message,
            useLedgerLive: this._useLedgerLive
        }
        console.log('[LEDGER-BRIDGE::SENDING MESSAGE TO EXTENSION]', origin, data);
        chrome.runtime.sendMessage(origin,
            data,
            (response: any) => {
                //console.log('[HW-BRIDGE]: received message result', response);
            });
    }
}
