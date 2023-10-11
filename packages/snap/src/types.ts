export type SetWalletParams = {
    tari_wallet_daemon_url: string;
};

export type TariPermission = Object;

export type SendWalletRequestParams = {
    token: string,
    walletRequest: WalletRequest
};

export type WalletRequest = {
    method: string,
    params: Object
};

export type TransferRequest = {
    amount: number,
    resource_address: string,
    destination_public_key: string,
    fee: number,
};
