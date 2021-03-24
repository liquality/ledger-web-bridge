export const parseInputBuffer = (input: any): any => {
    if (input) {
        if(input.data && input.type && input.type === 'Hex') {
            return Buffer.from(input.data, 'hex');
        }
    
        if(input instanceof Array) {
            return input.map(i=> parseInputBuffer(i));
        }
    
        if(typeof input === 'object' && Object.keys(input).length > 0) {
            const output = {};
            for (const key in input) {
                output[key] = parseInputBuffer(input[key]);
            }
            return output;
        }
    }

    return input
}

export const parseOutputBuffer = (input: any): any => {
    if(input instanceof Buffer) {
        return { type: 'Hex', data: input.toString('hex') };
    }

    if(input instanceof Array) {
        return input.map(i=> parseOutputBuffer(i));
    }

    if (input && typeof input === 'object') {
        if(Object.keys(input).length > 0) {
            const output = {};
            for (const key in input) {
                output[key] = parseOutputBuffer(input[key]);
            }
            return output;
        }
    }

    return input
}