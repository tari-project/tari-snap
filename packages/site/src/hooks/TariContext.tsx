import {
  createContext,
  Dispatch,
  ReactNode,
  Reducer,
  useReducer,
} from 'react';

export type TariState = {
  account?: AccountState;
  balances: Object[],
  transactions: Object[],
};

export type AccountState = {
  address: string,
  public_key: string,
};

const initialState: TariState = {
  balances: [],
  transactions: []
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
  SetAccount = 'SetAccount',
  SetBalances = 'SetBalances',
  SetTransactions = 'SetTransactions',
}

const reducer: Reducer<TariState, TariDispatch> = (state, action) => {
  switch (action.type) {
    case TariActions.SetAccount:
      console.log({setAccount: action.payload});
      return {
        ...state,
        account: action.payload,
      };
    case TariActions.SetBalances:
      return {
        ...state,
        balances: action.payload,
      };
    case TariActions.SetTransactions:
      return {
        ...state,
        transactions: action.payload,
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
