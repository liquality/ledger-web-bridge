
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import ETH from "@ledgerhq/hw-app-eth";
import BTC from "@ledgerhq/hw-app-btc";
import {
    AppType,
    CallData,
    BRIDGE_IFRAME_NAME
} from './config';
import { createLedgerTransport, parseInputPayload, parseOutputPayload } from './utils';

declare var chrome: any;

export class LedgerWebBridge {

    private _transports: {
        ETH?: TransportU2F,
        BTC?: TransportU2F
    } = { ETH: null, BTC: null };
    private _apps: {
        ETH?: ETH,
        BTC?: BTC
    } = { ETH: null, BTC: null };

    private _useLedgerLive: boolean = false;

    private async clear(): Promise<void> {
        this._apps.BTC = null;
        this._apps.ETH = null;

        await this._transports.BTC?.close();
        await this._transports.ETH?.close();
        this._transports = { ETH: null, BTC: null };
        this._useLedgerLive = false;
    }

    private async ensureTransportCreated(appType: AppType, origin: string): Promise<void> {
        if (!this._transports[appType]) {
            try {
                this._transports[appType] = await createLedgerTransport(appType, this._useLedgerLive);
                this._transports[appType].on('disconnect', async () => {
                    await this.clear();
                    this.sendMessage(origin, {
                        action: `transport::${appType}::disconnect`,
                        success: true
                    });
                })
            } catch (error) {
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

    private async createLedgerApp(appType: AppType, origin: string): Promise<BTC | ETH> {
        await this.ensureTransportCreated(appType, origin);

        if (!this._apps[appType]) {
            this._apps[appType] = {
                ETH: new ETH(this._transports[appType]),
                BTC: new BTC(this._transports[appType])
            }[appType];
        }

        return this._apps[appType];
    }

    private async messageListener (event: MessageEvent) {
        
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
                        this._useLedgerLive = useLedgerLive;
                        this.sendMessage(replyOrigin,
                            {
                                action: reply,
                                success: true
                            });
                    } else {

                        if (method.startsWith('TRANSPORT::')) {
                            const methodParts = method.split('::');
                            const ledgerApp = await this.createLedgerApp(app, replyOrigin);
                            const { transport } = ledgerApp
                            call = transport[methodParts[1]].bind(transport);
                        } else {
                            const ledgerApp = await this.createLedgerApp(app, replyOrigin);
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
                    }
                } catch (error) {
                    await this.clear();
                    this.sendMessage(replyOrigin,
                        {
                            action: reply,
                            success: false,
                            payload: error
                        });
                }
            }
        }, false);
    }

    sendMessage(origin: string, message: {
        action: string,
        success: boolean,
        payload?: any
    }) {
        debugger;
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
