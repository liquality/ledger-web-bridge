
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import ETH from "@ledgerhq/hw-app-eth";
import BTC from "@ledgerhq/hw-app-btc";

const IFRAME_NAME = 'HW-IFRAME';


export class LedgerWebBridge {

    private _transport?: TransportU2F = null;
    private _apps: {
        ETH?: ETH,
        BTC?: BTC
    } = { ETH: null, BTC: null};

    private async clear (): Promise<void> {
        this._apps.BTC = null;
        this._apps.ETH = null;
        await this._transport?.close();
        this._transport = null;
    }

    private async ensureTransportCreated (): Promise<void> {
        if (!this._transport) {
            try {
                this._transport = await TransportU2F.create();
                this._transport?.on('disconnect', async () => {
                    await this.clear();
                    this.sendMessage({ 
                        action: 'transport::disconnect', 
                        success: true 
                    });
                })
            } catch (error) {
                await this.clear();
                console.error(error);
                this.sendMessage({ 
                    action: 'transport::error', 
                    success: false, 
                    payload: error 
                });
            }
        }
        
    }
    private async createLedgerApp (appType: 'ETH' | 'BTC'): Promise<BTC | ETH> {
            await this.ensureTransportCreated();

            if (!this._apps[appType]) {
                this._apps[appType] = {
                    ETH: new ETH(this._transport),
                    BTC: new BTC(this._transport)
                }[appType]; 
            }

        return this._apps[appType];
    }

    startListening () {
        window.addEventListener('message', async (event: MessageEvent) => {
            if (event) {
                const { data } = event;
                const {
                    target,
                    app,
                    method,
                    payload
                } = data;
                if (target === IFRAME_NAME) {
                    console.log('RECEIVED MESSAGE ON BRIDGE:', event);
                    const reply = `reply::${app}::${method}`;
                    try {
                        const ledgerApp = await this.createLedgerApp(app);
                        const call = ledgerApp[method].bind(ledgerApp);
                        const result = await call(...payload);

                        this.sendMessage({
                            action: reply,
                            success: true,
                            payload: result
                        });
                    } catch (error) {
                        await this.clear();
                        this.sendMessage({
                            action: reply,
                            success: false,
                            payload: error
                        });
                    }
                }
            }
        });
    }

    sendMessage(message: {
        action: string,
        success: boolean,
        payload?: any
    }) {
        //TODO: check for the origin *
        window.parent.postMessage(message, '*');
    }
}
