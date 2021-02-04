var global = global || window;

import './polyfills';

import { LedgerWebBridge } from "./LedgerWebBridge";

const run = () => {
    const bridge = new LedgerWebBridge();
    bridge.startListening();
    console.log('LEDGER-BRIDGE: start listening')
}

run();