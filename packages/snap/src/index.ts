import {
  Json,
  JsonRpcRequest,
  OnRpcRequestHandler,
} from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import * as tari_wallet_lib from './tari_wallet_lib';
import {
  decode_resource_address,
  decode_vault_id,
  getSubstate,
  int_array_to_hex,
  sendIndexerRequest,
  substateExists,
} from './tari_indexer_client';
import { getRistrettoKeyPair } from './keys';
import {
  GetFreeTestCoinsRequest,
  GetSubstateRequest,
  TransferRequest,
} from './types';
import {
  getTransactionResult,
  sendInstruction,
  sendTransaction,
} from './transactions';
import { mintAccountNft, transferNft } from './nfts';

// Due to a bug of how brfs interacts with babel, we need to use require() syntax instead of import pattern
// https://github.com/browserify/brfs/issues/39
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const fs = require('fs');

// Ref:
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API
// - https://github.com/mdn/webassembly-examples/tree/06556204f687c00a5d9d3ab55805204cbb711d0c/js-api-examples
let wasm: tari_wallet_lib.InitOutput;

/**
 * Load and initialize the WASM module. This modifies the global `wasm`
 * variable, with the instantiated module.
 *
 * @throws If the WASM module failed to initialize.
 */
const initializeWasm = async () => {
  try {
    // This will be resolved to a buffer with the file contents at build time.
    // The path to the file must be in a string literal prefixed with __dirname
    // in order for brfs to resolve the file correctly.
    // eslint-disable-next-line node/no-sync, node/no-path-concat
    const wasmBuffer = fs.readFileSync(
      `${__dirname}/tari_wallet_lib/index_bg.wasm`,
    );
    wasm = await tari_wallet_lib.default(wasmBuffer);
  } catch (error) {
    console.error('Failed to initialize WebAssembly module.', error);
    throw error;
  }
};

async function getAccountData(
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);

  const component_address =
    tari_wallet_lib.get_account_component_address(public_key);

  const params = {
    address: component_address,
    // to get the latest version
    version: null,
  };
  const result = await sendIndexerRequest('inspect_substate', params);
  if (!result || !result.substate_contents) {
    return { public_key, address: component_address, resources: [] };
  }
  const vaults = result.substate_contents.substate.Component.state.vaults;

  const vault_ids = vaults.map((v: Object[]) => {
    return decode_vault_id(v[1]);
  });

  const resources = await Promise.all(
    vault_ids.map(async (v: any) => {
      const result = await sendIndexerRequest('inspect_substate', {
        address: v,
        version: null,
      });

      const container =
        result.substate_contents.substate.Vault.resource_container;

      if (container.Confidential) {
        const data = container.Confidential;
        const resource_address = decode_resource_address(data.address);
        const balance = data.revealed_amount;
        return { type: 'confidential', resource_address, balance };
      } else if (container.Fungible) {
        const data = container.Fungible;
        const resource_address = decode_resource_address(data.address);
        const balance = data.amount;
        return { type: 'fungible', resource_address, balance };
      } else if (container.NonFungible) {
        const data = container.NonFungible;
        const resource_address = decode_resource_address(data.address);
        const token_ids = data.token_ids.map((id) => {
          if (id.U256) {
            const hex = int_array_to_hex(id.U256);
            return `uuid:${hex}`;
          } else if (id.String) {
            return `str:${id.String}`;
          } else if (id.Uint32) {
            return `u32:${id.Uint32}`;
          } else if (id.Uint64) {
            return `u64:${id.Uint64}`;
          } else {
            // TODO: handle errors
            return null;
          }
        });
        return { type: 'nonfungible', resource_address, token_ids };
      } else {
        // TODO: handle errors
        return null;
      }
    }),
  );

  return { public_key, address: component_address, resources };
}

