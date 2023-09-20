import { Json, JsonRpcRequest, OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { getState, setState } from './state';
import { GetWalletPublicKeyParams, GetWalletTokenParams, SendWalletRequestParams, SetWalletParams } from './types';
import * as walletClient from './tari_wallet_client';

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

async function sendWalletRequest(request: JsonRpcRequest<Json[] | Record<string, Json>>) {
  const params = request.params as unknown as SendWalletRequestParams;
  const { token, walletRequest} = params;

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

  const response = walletClient.sendWalletRequest(tari_wallet_daemon_url, token, walletRequest);
  return response;
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
