import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { getState, setState } from './state';
import { SetTariWalletParams } from './types';

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
    case 'hello':
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text(`Hello, **${origin}**!!`),
            text('This custom confirmation is just for display purposes.'),
            text(
              'But you can edit the snap source code to make it do something, if you want to!',
            ),
          ]),
        },
      });
    case 'hello2':
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text(`Hello, **${origin}**!!!!!`),
            text('This custom confirmation is just for display purposes.'),
            text(
              'But you can edit the snap source code to make it do something, if you want to!',
            ),
          ]),
        },
      });
    case 'setTariWallet':
      const params = request.params as SetTariWalletParams;
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
      break;
    case 'getTariWallet':
      let state = await getState();
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text(`Tari wallet daemon url: ${state.tari_wallet_daemon_url}`),
          ]),
        },
      });
    default:
      throw new Error('Method not found.');
  }
};