async function transfer(
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as TransferRequest;
  const { amount, resource_address, destination_public_key, fee } = params;

  const userConfirmation = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Transfer'),
        text(
          `This website requests a transfer of funds from your account, do you want to proceed?.`,
        ),
        text('**Destination:** ' + destination_public_key),
        text('**Resource:** ' + resource_address),
        text('**Amount:** ' + amount),
        text('**Fee:** ' + fee),
      ]),
    },
  });
  if (!userConfirmation) {
    return;
  }

  const accountIndex = 0;
  const { secret_key, public_key } = await getRistrettoKeyPair(accountIndex);

  // check if the destination account exists
  const dest_account_component = tari_wallet_lib.get_account_component_address(
    destination_public_key,
  );
  const dest_account_exists = await substateExists(dest_account_component);
  const create_dest_account = !dest_account_exists;

  // build and sign transaction using the wasm lib
  const transaction = tari_wallet_lib.create_transfer_transaction(
    secret_key,
    destination_public_key,
    create_dest_account,
    resource_address,
    BigInt(amount),
    BigInt(fee),
  );
  const account_component =
    tari_wallet_lib.get_account_component_address(public_key);

  // send the transaction to the indexer
  const submit_method = 'submit_transaction';
  let submit_params = {
    transaction,
    is_dry_run: false,
    required_substates: [
      {
        address: account_component,
        version: null,
      },
      {
        address: resource_address,
        version: null,
      },
    ],
  };
  if (dest_account_exists) {
    submit_params.required_substates.push({
      address: dest_account_component,
      version: null,
    });
  }

  const res = await sendIndexerRequest(submit_method, submit_params);

  // TODO: keep polling the indexer until we get a result for the transaction

  return res;
}

async function getTransactions(
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);
  const component_address =
    tari_wallet_lib.get_account_component_address(public_key);

  const method = 'get_substate_transactions';
  const params = {
    address: component_address,
    // TODO: store the latest known version in the snap storage
    version: null,
  };
  const result = await sendIndexerRequest(method, params);

  return result;
}

async function getFreeTestCoins(
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as GetFreeTestCoinsRequest;
  const { amount, fee } = params;

  const userConfirmation = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Transfer'),
        text(
          `This website requests a deposit of free test coins into your accout. Do you want to proceed?`,
        ),
        text('**Amount:** ' + amount),
        text('**Fee:** ' + fee),
      ]),
    },
  });
  if (!userConfirmation) {
    return;
  }

  const accountIndex = 0;
  const { secret_key, public_key } = await getRistrettoKeyPair(accountIndex);
  const component_address =
    tari_wallet_lib.get_account_component_address(public_key);

  let accountExists = await substateExists(component_address);
  let is_new_account = !accountExists;

  // build and sign transaction using the wasm lib
  const transaction = tari_wallet_lib.create_free_test_coins_transaction(
    is_new_account,
    secret_key,
    BigInt(amount),
    BigInt(fee),
  );
  const account_component =
    tari_wallet_lib.get_account_component_address(public_key);

  // send the transaction to the indexer
  // TODO: parameterize the indexer url
  const submit_method = 'submit_transaction';
  const required_substates = [];
  if (accountExists) {
    required_substates.push({
      address: account_component,
      version: null,
    });
  }
  const submit_params = {
    transaction,
    is_dry_run: false,
    required_substates,
  };
  await sendIndexerRequest(submit_method, submit_params);

  // TODO: keep polling the indexer until we get a result for the transaction
  const transaction_id = transaction.id;
  return { transaction_id };
}

async function getSubstateHandler(
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const params = request.params as GetSubstateRequest;
  const { substate_address } = params;

  return await getSubstate(substate_address);
}

async function getTemplateDefinition(
  request: JsonRpcRequest<Json[] | Record<string, Json>>,
) {
  const { template_address } = request.params as { template_address: string };
  return await sendIndexerRequest( 'get_template_definition', {
    template_address,
  });
}

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  console.log('Origin:', origin);
  if (!wasm) {
    await initializeWasm();
  }

  switch (request.method) {
    case 'getAccountData':
      return getAccountData(request);
    case 'getTransactions':
      return getTransactions(request);
    case 'transfer':
      return transfer(request);
    case 'getFreeTestCoins':
      return getFreeTestCoins(request);
    case 'sendTransaction':
      return sendTransaction(wasm, request);
    case 'getTransactionResult':
      return getTransactionResult(request);
    case 'sendInstruction':
      return sendInstruction(wasm, request);
    case 'mintAccountNft':
      return mintAccountNft(wasm, request);
    case 'transferNft':
      return transferNft(wasm, request);
    case 'getSubstate':
      return getSubstateHandler(request);
    case 'getTemplateDefinition':
      return getTemplateDefinition(request);
    default:
      throw new Error('Method not found.');
  }
};
