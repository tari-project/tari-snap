import {
  createContext,
  Dispatch,
  ReactNode,
  Reducer,
  useEffect,
  useReducer,
} from 'react';
import { Snap } from '../types';
import { detectSnaps, getSnap, isFlask } from '../utils';

export type TariState = {
  wallet_daemon_url?: string,
  token?: string;
};

const initialState: TariState = {
};

type TariDispatch = { type: TariActions; payload: any };

export const TariContext = createContext<
  [TariState, Dispatch<TariDispatch>]
>([
  initialState,
  () => {
    /* no op */
  },
]);

export enum TariActions {
  SetWalletDaemonUrl = 'SetWalletDaemonUrl',
  SetToken = 'SetToken',
}

const reducer: Reducer<TariState, TariDispatch> = (state, action) => {
  switch (action.type) {
    case TariActions.SetWalletDaemonUrl:
      return {
        ...state,
        wallet_daemon_url: action.payload,
      };

    case TariActions.SetToken:
      return {
        ...state,
        token: action.payload,
      };
    default:
      return state;
  }
};

export const TariProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <TariContext.Provider value={[state, dispatch]}>
      {children}
    </TariContext.Provider>
  );
};
