export const BRIDGE_IFRAME_NAME = 'HW-IFRAME';

export type AppType = 'ETH' | 'BTC';
export type AppTypeAsset = 'ETH' | 'BTC' | 'RBTC' | 'BNB';

export type CallType = 'METHOD' | 'ASYNC_METHOD' | 'PROP';
export type NetworkType = 'testnet' | 'mainnet';

export type TransportType = 'U2F' | 'WS';

export interface CallData {
    network: NetworkType;
    app: AppTypeAsset;
    method: string;
    payload: any;
    callType: CallType;
    settings: { useLedgerLive: boolean };
}

export const TRANSPORT_CHECK_DELAY = 1000;
export const TRANSPORT_CHECK_LIMIT = 120;
export const LEDGER_LIVE_URL = 'ws://localhost:8435';
export const LEDGER_APP_NAMES = {
    ETH: { mainnet: 'Ethereum', testnet: 'Ethereum'},
    BTC: { mainnet: 'Bitcoin', testnet: 'Bitcoin Test'},
    RBTC:  { mainnet: 'RSK', testnet: 'RSK Test'},
    BNB:  { mainnet: 'Binance Chain', testnet: 'Binance Chain'}
}

export const APP_TYPES_MAP: { [keyof: string]: AppType } = {
    ETH: 'ETH',
    BTC: 'BTC',
    RBTC: 'ETH',
    BNB: 'ETH'
}