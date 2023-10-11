export async function sendIndexerRequest(tari_indexer_url: string, method: string, params: Object) {
    let headers: HeadersInit = {
        'content-type': 'application/json',
        accept: 'application/json',
    };

    const body = {
        jsonrpc: '2.0',
        method,
        params,
        id: 1
    };

    const requestParams: RequestInit = {
        headers,
        method: 'POST',
        body: JSON.stringify(body),
    };

    // TODO: handle/display/log errors
    const response = await fetch(tari_indexer_url, requestParams);
    const { result} = await response.json();
    return result;
}

export function decode_resource_address(tagged: Object): string {
    const int_array = extract_tagged_int_array(tagged);
    const hex = int_array_to_hex(int_array);
    return `resource_${hex}`;
}

export function decode_vault_id(tagged: Object): string {
    const int_array = extract_tagged_int_array(tagged);
    const hex = int_array_to_hex(int_array);
    return `vault_${hex}`;
}

export function int_array_to_hex(int_array: number[]) {
    return int_array.map(i => {
        var h = (i).toString(16);
        return h.length % 2 ? '0' + h : h;
    }).join('');
}

export function extract_tagged_int_array(tagged: Object): number[] {
    // position 0 is the binary tag and position 1 is the actual value
    return tagged['@@TAGGED@@'][1];
}