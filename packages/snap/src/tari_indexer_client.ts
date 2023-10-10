import { IndexerRequest, TariPermission, WalletRequest } from "./types";

export async function tariIndexerRequest(tari_indexer_url: string, method: string, params: any) {
    const baseUrl = `${tari_indexer_url}`;

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

    const response = await fetch(baseUrl, requestParams);
    return response;
}

export async function sendIndexerRequest(tari_indexer_url: string, indexerRequest: IndexerRequest) {
    const { method, params } = indexerRequest;
    const response = await tariIndexerRequest(tari_indexer_url, method, params);
    return response;
}

export function int_array_to_resource_address(int_array: number[]) {
    return "resource_" + int_array_to_hex(int_array);
}

export function int_array_to_hex(int_array: number[]) {
    return int_array.map(i => {
        var h = (i).toString(16);
        return h.length % 2 ? '0' + h : h;
    }).join('');
}
