"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_TYPES_MAP = exports.LEDGER_APP_NAMES = exports.LEDGER_LIVE_URL = exports.TRANSPORT_CHECK_LIMIT = exports.TRANSPORT_CHECK_DELAY = exports.BRIDGE_IFRAME_NAME = void 0;
exports.BRIDGE_IFRAME_NAME = 'HW-IFRAME';
exports.TRANSPORT_CHECK_DELAY = 1000;
exports.TRANSPORT_CHECK_LIMIT = 120;
exports.LEDGER_LIVE_URL = 'ws://localhost:8435';
exports.LEDGER_APP_NAMES = {
    ETH: { mainnet: 'Ethereum', testnet: 'Ethereum' },
    BTC: { mainnet: 'Bitcoin', testnet: 'Bitcoin Test' },
    RBTC: { mainnet: 'RSK', testnet: 'RSK Test' },
    BNB: { mainnet: 'Binance Chain', testnet: 'Binance Chain' }
};
exports.APP_TYPES_MAP = {
    ETH: 'ETH',
    BTC: 'BTC',
    RBTC: 'ETH',
    BNB: 'ETH'
};
