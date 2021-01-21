// import TransportWebUsb from '@ledgerhq/hw-transport-webusb';
// import TransportWebBle from '@ledgerhq/hw-transport-web-ble';
import TransportU2F from '@ledgerhq/hw-transport-u2f';
import HWTransport from '@ledgerhq/hw-transport';
// import BTCApp from '@ledgerhq/hw-app-btc';
import ETHApp from '@ledgerhq/hw-app-eth';

const IFRAME_NAME = 'HW-IFRAME'; 
export type LedgerApp = 'BTC' | 'ETH';

export class LedgerTransportBridge {
    
    private _transport?: HWTransport<string> = null;

    async getTransport (): Promise<HWTransport<string>> {
        if (!this._transport) {
            this._transport = await TransportU2F.create();
        }
        return this._transport;
    }

    async getApp(): Promise<ETHApp> {
        try {
            const transport = await this.getTransport();
            return new ETHApp(transport);

        } catch (error) {
            console.error('Error Creating Ledger App with TransportU2F', error);
        }

        return null;
    }

    startListening () {
        window.addEventListener('message', async (event: MessageEvent) => {
            if (event) {
                const { data } = event;
                const { action, target, params } = data;
                if (target === IFRAME_NAME) {
                    console.log('on message in bridge', event);
                    var replyAction = action + '-reply';
                    switch (action) {
                        case 'unlock':
                            await this.unlock(replyAction, params.hdPath);
                            break;
                        case 'ledger-sign-transaction':
                            // _this.signTransaction(replyAction, params.hdPath, params.tx, params.to);
                            break;
                        case 'ledger-sign-personal-message':
                            // _this.signPersonalMessage(replyAction, params.hdPath, params.message);
                            break;
                    }
                }
            }
        });
    }

    sendMessage (message: any) {
        //TODO: check for the origin *
        window.parent.postMessage(message, '*');
    }

    async unlock (replyAction: string, hdPath: string) {
        try {
            const app = await this.getApp();
            var res = await app.getAddress(hdPath, false, true);

            this.sendMessage({
                action: replyAction,
                success: true,
                payload: res
            });
        } catch (err) {
            this.sendMessage({
                action: replyAction,
                success: false,
                payload: { error: this.parseLedgerError(err) }
            });
        } finally {
            this.cleanUp();
        }
    }

    parseLedgerError (err: any) {
        var isU2FError = function isU2FError(err) {
            return !!err && !!err.metaData;
        };
        var isStringError = function isStringError(err) {
            return typeof err === 'string';
        };
        var isErrorWithId = function isErrorWithId(err) {
            return err.hasOwnProperty('id') && err.hasOwnProperty('message');
        };

        // https://developers.yubico.com/U2F/Libraries/Client_error_codes.html
        if (isU2FError(err)) {
            // Timeout
            if (err.metaData.code === 5) {
                return 'LEDGER_TIMEOUT';
            }

            return err.metaData.type;
        }

        if (isStringError(err)) {
            // Wrong app logged into
            if (err.includes('6804')) {
                return 'LEDGER_WRONG_APP';
            }
            // Ledger locked
            if (err.includes('6801')) {
                return 'LEDGER_LOCKED';
            }

            return err;
        }

        if (isErrorWithId(err)) {
            // Browser doesn't support U2F
            if (err.message.includes('U2F not supported')) {
                return 'U2F_NOT_SUPPORTED';
            }
        }

        // Other
        return err.toString();
    }

    cleanUp () {
        this._transport?.close();
    }
}
