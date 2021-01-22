import Client from '@liquality/client';
import BitcoinLedgerProvider from '@liquality/bitcoin-ledger-provider';
import EthereumLedgerProvider from '@liquality/ethereum-ledger-provider';
import { NetworkConfig, NetworkType } from './config'

const IFRAME_NAME = 'HW-IFRAME';
export type HardwareType = 'bitcoin_ledger_legacy' |
    'bitcoin_ledger_nagive_segwit' |
    'ethereum_ledger';

export const BitcoinAddressType = {
    bitcoin_ledger_legacy: 'legacy',
    bitcoin_ledger_nagive_segwit: 'bech32'
};

export class LedgerTransportBridge {

    private _clients: { [k: string]: Client } = {};

    private createETHClient(networkType: NetworkType) {
        const network = NetworkConfig.ETH[networkType];
        const client = new Client();
        const ledger = new EthereumLedgerProvider(network);
        ledger.useU2F();
        client.addProvider(ledger);
        return client;
    }

    private createBTCClient(networkType: NetworkType, hardware: HardwareType) {
        const network = NetworkConfig.BTC[networkType];
        const client = new Client();
        const addressType = BitcoinAddressType[hardware];
        const ledger = new BitcoinLedgerProvider(network, addressType)
        ledger.useU2F();
        client.addProvider(ledger);
        return client;
    }

    getClient(networkType: NetworkType, hardware: HardwareType) {
        const key = `${hardware}-${networkType}`;

        if (!this._clients.hasOwnProperty(key)) {
            if ([
                'bitcoin_ledger_legacy',
                'bitcoin_ledger_nagive_segwit'
            ].includes(hardware)) {
                this._clients[key] = this.createBTCClient(networkType, hardware);
            } else if (hardware === 'ethereum_ledger') {
                this._clients[key] = this.createETHClient(networkType);
            } else {
                throw new Error(`No client available for: ${key}`);
            }
        }

        return this._clients[key];
    }

    startListening() {
        window.addEventListener('message', async (event: MessageEvent) => {
            console.log('on bridge', event);
            if (event) {
                const { data } = event;
                const {
                    target,
                    hw,
                    network,
                    ns,
                    method,
                    payload
                } = data;
                if (target === IFRAME_NAME) {
                    const reply = `reply::${hw}::${ns}.${method}`;
                    try {
                        const client = this.getClient(network, hw);
                        const component = client[ns];
                        const call = component[method].bind(component);
                        const result = await call(...payload);

                        this.sendMessage({
                            action: reply,
                            success: true,
                            payload: result
                        });
                    } catch (error) {
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
        payload: any
    }) {
        //TODO: check for the origin *
        window.parent.postMessage(message, '*');
    }
}
