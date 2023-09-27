import {
  createContext,
  Dispatch,
  ReactNode,
  Reducer,
  useReducer,
} from 'react';

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
  SetToken = 'SetToken',
}

const reducer: Reducer<TariState, TariDispatch> = (state, action) => {
  switch (action.type) {
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
