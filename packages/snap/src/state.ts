import { DEFAULT_TARI_INDEXER_URL } from "./env";

export type State = {
  indexer_url: string;
};

const DEFAULT_STATE = {
  indexer_url: DEFAULT_TARI_INDEXER_URL || "",
};

export async function setState(newState: State) {
    await snap.request({
      method: 'snap_manageState',
      params: { operation: 'update', newState},
    });
}

export async function getState(): Promise<State> {
    const state = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    });

    return (state as State | null) ?? DEFAULT_STATE;
}
