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
    let authRequestParams = {
        permissions: ["AccountInfo"],
        duration: null,
    };
    let authRequestResponse = await tariWalletRequest(tari_wallet_daemon_url, null, 'auth.request', authRequestParams);
    let { auth_token } = authRequestResponse;

    // 2. auth.accept
    let authAcceptParams = {
        auth_token,
        name: 'tari-snap',
    };
    let authAcceptResponse = await tariWalletRequest(tari_wallet_daemon_url, null, 'auth.accept', authAcceptParams);
    let { permissions_token } = authAcceptResponse;

    // 3. get default account address
    const accountGetDefault = await tariWalletRequest(tari_wallet_daemon_url, permissions_token, 'accounts.get_default', {});
    const accountAddress = accountGetDefault.account.address.Component;

    // 4. request a new token with the permission to get account balances
    authRequestParams = {
        permissions: ["AccountInfo", {"AccountBalance": { "Component": accountAddress}}, "KeyList", "TransactionGet", {"TransactionSend": null}],
        duration: null,
    };
    authRequestResponse = await tariWalletRequest(tari_wallet_daemon_url, null, 'auth.request', authRequestParams);
    auth_token = authRequestResponse.auth_token;

    // 5. accept the token
    authAcceptParams = {
        auth_token,
        name: 'tari-snap',
    };
    authAcceptResponse = await tariWalletRequest(tari_wallet_daemon_url, null, 'auth.accept', authAcceptParams);
    permissions_token = authAcceptResponse.permissions_token;

    return permissions_token;
}

export async function sendWalletRequest(tari_wallet_daemon_url: string, token: string, walletRequest: WalletRequest) {
    const { method, params } = walletRequest;
    const response = await tariWalletRequest(tari_wallet_daemon_url, token, method, params);
    return response;
}
