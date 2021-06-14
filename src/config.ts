export const BRIDGE_IFRAME_NAME = 'HW-IFRAME';

export type AppType = 'ETH' | 'BTC';

export type CallType = 'METHOD' | 'ASYNC_METHOD' | 'PROP';

export type TransportType = 'U2F' | 'WS';

export interface CallData {
    app: AppType,
    method: string,
    payload: any,
    callType: CallType,
    settings: { useLedgerLive: boolean }
}

export const TRANSPORT_CHECK_DELAY = 1000;
export const TRANSPORT_CHECK_LIMIT = 120;
export const LEDGER_LIVE_URL = 'ws://localhost:8435';
export const LEDGER_APP_NAMES = {
    ETH: 'Ethereum',
    BTC:'Bictoin',
    RBTC: 'Rsk',
}