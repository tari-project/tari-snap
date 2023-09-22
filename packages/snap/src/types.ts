export type SetWalletParams = {
    tari_wallet_daemon_url: string;
};

export type GetWalletTokenParams = {
    permissions: Array<TariPermission>;
};

export type TariPermission = Object;

export type GetWalletPublicKeyParams = {
    token: string;
};

export type SendWalletRequestParams = {
    token: string,
    walletRequest: WalletRequest
};

export type WalletRequest = {
    method: string,
    params: Object
};