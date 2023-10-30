import { Json, JsonRpcRequest } from '@metamask/snaps-types';
import * as tari_wallet_lib from './tari_wallet_lib';
import { substateExists } from './tari_indexer_client';
import { getRistrettoKeyPair } from './keys';
import { SendInstructionRequest } from './types';
import { sendInstructionInternal } from './transactions';

const ACCOUNT_NFT_TEMPLATE = '0000000000000000000000000000000000000000000000000000000000000001';

export type MintAccountNftRequest = {
  metadata: Object,
  fee: number,
};

export async function mintAccountNft(wasm: tari_wallet_lib.InitOutput, request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const params = request.params as MintAccountNftRequest;
  const { metadata, fee } = params;

  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);
  const account_component_address = tari_wallet_lib.get_account_component_address(public_key);
  const nft_component_address = tari_wallet_lib.get_account_nft_component_address(public_key);
  let instructions = [];

  // create the NFT holding component if it does not exist already
  const indexer_url = process.env.TARI_INDEXER_URL;
  let account_nft_exists = await substateExists(indexer_url, nft_component_address);
  if (!account_nft_exists) {
    const owner_token = await tari_wallet_lib.get_owner_token(public_key);
    instructions.push({
      CallFunction: {
        template_address: ACCOUNT_NFT_TEMPLATE,
        function: "create",
        args: [{ "Literal": owner_token }]
      }
    });
  }

  // include the input substates of the transaction (account and nft component)
  let required_substates = [{ address: account_component_address, version: null }];
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
          method: "mint",
          args: [{ "Literal": encoded_metadata }]
        }
      }
    ],
    input_refs: [],
    required_substates,
    is_dry_run: false,
    fee,
    dump_account: account_component_address,
  };

  const result = await sendInstructionInternal(wasm, sendInstructionRequest);
  return { result }
}