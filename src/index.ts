var global = global || window;
declare var chrome: any;

import './polyfills';

import { LedgerWebBridge } from "./LedgerWebBridge";

const run = () => {
    const trigger = document.querySelector('#usb');
    trigger.addEventListener('click', async (e) => {
        try {
            const device = await (navigator as any).usb.requestDevice({filters: [{
                vendorId: 0x2c97
            }]});
            console.log('device:', device);
            const bridge = new LedgerWebBridge();
            bridge.startListening();
            bridge.sendMessage(
                {
                    action: 'test',
                    success: true,
                    payload: { a: 1}
                })
            console.log('LEDGER-BRIDGE: start listening');
        } catch (err) {
            console.error(err);
        }
    });
}

run();