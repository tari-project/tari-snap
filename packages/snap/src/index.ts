import { Json, JsonRpcRequest, OnRpcRequestHandler } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import { getState, setState } from './state';
import { GetWalletPublicKeyParams, GetWalletTokenParams, SendWalletRequestParams, SetWalletParams, WalletRequest } from './types';
import * as walletClient from './tari_wallet_client';
import { int_array_to_resource_address } from './tari_wallet_client';

async function setWallet(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
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
  if (result === true) {
    const state = await getState();
    setState({ ...state, tari_wallet_daemon_url });
  }
  return;
}

async function getWalletToken(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const params = request.params as GetWalletTokenParams;
  const { permissions } = params;

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
    const token = await walletClient.getWalletToken(tari_wallet_daemon_url, permissions);
    return token;
  }
  return;
}

async function requestUserConfirmation(req: WalletRequest) {
  // these methods are safe to be called without user confirmation
  const methodWhitelist = ['accounts.get_default', 'accounts.get_balances'];
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
  switch (request.method) {
    case 'setWallet':
      return setWallet(request);
    case 'getWalletToken':
      return getWalletToken(request);
    case 'sendWalletRequest':
      return sendWalletRequest(request);
    default:
      throw new Error('Method not found.');
  }
};
