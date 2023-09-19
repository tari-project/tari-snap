export type SetWalletParams = {
    tari_wallet_daemon_url: string;
};

export type GetWalletTokenParams = {
    permissions: Array<TariPermission>;
};

export type TariPermission =
    { "GetOwnershipProof": null } |
    "AccountBalance" |
    "AccountInfo" |
    "AccountList" |
    "KeyList" |
    "TransactionGet" |
    { "TransactionSend": null } |
    { "GetNft": [null, null] };