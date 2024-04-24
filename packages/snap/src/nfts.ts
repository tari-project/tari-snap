import { Json, JsonRpcRequest } from '@metamask/snaps-types';
import * as tari_wallet_lib from './tari_wallet_lib';
import { substateExists } from './tari_indexer_client';
import { getRistrettoKeyPair } from './keys';
import { SendInstructionRequest, SendTransactionRequest } from './types';
import {
  sendInstructionInternal,
  sendTransactionInternal,
  waitForTransactionResult,
} from './transactions';

const ACCOUNT_NFT_TEMPLATE =
  '0000000000000000000000000000000000000000000000000000000000000001';

export type MintAccountNftRequest = {
  metadata: Object;
  fee: number;
};

async function createAccountNftComponent(wasm: tari_wallet_lib.InitOutput, fee: number) {
  // send the transaction to create the account nft component
  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);
  const account_component_address =
    tari_wallet_lib.get_account_component_address(public_key);
  const owner_token = await tari_wallet_lib.get_owner_token(public_key);
  const encoded_fee = await tari_wallet_lib.encode_amount(fee);
  let sendTransactionRequest: SendTransactionRequest = {
    instructions: [
      {
        CallFunction: {
          template_address: ACCOUNT_NFT_TEMPLATE,
          function: 'create',
          args: [{ Literal: owner_token }],
        }
      },
    ],
    fee_instructions: [
      {
        CallMethod: {
          component_address: account_component_address,
          method: 'pay_fee',
          args: [{ Literal: encoded_fee }],
        },
      },
    ],
    input_refs: [],
    required_substates: [{
      substate_id: account_component_address,
      version: null,
    }],
    is_dry_run: false,
  };

  // wait for the result of the account nft component
  const { transaction_id } = await sendTransactionInternal(wasm, sendTransactionRequest);
  const { execution_result } = await waitForTransactionResult(transaction_id);

  // extract and return the account nft component address
  let { up_substates } = execution_result.finalize.result.Accept;
  for (let i = 0; i < up_substates.length; i++) {
    const [id, substate] = up_substates[i];
    if (id.Component && substate.substate.Component.template_address === ACCOUNT_NFT_TEMPLATE) {
      return id.Component;
    }
  }

  throw new Error("Account NFT component was not created");
}

export async function mintAccountNft(
  wasm: tari_wallet_lib.InitOutput,
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as unknown as MintAccountNftRequest;
  const { metadata, fee } = params;

  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);
  const account_component_address =
    tari_wallet_lib.get_account_component_address(public_key);

  let nft_component_address = await createAccountNftComponent(wasm, fee);

  // include the input substates of the transaction (account and nft component)
  const required_substates = [
    { substate_id: account_component_address, version: null },
    { substate_id: nft_component_address, version: null },
  ];

  // build and send the mint transaction
  let encoded_metadata = tari_wallet_lib.encode_metadata(metadata);
  let sendInstructionRequest: SendInstructionRequest = {
    instructions: [
      {
        CallMethod: {
          component_address: nft_component_address,
          method: 'mint',
          args: [{ Literal: encoded_metadata }],
        },
      },
    ],
    fee_instructions: [],
    input_refs: [],
    required_substates,
    is_dry_run: false,
    fee,
    dump_account: account_component_address,
  };

  const result = await sendInstructionInternal(wasm, sendInstructionRequest);
  return { result };
}

export type TransferNftRequest = {
  nft_address: string;
  nft_resource: string;
  nft_id: string;
  destination_public_key: string;
  fee: number;
};

export async function transferNft(
  wasm: tari_wallet_lib.InitOutput,
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as TransferNftRequest;
  const { nft_address, nft_resource, nft_id, destination_public_key, fee } =
    params;

  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);
  const account_component_address =
    tari_wallet_lib.get_account_component_address(public_key);

  let instructions : object[] = [];

  // create the recipient account if it does not exist already
  const destination_account_address =
    tari_wallet_lib.get_account_component_address(destination_public_key);
  const destination_account_exists = await substateExists(
    destination_account_address,
  );
  if (!destination_account_exists) {
    instructions.push({
      CreateAccount: {
        owner_public_key: destination_public_key,
        workspace_bucket: null,
      },
    });
  }

  // include the input substates of the transaction
  let required_substates = [
    { substate_id: account_component_address, version: null },
    { substate_id: nft_address, version: null },
  ];
  if (destination_account_exists) {
    required_substates.push({
      substate_id: destination_account_address,
      version: null,
    });
  }

  // encode the NFT address parts to be passed as template arguments
  const parsed_nft_resource = await tari_wallet_lib.parse_resource_address(
    nft_resource,
  );
  const encoded_nft_id = await tari_wallet_lib.encode_non_fungible_id(nft_id);
  const encoded_fee = await tari_wallet_lib.encode_amount(BigInt(fee));

  // build and send the mint transaction
  // TODO: the instruction type should accept strings as well
  let key = [97, 95, 98, 117, 99, 107, 101, 116];
  let sendTransactionRequest: SendTransactionRequest = {
    instructions: [
      ...instructions,
      {
        CallMethod: {
          component_address: account_component_address,
          method: 'withdraw_non_fungible',
          args: [parsed_nft_resource, { Literal: encoded_nft_id }],
        },
      },
      {
        PutLastInstructionOutputOnWorkspace: {
          key,
        },
      },
      {
        CallMethod: {
          component_address: destination_account_address,
          method: 'deposit',
          args: [{ Workspace: key }],
        },
      },
    ],
    fee_instructions: [
      {
        CallMethod: {
          component_address: account_component_address,
          method: 'pay_fee',
          args: [{ Literal: encoded_fee }],
        },
      }
    ],
    input_refs: [],
    required_substates,
    is_dry_run: false,
  };

  return await sendTransactionInternal(wasm, sendTransactionRequest);
}
