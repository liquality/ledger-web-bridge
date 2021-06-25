var global = global || window;

import './polyfills';
import { LedgerWebBridge } from "./LedgerWebBridge";

const run = () => {
    const bridge = new LedgerWebBridge();
    const trigger = document.querySelector('#enable_usb');
    trigger.addEventListener('click', async (e) => {
        try {
            await bridge.createTransport();
            bridge.sendMessage({
                action: 'TRANSPORT_CREATED'
            });
        } catch (err) {
            console.error(err);
        }
    });
    bridge.listenForMessages();
    bridge.sendMessage({
        action: 'LISTENER_STARTED'
    });
    window.onbeforeunload = () => { // Prompt on trying to leave app
        bridge.sendMessage({
            action: 'BRIDGE_CLOSED'
        });
        bridge.clear();
        return true
      }
    console.log('LEDGER-BRIDGE: start listening');
}

run();