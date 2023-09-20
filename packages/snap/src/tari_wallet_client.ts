import { TariPermission, WalletRequest } from "./types";

export async function tariWalletRequest(tari_wallet_daemon_url: string, token: string | null, method: string, params: any) {
    const baseUrl = `${tari_wallet_daemon_url}/json_rpc`;

    let headers: HeadersInit = {
        'content-type': 'application/json',
        accept: 'application/json',
    };
    if (token) {
        headers = { ...headers, Authorization: `Bearer ${token}`};
    }

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
    const data = await response.json();
    // TODO: handle/display/log errors
    return data.result;
}

export async function getWalletToken(tari_wallet_daemon_url: string, permissions: Array<TariPermission>) {
    // 1. auth.request
    const authRequestParams = {
        permissions: ["AccountInfo", "KeyList", "TransactionGet", {"TransactionSend": null}],
        duration: null,
    };
    const authRequestResponse = await tariWalletRequest(tari_wallet_daemon_url, null, 'auth.request', authRequestParams);
    const { auth_token } = authRequestResponse;

    // 2. auth.accept
    const authAcceptParams = {
        auth_token,
        name: 'tari-snap',
    };
    const authAcceptResponse = await tariWalletRequest(tari_wallet_daemon_url, null, 'auth.accept', authAcceptParams);
    const { permissions_token } = authAcceptResponse;

    return permissions_token;
}

export async function sendWalletRequest(tari_wallet_daemon_url: string, token: string, walletRequest: WalletRequest) {
    const { method, params } = walletRequest;
    const response = await tariWalletRequest(tari_wallet_daemon_url, token, method, params);
    return response;
}
