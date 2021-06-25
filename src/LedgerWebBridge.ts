
import Transport from "@ledgerhq/hw-transport";
import ETHApp from "@ledgerhq/hw-app-eth";
import BTCApp from "@ledgerhq/hw-app-btc";
import {
    CallData,
    BRIDGE_IFRAME_NAME,
    APP_TYPES_MAP,
    AppTypeAsset
} from './config';
import { parseInputPayload, parseOutputPayload } from './utils';
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";

declare var chrome: any;

export class LedgerWebBridge {

    private _transport: Transport = null;
    private _port: any;
    private readonly _origin: string = 'dmbnhcbjpmejblkannpmedcanlgblfcf';

    public get port() : any {
        this._port = chrome.runtime.connect(this._origin, { name: 'LEDGER-WEB-BRIDGE'});
        this._port?.onDisconnect.addListener((_port: any) =>  this.clear());
        return this._port;
    }
    
    public async clear(): Promise<void> {
        await this._transport?.close();
        this._port = null;
    }

    public async createTransport(): Promise<void> {
        this._transport = await TransportWebUSB.create();
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

    private createLedgerApp(appTypeAsset: AppTypeAsset): ETHApp | BTCApp {
        const appType = APP_TYPES_MAP[appTypeAsset];
        if(!this._transport) {
            this.createTransport();
        }
        
        switch (appType) {
            case 'ETH':
                return new ETHApp(this._transport);
            case 'BTC':
                return new BTCApp(this._transport);
            default:
                return null;
        }
    }


    listenForMessages() {
        this.port.onMessage.addListener(async (message: any, sender: any, sendResponse: ()=> void ) => {
            console.log('[LEDGER-BRIDGE::MESSAGE RECEIVED]::', message, sender);
            const {
                network,
                app,
                method,
                payload,
                callType
            } = message as CallData;
                const reply = `reply::${network}::${app}::${method}::${callType}`;
                try {
                    let call = null;
                    let result = null;
                    const ledgerApp = await this.createLedgerApp(app);
                        if (ledgerApp) {
                            if (method.startsWith('TRANSPORT::')) {
                                const methodParts = method.split('::');
                                const { transport } = ledgerApp
                                call = transport[methodParts[1]].bind(transport);
                            } else {
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
    
                            this.sendMessage(
                                {
                                    action: reply,
                                    success: true,
                                    payload: parsedOutput
                                });   
                        } else {
                            throw new Error('No ledger app created');
                        }
                } catch (error) {
                    console.error(error);
                    this.sendMessage(
                        {
                            action: reply,
                            success: false,
                            payload: error
                        });
                } finally {
                    //await this.clear();
                }
        });
    }

    sendMessage (message: {
        action: string,
        success?: boolean,
        payload?: any
    }) {
        console.log('[LEDGER-BRIDGE::SENDING MESSAGE TO EXTENSION]', message);
        this._port?.postMessage(message);
    }
}
