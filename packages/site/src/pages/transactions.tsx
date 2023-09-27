import { useContext, useEffect } from 'react';
import { MetamaskActions, MetaMaskContext, TariContext } from '../hooks';

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
    SendHelloButton,
    Card,
} from '../components';
import { defaultSnapOrigin } from '../config';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import React from 'react';
import { SendDialog } from '../components/SendDialog';
import { ReceiveDialog } from '../components/ReceiveDialog';

function Transactions() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tariState, tariDispatch] = useContext(TariContext);

    return (
        <div>Transactions will go here</div>
    );
}

export default Transactions;