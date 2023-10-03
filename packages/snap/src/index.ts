import { Json, JsonRpcRequest, OnRpcRequestHandler } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import { getState, setState } from './state';
import { SendWalletRequestParams, SetWalletParams, WalletRequest } from './types';
import * as walletClient from './tari_wallet_client';
import { int_array_to_resource_address } from './tari_wallet_client';
import { getBIP44AddressKeyDeriver } from '@metamask/key-tree';
import * as tari_wallet_lib from './tari_wallet_lib';

// Due to a bug of how brfs interacts with babel, we need to use require() syntax instead of import pattern
// https://github.com/browserify/brfs/issues/39
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const fs = require('fs');

// Ref:
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API
// - https://github.com/mdn/webassembly-examples/tree/06556204f687c00a5d9d3ab55805204cbb711d0c/js-api-examples
let wasm: WebAssembly.WebAssemblyInstantiatedSource;

let output: tari_wallet_lib.InitOutput;

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
    wasm = await WebAssembly.instantiate(wasmBuffer);
    output = tari_wallet_lib.initSync(wasmBuffer);
  } catch (error) {
    console.error('Failed to initialize WebAssembly module.', error);
    throw error;
  }
};

async function setWallet(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  // ask the user to set up the wallet url in the snap as the one requested by the website
  const params = request.params as SetWalletParams;
  const { tari_wallet_daemon_url } = params;
  const result = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        text(`Would you like to set up this wallet (${tari_wallet_daemon_url}) as the default wallet for the Tari network?.`),
        text('Only accept if you trust this website.'),
      ]),
    },
  });

  // stop inmmediatly if the user does not approve
  if (!result) {
    return;
  }

  // setup the wallet url in the snap
  const state = await getState();
  setState({ ...state, tari_wallet_daemon_url });

  // we also get a wallet token to avoid repetitive user actions afterwards
  const token = await walletClient.getWalletToken(tari_wallet_daemon_url);
  return token;
}

async function getWalletToken(_request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const state = await getState();
  const { tari_wallet_daemon_url } = state;
  if (!tari_wallet_daemon_url) {
    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([
          text('There is no Tari wallet configured in Metamask.'),
        ]),
      },
    });
    return;
  }

  const result = await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'confirmation',
      content: panel([
        text(`This website wants to connect to your Tari wallet, do you want to proceed?.`),
        // TODO: list all the requeted permissions
        text('Only accept if you trust this website.'),
      ]),
    },
  });
  if (result === true) {
    const token = await walletClient.getWalletToken(tari_wallet_daemon_url);
    return token;
  }
  return;
}

async function requestUserConfirmation(req: WalletRequest) {
  // these methods are safe to be called without user confirmation
  const methodWhitelist = [
    'accounts.get_default',
    'accounts.get_balances',
    'transactions.get',
    'transactions.get_result',
    'transactions.get_all_by_status',
    'transactions.wait_result'
  ];
  if (methodWhitelist.includes(req.method)) {
    return true;
  }

  // fund transfer methods always require explicit user confirmation
  const transferMethods = ['accounts.transfer', 'accounts.confidential_transfer'];
  if (transferMethods.includes(req.method)) {
    return await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Transfer'),
          text(`This website requests a transfer of funds from your account, do you want to proceed?.`),
          text('**Destination:** ' + req.params.destination_public_key),
          text('**Resource:** ' + int_array_to_resource_address(req.params.resource_address)),
          text('**Amount:** ' + req.params.amount),
          text('**Fee:** ' + req.params.fee),
        ])
      },
    });
  }

  // template/component calls
  if (req.method === 'transactions.submit') {
    return await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'confirmation',
        content: panel([
          heading('Transaction'),
          text(`This website wants to send a transaction, do you want to proceed?.`),
          // TODO: show transaction details: instructions, fee, etc.
        ])
      },
    });
  }

  // by default we reject any other wallet method
  return false;
}

async function showTransactionNotification(req: WalletRequest, res: Object) {
  const transactionMethods = ['transaction.submit', 'accounts.transfer', 'accounts.confidential_transfer'];
  if (transactionMethods.includes(req.method)) {
    if (res && res.transaction_id) {
      // TODO: use "snap_notify" (it was not working for me when I developed this)
      await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'alert',
          content: panel([
            heading('Transaction "' + res.transaction_id + '" confirmed'),
          ]),
        },
      });
    } else {
      // TODO: show error details
      // TODO: use "snap_notify" (it was not working for me when I developed this)
      await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'alert',
          content: panel([
            heading('An error occurred'),
          ]),
        },
      });
    }
  }
}

async function sendWalletRequest(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const params = request.params as unknown as SendWalletRequestParams;
  const { token, walletRequest } = params;

  const state = await getState();
  const { tari_wallet_daemon_url } = state;
  if (!tari_wallet_daemon_url) {
    await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([
          text('There is no Tari wallet configured in Metamask.'),
        ]),
      },
    });
    return;
  }

  if (await requestUserConfirmation(walletRequest)) {
    const response = await walletClient.sendWalletRequest(tari_wallet_daemon_url, token, walletRequest);
    await showTransactionNotification(walletRequest, response);
    return response;
  }
}

async function signingTest(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const tariNode = await snap.request({
    method: 'snap_getBip44Entropy',
    params: {
      coinType: 12345678,
    },
  });

  const deriveTariKey = await getBIP44AddressKeyDeriver(tariNode);
  const privateKey = await deriveTariKey(0);

  if (wasm && output) {
    return {z: tari_wallet_lib.greeter("cccc")}
  }

  return { privateKey, foo: 'bar' }
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
    case 'setWallet':
      return setWallet(request);
    case 'getWalletToken':
      return getWalletToken(request);
    case 'sendWalletRequest':
      return sendWalletRequest(request);
    case 'signingTest':
      return signingTest(request);
    default:
      throw new Error('Method not found.');
  }
};
