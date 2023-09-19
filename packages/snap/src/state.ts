
export type State = {
    tari_wallet_daemon_url: string | null;
};

const DEFAULT_STATE = {
    tari_wallet_daemon_url: null,
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
