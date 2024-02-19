export type TransferRequest = {
  amount: number,
  resource_address: string,
  destination_public_key: string,
  fee: number,
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
  substate_address: string,
};
