export type TransferRequest = {
  amount: number;
  resource_address: string;
  destination_public_key: string;
  fee: number;
};

export type ConfidentialTransferRequest = {
  amount: number;
  resource_address: string;
  destination_public_key: string;
  fee: number;
};

export type GetFreeTestCoinsRequest = {
  amount: number;
  fee: number;
};

export type SendTransactionRequest = {
  fee_instructions: object[];
  instructions: object[];
  input_refs: object[];
  required_substates: object[];
  is_dry_run: boolean;
};

export type SendInstructionRequest = {
  fee_instructions: object[];
  instructions: object[];
  input_refs: object[];
  required_substates: object[];
  is_dry_run: boolean;
  fee: number;
  dump_account: string;
};

export type GetSubstateRequest = {
  substate_address: string;
};

export type GetRistrettoPublicKeyRequest = {
  index: number;
};

export type GetConfidentialVaultBalancesRequest = {
  view_key_id: number;
  vault_id: string;
  minimum_expected_value: number | null;
  maximum_expected_value: number | null;
};

export type ListSubstatesRequest = {
  filter_by_template: string | null;
  filter_by_type: string | null;
  limit: bigint | null;
  offset: bigint | null;
}
