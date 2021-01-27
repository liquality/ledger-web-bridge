import './polyfills';

import { LedgerWebBridge } from "./LedgerWebBridge";

const run = () => {
    const bridge = new LedgerWebBridge();
    bridge.startListening();
}

run();