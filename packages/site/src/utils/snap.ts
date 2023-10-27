import { MetaMaskInpageProvider } from '@metamask/providers';
import { defaultSnapOrigin } from '../config';
import { GetSnapsResponse, Snap } from '../types';

/**
 * Get the installed snaps in MetaMask.
 *
 * @param provider - The MetaMask inpage provider.
 * @returns The snaps installed in MetaMask.
 */
export const getSnaps = async (
  provider?: MetaMaskInpageProvider,
): Promise<GetSnapsResponse> =>
  (await (provider ?? window.ethereum).request({
    method: 'wallet_getSnaps',
  })) as unknown as GetSnapsResponse;
/**
 * Connect a snap to MetaMask.
 *
 * @param snapId - The ID of the snap.
 * @param params - The params to pass with the snap to connect.
 */
export const connectSnap = async (
  snapId: string = defaultSnapOrigin,
  params: Record<'version' | string, unknown> = {},
) => {
  await window.ethereum.request({
    method: 'wallet_requestSnaps',
    params: {
      [snapId]: params,
    },
  });
};

/**
 * Get the snap from MetaMask.
 *
 * @param version - The version of the snap to install (optional).
 * @returns The snap object returned by the extension.
 */
export const getSnap = async (version?: string): Promise<Snap | undefined> => {
  try {
    const snaps = await getSnaps();

    return Object.values(snaps).find(
      (snap) =>
        snap.id === defaultSnapOrigin && (!version || snap.version === version),
    );
  } catch (e) {
    console.log('Failed to obtain installed snap', e);
    return undefined;
  }
};

export const getAccountData = async () => {
  return window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'getAccountData',
        params: {}
      }
    },
  });
};

export const getAccountTransactions = async () => {
  return window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'getTransactions',
        params: {}
      }
    },
  });
};

export const getFreeTestCoins = async (amount: number, fee: number) => {
  return await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'getFreeTestCoins',
        params: {
          amount, fee
        }
      }
    },
  });
};

export const getSubstate = async (substate_address: string) => {
  return window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'getSubstate',
        params: {
          substate_address
        }
      }
    },
  });
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');


export function resource_address_to_int_array(resource_address: string) {
  const hex_string = resource_address.replace( 'resource_', '' );  
  return hex_to_int_array(hex_string);
}

export function hex_to_int_array(hex_string: string) {
  // splits the string into segments of two including a remainder => {1,2}
  const tokens = hex_string.match(/[0-9a-z]{2}/gi);
  if(!tokens) {
    return null;
  }
  const int_array = tokens.map(t => parseInt(t, 16));
  return int_array;
}
