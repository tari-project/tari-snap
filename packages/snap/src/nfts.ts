import { Json, JsonRpcRequest } from '@metamask/snaps-types';
import * as tari_wallet_lib from './tari_wallet_lib';
import { substateExists } from './tari_indexer_client';
import { getRistrettoKeyPair } from './keys';
import { SendInstructionRequest, SendTransactionRequest } from './types';
import {
  sendInstructionInternal,
  sendTransactionInternal,
} from './transactions';

const ACCOUNT_NFT_TEMPLATE =
  '0000000000000000000000000000000000000000000000000000000000000001';
const ACCOUNT_TEMPLATE =
  '0000000000000000000000000000000000000000000000000000000000000000';

export type MintAccountNftRequest = {
  metadata: Object;
  fee: number;
};

export async function mintAccountNft(
  wasm: tari_wallet_lib.InitOutput,
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as MintAccountNftRequest;
  const { metadata, fee } = params;

  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);
  const account_component_address =
    tari_wallet_lib.get_account_component_address(public_key);
  const nft_component_address =
    tari_wallet_lib.get_account_nft_component_address(public_key);
  let instructions = [];

  // create the NFT holding component if it does not exist already
  let account_nft_exists = await substateExists(nft_component_address);
  if (!account_nft_exists) {
    const owner_token = await tari_wallet_lib.get_owner_token(public_key);
    instructions.push({
      CallFunction: {
        template_address: ACCOUNT_NFT_TEMPLATE,
        function: 'create',
        args: [{ Literal: owner_token }],
      },
    });
  }

  // include the input substates of the transaction (account and nft component)
  let required_substates = [
    { address: account_component_address, version: null },
  ];
  if (account_nft_exists) {
    required_substates.push({ address: nft_component_address, version: null });
  }

  // build and send the mint transaction
  let encoded_metadata = tari_wallet_lib.encode_metadata(metadata);
  let sendInstructionRequest: SendInstructionRequest = {
    instructions: [
      ...instructions,
      {
        CallMethod: {
          component_address: nft_component_address,
          method: 'mint',
          args: [{ Literal: encoded_metadata }],
        },
      },
    ],
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

  let instructions = [];

  // create the recipient account if it does not exist already
  const destination_account_address =
    tari_wallet_lib.get_account_component_address(destination_public_key);
  const destination_account_exists = await substateExists(
    destination_account_address,
  );
  if (!destination_account_exists) {
    const owner_token = await tari_wallet_lib.get_owner_token(
      destination_public_key,
    );
    instructions.push({
      CallFunction: {
        template_address: ACCOUNT_TEMPLATE,
        function: 'create',
        args: [{ Literal: owner_token }],
      },
    });
  }

  // include the input substates of the transaction
  let required_substates = [
    { address: account_component_address, version: null },
    { address: nft_address, version: null },
  ];
  if (destination_account_exists) {
    required_substates.push({
      address: destination_account_address,
      version: null,
    });
  }

  // encode the NFT address parts to be passed as template arguments
  const parsed_nft_resource = await tari_wallet_lib.parse_resource_address(
    nft_resource,
  );
  const encoded_nft_id = await tari_wallet_lib.encode_non_fungible_id(nft_id);

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
      {
        CallMethod: {
          component_address: account_component_address,
          method: 'pay_fee',
          args: [`Amount(${fee})`],
        },
      },
    ],
    input_refs: [],
    required_substates,
    is_dry_run: false,
  };

  return await sendTransactionInternal(wasm, sendTransactionRequest);
}
