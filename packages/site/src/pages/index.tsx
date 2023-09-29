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
import Transactions from '../components/sections/Transactions';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';


function Index() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tari, tariDispatch] = useContext(TariContext);

    const [tab, setTab] = React.useState(0);

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

    interface TabPanelProps {
        children?: React.ReactNode;
        index: number;
        value: number;
    }

    function CustomTabPanel(props: TabPanelProps) {
        const { children, value, index, ...other } = props;

        return (
            <div
                role="tabpanel"
                hidden={value !== index}
                id={`simple-tabpanel-${index}`}
                aria-labelledby={`simple-tab-${index}`}
                {...other}
            >
                {value === index && (
                    <Box sx={{ p: 3 }}>
                        <Typography>{children}</Typography>
                    </Box>
                )}
            </div>
        );
    }

    const selectBalances = () => {
        setTab(0);
    };

    const selectTransactions = () => {
        setTab(1);
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Stack direction='row' alignItems="center" justifyContent="center">
                <MenuItem sx={{ fontSize: 20, fontWeight: tab==0 ? 'bold' : 'default'}} onClick={selectBalances}>Balances</MenuItem>
                <MenuItem sx={{ fontSize: 20, fontWeight: tab==1 ? 'bold' : 'default'}} onClick={selectTransactions}>Transactions</MenuItem>
            </Stack>

            {/* Balances */}
            {tab === 0 && (
                <Box >
                    <Balances />
                </Box>
            )}

            {/* Transactions */}
            {tab === 1 && (
                <Box >
                    <Transactions />
                </Box>
            )}
        </Box>
    );
}

export default Index;