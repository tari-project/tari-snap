import { useContext, useEffect } from 'react';
import { MetamaskActions, MetaMaskContext, TariActions, TariContext, AccountState } from '../hooks';

import {
    connectSnap,
    getSnap,
    getTariWalletToken,
    isLocalSnap,
    sendWalletRequest,
    setTariWallet,
    shouldDisplayReconnectButton,
} from '../utils';
import {
    ConnectButton,
    InstallFlaskButton,
    ReconnectButton,
    Card,
    ThemeButton,
} from '../components';
import { defaultSnapOrigin } from '../config';

import React from 'react';
import Balances from '../components/sections/Balances';


function Index() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tari, tariDispatch] = useContext(TariContext);

    const getAccount = async () => {
        try {
            const walletRequest = {
                method: 'accounts.get_default',
                params: {}
            };

            const account = await sendWalletRequest(tari.token, walletRequest);
            return account
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
            return null;
        }
    };

    const refreshAccountData = async () => {
        const accountData = await getAccount();
        if (accountData) {
            const payload: AccountState = {
                name: accountData.account.name,
                address: accountData.account.address.Component,
                public_key: accountData.public_key,
            };

            tariDispatch({
                type: TariActions.SetAccount,
                payload,
            });
        }
    }

    useEffect(() => {
        if (tari.token) {
            refreshAccountData();
        }
    }, [tari.token]);
    
    return (
        <Balances></Balances>
    );
}

export default Index;