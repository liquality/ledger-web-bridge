export const parseInputBuffer = (payload: any): any => {
    if (payload) {
        if(payload.type && payload.type === 'Hex') {
            return Buffer.from(payload.data || '', 'hex');
        }
    
        if(payload instanceof Array) {
            return payload.map(i=> parseInputBuffer(i));
        }
    
        if(typeof payload === 'object' && Object.keys(payload).length > 0) {
            const output = {};
            for (const key in payload) {
                output[key] = parseInputBuffer(payload[key]);
            }
            return output;
        }
    }

    return payload
}

export const parseOutputBuffer = (payload: any): any => {
    if(payload instanceof Buffer) {
        return { type: 'Hex', data: payload.toString('hex') };
    }

    if(payload instanceof Array) {
        return payload.map(i=> parseOutputBuffer(i));
    }

    if (payload && typeof payload === 'object') {
        if(Object.keys(payload).length > 0) {
            const output = {};
            for (const key in payload) {
                output[key] = parseOutputBuffer(payload[key]);
            }
            return output;
        }
    }

    return payload
}