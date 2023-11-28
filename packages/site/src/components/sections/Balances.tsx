import { useContext, useEffect } from 'react';
import { AccountState, MetamaskActions, MetaMaskContext, TariActions, TariContext } from '../../hooks';
import { SendDialog } from '../../components/SendDialog';
import { ReceiveDialog } from '../../components/ReceiveDialog';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import React from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { ThemeButton } from '../Buttons';
import { getAccountData, getFreeTestCoins } from '../../utils/snap';

function Balances() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tari, tariDispatch] = useContext(TariContext);

    const [sendDialogOpen, setSendDialogOpen] = React.useState(false);
    const [receiveDialogOpen, setReceiveDialogOpen] = React.useState(false);

    const getBalances = async () => {
        try {
            const data = await getAccountData();

            if (data && data.public_key) {
                const payload: AccountState = {
                    address: data.component_address,
                    public_key: data.public_key,
                };
    
                tariDispatch({
                    type: TariActions.SetAccount,
                    payload,
                });
            }

            if (!data || !data.resources) {
                return [];  
            }

            let fungibles = data.resources
                .filter(r => r.type === 'fungible' || r.type === 'confidential');

            return fungibles;
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
            return [];
        }
    };

    const refreshAccountBalances = async () => {
        const balances = await getBalances();
        if (balances && balances.length > 0) {
            tariDispatch({
                type: TariActions.SetBalances,
                payload: balances,
            });
        }

        // we keep polling for balances to keep them updated
        setTimeout(async () => { await refreshAccountBalances() }, 5000);
    }

    useEffect(() => {
        refreshAccountBalances();
    }, []);

    const handleCopyClick = async (text: string | undefined) => {
        navigator.clipboard.writeText(text || '');
    };

    const handleSendDialogClickOpen = () => {
        setSendDialogOpen(true);
    };

    const handleSendDialogClose = () => {
        setSendDialogOpen(false);
    };

    const handleSendDialogSend = (token: string, amount: number, recipientAddress: string) => {
        setSendDialogOpen(false);
    };

    const handleReceiveDialogClickOpen = () => {
        setReceiveDialogOpen(true);
    };

    const handleReceiveDialogClose = () => {
        setReceiveDialogOpen(false);
    };

    const handleGetTestCoinsClick = async () => {
        await getFreeTestCoins(100000, 1000);
    };

    return (
        <Container>
            {tari.account?.public_key ?
                (<Container>
                    <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft: 4, paddingRight: 4, borderRadius: 4 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                            <Box>
                                <Typography style={{ fontSize: 12 }} >
                                    Account address
                                </Typography>
                                <Stack direction="row" alignItems="center" justifyContent="center">
                                    <Typography style={{ fontSize: 15 }} >
                                        {tari.account?.public_key}
                                    </Typography>
                                    <IconButton aria-label="copy" onClick={() => handleCopyClick(tari.account?.public_key)}>
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Stack>
                            </Box>
                            <Stack direction="row" spacing={2}>
                                <ThemeButton text="Get Test Coins" onClick={() => handleGetTestCoinsClick()}/>
                                <ThemeButton text="Receive" onClick={handleReceiveDialogClickOpen}/>
                                <ThemeButton text="Send" onClick={handleSendDialogClickOpen}/>
                            </Stack>
                        </Stack>
        
                    </Paper>
                    <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft: 4, paddingRight: 4, borderRadius: 4 }}>
                        <Stack direction="column" justifyContent="flex-start" spacing={2}>
                            <Typography style={{ fontSize: 24 }} >
                                Balances
                            </Typography>
                        </Stack>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontSize: 14 }}>Resource Address</TableCell>
                                    <TableCell sx={{ fontSize: 14 }}>Balance</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {
                                    tari.balances.map((token) => (
                                        <TableRow
                                            key={token.name}
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <TableCell sx={{ fontSize: 14 }}>{token.resource_address}</TableCell>
                                            <TableCell sx={{ fontSize: 14 }}> {token.balance}</TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>
                    </Paper>
                    <SendDialog
                        open={sendDialogOpen}
                        onSend={handleSendDialogSend}
                        onClose={handleSendDialogClose}
                        accountBalances={tari.balances}
                    />
                    <ReceiveDialog
                        address={tari.account?.public_key}
                        open={receiveDialogOpen}
                        onClose={handleReceiveDialogClose}
                    />
                </Container>) 
                : (<div/>) }
        </Container>
    );
}

export default Balances;