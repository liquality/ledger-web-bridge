import WebSocketTransport from '@ledgerhq/hw-transport-http/lib/WebSocketTransport';
import { LEDGER_LIVE_URL, TRANSPORT_CHECK_DELAY, TRANSPORT_CHECK_LIMIT } from './config';

export const parseInputPayload = (payload: any): any => {
    if (payload) {
        if(payload.type && payload.type === 'Hex') {
            return Buffer.from(payload.data || '', 'hex');
        }
    
        if(payload instanceof Array) {
            return payload.map(i=> parseInputPayload(i));
        }
    
        if(typeof payload === 'object' && Object.keys(payload).length > 0) {
            const output = {};
            for (const key in payload) {
                output[key] = parseInputPayload(payload[key]);
            }
            return output;
        }
    }

    return payload
}

export const parseOutputPayload = (payload: any): any => {
    if(payload instanceof Buffer) {
        return { type: 'Hex', data: payload.toString('hex') };
    }

    if(payload instanceof Array) {
        return payload.map(i=> parseOutputPayload(i));
    }

    if (payload && typeof payload === 'object') {
        if(Object.keys(payload).length > 0) {
            const output = {};
            for (const key in payload) {
                output[key] = parseOutputPayload(payload[key]);
            }
            return output;
        }
    }

    return payload
}


export const makeDelay = async (ms: number): Promise<void> =>  {
    return new Promise((success) => setTimeout(success, ms))
};

export const checkWSTransportLoop = async (iteration: number = 0): Promise<void> => {
    const iterator = iteration || 0
    return await WebSocketTransport.check(LEDGER_LIVE_URL).catch(async () => {
        await makeDelay(TRANSPORT_CHECK_DELAY)
        if (iterator < TRANSPORT_CHECK_LIMIT) {
            return checkWSTransportLoop(iterator + 1)
        } else {
            throw new Error('Ledger transport check timeout')
        }
    })
}