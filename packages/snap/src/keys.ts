import { getBIP44AddressKeyDeriver } from '@metamask/key-tree';
import * as tari_wallet_lib from './tari_wallet_lib';

// TODO: decide on a value for Tari
const TARI_COIN_TYPE = 12345678;

export type RistrettoKeyPair = {
    secret_key: string,
    public_key: string
};

export async function getRistrettoKeyPair(index: number): Promise<RistrettoKeyPair> {
    // get metamask's private key
    const entropy = await snap.request({
        method: 'snap_getBip44Entropy',
        params: {
            coinType: TARI_COIN_TYPE,
        },
    });
    const deriveTariKey = await getBIP44AddressKeyDeriver(entropy);
    const tariNode = await deriveTariKey(index);
    const ecdsaPrivateKey = tariNode.privateKey;

    const secret_key = tari_wallet_lib.build_ristretto_private_key(ecdsaPrivateKey);
    const public_key = tari_wallet_lib.build_ristretto_public_key(ecdsaPrivateKey);

    return {
        secret_key,
        public_key
    }
}