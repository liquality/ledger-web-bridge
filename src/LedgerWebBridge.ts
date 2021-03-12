
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import ETH from "@ledgerhq/hw-app-eth";
import BTC from "@ledgerhq/hw-app-btc";
import { AppType, CallData, BRIDGE_IFRAME_NAME, BUFFER_PARAM_METHODS } from './config';

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

    private async clear(): Promise<void> {
        this._apps.BTC = null;
        this._apps.ETH = null;

        await this._transports.BTC?.close();
        await this._transports.ETH?.close();
        this._transports = { ETH: null, BTC: null };
    }

    private async ensureTransportCreated(appType: AppType, origin: string): Promise<void> {
        if (!this._transports[appType]) {
            try {
                this._transports[appType] = await TransportU2F.create();
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

    startListening() {
        window.addEventListener('message', async (event: MessageEvent) => {
            if (!event) {
                return
            }

            const { data, currentTarget, origin } = event;
            if (!data || !origin || !origin.startsWith('chrome-extension://')) {
                return
            }
            console.log('RECEIVED MESSAGE ON BRIDGE:', event);
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
                    const ledgerApp = await this.createLedgerApp(app, replyOrigin);
                    let call = null;
                    let result = null;

                    if (method.startsWith('TRANSPORT::')) {
                        const methodParts = method.split('::');
                        const { transport } = ledgerApp
                        call = transport[methodParts[1]].bind(transport);
                    } else {
                        call = ledgerApp[method].bind(ledgerApp);
                    }

                    const parsedPayload = this.parsePayload(app, method, payload)

                    switch (callType) {
                        case 'METHOD':
                            result = call(...parsedPayload);
                            break;
                        case 'ASYNC_METHOD':
                            result = await call(...parsedPayload);
                            break;
                        case 'PROP':
                            result = call;
                            break;
                        default:
                            break;
                    }

                    this.sendMessage(replyOrigin,
                        {
                            action: reply,
                            success: true,
                            payload: result
                        });
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
        });
    }

    sendMessage(origin: string, message: {
        action: string,
        success: boolean,
        payload?: any
    }) {
        console.log('[HW-BRIDGE]: Sending response', origin, message)
        chrome.runtime.sendMessage(origin, message, (response: any) => {
            console.log('[HW-BRIDGE]: received message result', response);
        });
    }

    parsePayload(appType: AppType, method: string, payload: any): any {

        if(BUFFER_PARAM_METHODS[appType] && 
            BUFFER_PARAM_METHODS[appType].includes(method)) {
                // TODO: pase buffers
        }

        return payload
    }
}
