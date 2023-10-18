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

export type SendTransactionRequest = {
    instructions: Object[],
    input_refs: Object[],
    required_substates: Object[],
    is_dry_run: boolean, 
};