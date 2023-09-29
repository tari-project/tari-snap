import { useContext, useEffect } from 'react';
import { MetamaskActions, MetaMaskContext, TariContext } from '../../hooks';

import {
    sendWalletRequest,
} from '../../utils';
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

function Transactions() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tariState, tariDispatch] = useContext(TariContext);

    const [transactions, setTransactions] = React.useState([]);

    useEffect(() => {
        if (tariState && tariState.token) {
            refreshTransactions();
        }
    }, [tariState]);

    const refreshTransactions = async () => {
        const transactions = await getTransactions();
        console.log({ transactions });
    }

    const getTransactions = async () => {
        try {
            const walletRequest = {
                method: 'transactions.get_all_by_status',
                params: {
                    status: null,
                }
            };
            const response = await sendWalletRequest(tariState.token, walletRequest);

            if (response && response.transactions) {
                setTransactions(response.transactions);
            }
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
        }
    };

    const handleCopyClick = async (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <Container>
            <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft: 4, paddingRight: 4, borderRadius: 4 }}>
                <Stack direction="column" justifyContent="flex-start" spacing={2}>
                    <Typography style={{ fontSize: 24 }} >
                        Transactions
                    </Typography>
                </Stack>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontSize: 14 }}>Id</TableCell>
                            <TableCell sx={{ fontSize: 14 }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {
                            transactions.map((tx) => (
                                <TableRow
                                    key={tx[0].id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row" sx={{ fontSize: 14 }}>
                                        {tx[0].id} <IconButton aria-label="copy" onClick={() => handleCopyClick(tx[0].id)}>
                                            <ContentCopyIcon />
                                        </IconButton>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 14 }}>{tx[2]}</TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
            </Paper>
        </Container>
    );
}

export default Transactions;