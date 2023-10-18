import { useContext, useEffect } from 'react';
import { MetamaskActions, MetaMaskContext, TariActions, TariContext, AccountState } from '../hooks';

import {
    connectSnap,
    getSnap,
    isLocalSnap,
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

    interface TabPanelProps {
        children?: React.ReactNode;
        index: number;
        value: number;
    }

    const selectBalances = () => {
        setTab(0);
    };

    const selectTransactions = () => {
        setTab(1);
    };

    return (
        <Box sx={{ mt: 4 }}>
            <Stack direction='row' alignItems="center" justifyContent="center">
                <MenuItem sx={{ fontSize: 20, fontWeight: tab == 0 ? 'bold' : 'default' }} onClick={selectBalances}>Balances</MenuItem>
                <MenuItem sx={{ fontSize: 20, fontWeight: tab == 1 ? 'bold' : 'default' }} onClick={selectTransactions}>Transactions</MenuItem>
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