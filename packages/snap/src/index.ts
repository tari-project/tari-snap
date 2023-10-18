import { Json, JsonRpcRequest, OnRpcRequestHandler } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import * as tari_wallet_lib from './tari_wallet_lib';
import { decode_resource_address, decode_vault_id, sendIndexerRequest, substateExists } from './tari_indexer_client';
import { getRistrettoKeyPair } from './keys';
import { GetFreeTestCoinsRequest, TransferRequest } from './types';
import { truncateText } from './text';

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
    const wasmBuffer = fs.readFileSync(`${__dirname}/tari_wallet_lib/index_bg.wasm`);
    wasm = await tari_wallet_lib.default(wasmBuffer);
  } catch (error) {
    console.error('Failed to initialize WebAssembly module.', error);
    throw error;
  }
};

async function getAccountData(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);

  const component_address = tari_wallet_lib.get_account_component_address(public_key);
  const indexer_url = process.env.GATSBY_INDEXER_URL;

  const method = 'inspect_substate';
  const params = {
    address: component_address,
    // to get the latest version
    version: null,
  };
  const result = await sendIndexerRequest(indexer_url, method, params);
  if (!result || !result.substate_contents) {
    return { public_key, component_address, balances: [] }
  }
  const vaults = result.substate_contents.substate.Component.state.vaults;

  const vault_ids = vaults.map((v: Object[]) => { return decode_vault_id(v[1]); });

  const balances = await Promise.all(vault_ids.map(async (v: any) => {
    const result = await sendIndexerRequest(indexer_url, 'inspect_substate', {
      address: v,
      version: null
    });

    const container = result.substate_contents.substate.Vault.resource_container;

    if (container.Confidential) {
      const data = container.Confidential;
      const resource_address = decode_resource_address(data.address);
      const balance = data.revealed_amount;
      return { resource_address, balance, isConfidential: true };
    } else if (container.Fungible) {
      const data = container.Fungible;
      const resource_address = decode_resource_address(data.address);
      const balance = data.amount;
      return { resource_address, balance, isConfidential: false };
    } else if (container.NonFungible) {
      // TODO: decode nfts
      return null;
    } else {
      // TODO: handle errors
      return null;
    }
  }));

  return { public_key, component_address, balances }
}

async function transfer(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const params = request.params as TransferRequest;
  const { amount, resource_address, destination_public_key, fee } = params;

  const userConfirmation = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Transfer'),
        text(`This website requests a transfer of funds from your account, do you want to proceed?.`),
        text('**Destination:** ' + destination_public_key),
        text('**Resource:** ' + resource_address),
        text('**Amount:** ' + amount),
        text('**Fee:** ' + fee),
      ])
    },
  });
  if (!userConfirmation) {
    return;
  }

  const accountIndex = 0;
  const { secret_key, public_key } = await getRistrettoKeyPair(accountIndex);

  // build and sign transaction using the wasm lib
  const transaction = tari_wallet_lib.create_transfer_transaction(secret_key, destination_public_key, resource_address, BigInt(amount), BigInt(fee));
  const account_component = tari_wallet_lib.get_account_component_address(public_key);
  const dest_account_component = tari_wallet_lib.get_account_component_address(destination_public_key);

  // send the transaction to the indexer
  const indexer_url = process.env.GATSBY_INDEXER_URL;
  const submit_method = 'submit_transaction';
  const submit_params = {
    transaction,
    is_dry_run: false,
    required_substates: [
      {
        address: account_component,
        version: null
      },
      {
        address: dest_account_component,
        version: null
      },
      {
        address: resource_address,
        version: null
      }
    ],
  };
  await sendIndexerRequest(indexer_url, submit_method, submit_params);

  // TODO: keep polling the indexer until we get a result for the transaction
  const transaction_id = transaction.id;
  const get_method = 'get_transaction_result';
  const get_params = { transaction_id };
  const result = await sendIndexerRequest(indexer_url, get_method, get_params);

  // TODO: notify errors
  const message = 'Transaction "' + truncateText(transaction_id, 10) + '" confirmed';
  await snap.request({
    method: 'snap_notify',
    params: {
      type: 'inApp',
      message,
    },
  });

  return { transaction_id, result };
}

async function getTransactions(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const accountIndex = 0;
  const { public_key } = await getRistrettoKeyPair(accountIndex);
  const component_address = tari_wallet_lib.get_account_component_address(public_key);

  const indexer_url = process.env.GATSBY_INDEXER_URL;
  const method = 'get_substate_transactions';
  const params = {
    address: component_address,
    // TODO: store the latest known version in the snap storage
    version: null,
  };
  const result = await sendIndexerRequest(indexer_url, method, params);

  return result;
}

async function getFreeTestCoins(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const params = request.params as GetFreeTestCoinsRequest;
  const { amount, fee } = params;

  const userConfirmation = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        heading('Transfer'),
        text(`This website requests a deposit of free test coins into your accout. Do you want to proceed?`),
        text('**Amount:** ' + amount),
        text('**Fee:** ' + fee),
      ])
    },
  });
  if (!userConfirmation) {
    return;
  }

  const accountIndex = 0;
  const { secret_key, public_key } = await getRistrettoKeyPair(accountIndex);
  const component_address = tari_wallet_lib.get_account_component_address(public_key);

  const indexer_url = process.env.GATSBY_INDEXER_URL;

  let accountExists = await substateExists(indexer_url, component_address);
  let is_new_account = !accountExists;

  // build and sign transaction using the wasm lib
  const transaction = tari_wallet_lib.create_free_test_coins_transaction(is_new_account, secret_key, BigInt(amount), BigInt(fee));
  const account_component = tari_wallet_lib.get_account_component_address(public_key);

  // send the transaction to the indexer
  // TODO: parameterize the indexer url
  const submit_method = 'submit_transaction';
  const required_substates = [];
  if (accountExists) {
    required_substates.push(
      {
        address: account_component,
        version: null
      }
    );
  }
  const submit_params = {
    transaction,
    is_dry_run: false,
    required_substates,
  };
  await sendIndexerRequest(indexer_url, submit_method, submit_params);

  // TODO: keep polling the indexer until we get a result for the transaction
  const transaction_id = transaction.id;
  return { transaction_id };
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
export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
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
    default:
      throw new Error('Method not found.');
  }
};
