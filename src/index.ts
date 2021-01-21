import './polyfills';

import { LedgerTransportBridge } from "./LedgerTransportBridge";

const run = () => {
    const bridge = new LedgerTransportBridge();
    bridge.startListening();
}

run();