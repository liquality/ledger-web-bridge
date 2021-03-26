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