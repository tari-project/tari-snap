export type TransferRequest = {
    amount: number,
    resource_address: string,
    destination_public_key: string,
    fee: number,
};

export type GetFreeTestCoinsRequest = {
    amount: number,
    fee: number,
};