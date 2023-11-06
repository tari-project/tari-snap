import { useContext, useEffect } from 'react';
import { MetamaskActions, MetaMaskContext, TariActions, TariContext } from '../../hooks';

import {
    getAccountTransactions,
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
    const [tari, tariDispatch] = useContext(TariContext);

    const process_raw_transaction = (t: Object) => {
        if (t.Pending) {
            return { status: 'Pending' };
        } else if (t.Finalized) {
            const id = t.Finalized.execution_result.finalize.transaction_hash;
            const status = t.Finalized.final_decision === 'Commit' ? 'Accepted' : 'Rejected';
            return { id, status };
        } else {
            return {};
        }
    }  

    const getTransactions = async () => {
        try {
            let transactions = [];

            const raw_transactions = await getAccountTransactions();
            if (raw_transactions && raw_transactions.transaction_results) {
                transactions = raw_transactions.transaction_results.reverse().map(process_raw_transaction);
            }

            return transactions;
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
            return [];
        }
    };

    const refreshTransactions = async () => {
        const transactions = await getTransactions();
        if (transactions && transactions.length > 0) {
            tariDispatch({
                type: TariActions.SetTransactions,
                payload: transactions,
            });
        }

        // we keep polling for transactions to keep them updated
        setTimeout(async () => { await refreshTransactions() }, 5000);
    }

    useEffect(() => {
        refreshTransactions();
    }, [tari.account]);

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
                            tari.transactions.map((tx) => (
                                <TableRow
                                    key={tx.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row" sx={{ fontSize: 14 }}>
                                        {tx.id} <IconButton aria-label="copy" onClick={() => handleCopyClick(tx.id)}>
                                            <ContentCopyIcon />
                                        </IconButton>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 14 }}>{tx.status}</TableCell>
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