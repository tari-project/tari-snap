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
import { SendDialog } from '../components/SendDialog';
import React from 'react';
import { ReceiveDialog } from '../components/ReceiveDialog';

const Index = () => {
  const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
  const [tariState, tariDispatch] = useContext(TariContext);

  const [accountAddress, setAccountAddress] = React.useState(null);
  const [accountName, setAccountName] = React.useState(null);
  const [accountPublicKey, setAccountPublicKey] = React.useState(null);
  const [accountBalances, setAccountBalances] = React.useState(null);

  const [sendDialogOpen, setSendDialogOpen] = React.useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = React.useState(false);
  

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? metamaskState.isFlask
    : metamaskState.snapsDetected;

  const getAccount = async () => {
    try {
      const walletRequest = {
        method: 'accounts.get_default',
        params: {}
      };

      const account = await sendWalletRequest(tariState.token, walletRequest);
      return account
    } catch (e) {
      console.error(e);
      metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const getBalances = async () => {
    try {
      const walletRequest = {
        method: 'accounts.get_balances',
        params: {
          account: accountAddress,
          refresh: true,
        }
      };

      const account = await sendWalletRequest(tariState.token, walletRequest);
      return account
    } catch (e) {
      console.error(e);
      metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const refreshAccountData = async () => {
    const accountData = await getAccount();
    setAccountAddress(accountData.account.address.Component);
    setAccountName(accountData.account.name);
    setAccountPublicKey(accountData.public_key);

    const balanceData = await getBalances();
    let balances = balanceData.balances.map(b => { return({ name: b.token_symbol ||  "Tari", address: b.resource_address, balance: b.balance});});
    console.log({balances});
    setAccountBalances(balances);
  }

  useEffect(() => {
    if (tariState.token) {
      refreshAccountData();  
    }
  }, [tariState]);

  const handleCopyClick = async (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSendDialogClickOpen = () => {
    setSendDialogOpen(true);
  };

  const handleSendDialogClose = () => {
    setSendDialogOpen(false);
  };

  const handleSendDialogSend = (token: string, amount: number, recipientAddress: string) => {
    console.log({ token, amount, recipientAddress });
    setSendDialogOpen(false);
  };

  const handleReceiveDialogClickOpen = () => {
    setReceiveDialogOpen(true);
  };

  const handleReceiveDialogClose = () => {
    setReceiveDialogOpen(false);
  };

  return (
    <Container>
      <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft: 4, paddingRight: 4, borderRadius: 4 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography style={{ fontSize: 12 }} >
              {accountName}
            </Typography>
            <Stack direction="row" alignItems="center" justifyContent="center">
              <Typography style={{ fontSize: 15 }} >
                {accountPublicKey}
              </Typography>
              <IconButton aria-label="copy" onClick={() => handleCopyClick(accountPublicKey)}>
                <ContentCopyIcon />
              </IconButton>
            </Stack>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" sx={{ padding: 2, borderRadius: 4, textTransform: 'none', justifySelf: 'right' }} onClick={handleReceiveDialogClickOpen}>
              <Typography style={{ fontSize: 15 }} >
                Receive
              </Typography>
            </Button>
            <Button variant="contained" sx={{ padding: 2, borderRadius: 4, textTransform: 'none', justifySelf: 'right' }} onClick={handleSendDialogClickOpen}>
              <Typography style={{ fontSize: 15 }} >
                Send
              </Typography>
            </Button>
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
              <TableCell sx={{ fontSize: 14 }}>Name</TableCell>
              <TableCell sx={{ fontSize: 14 }}>Resource Address</TableCell>
              <TableCell sx={{ fontSize: 14 }}>Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accountBalances ?
            accountBalances.map((token) => (
              <TableRow
                key={token.name}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row" sx={{ fontSize: 14 }}>
                  {token.name}
                </TableCell>
                <TableCell sx={{ fontSize: 14 }}>{token.address}</TableCell>
                <TableCell sx={{ fontSize: 14 }}> {token.balance}</TableCell>
              </TableRow>
            ))
            : ''
            }
          </TableBody>
        </Table>
      </Paper>
      <SendDialog
        open={sendDialogOpen}
        onSend={handleSendDialogSend}
        onClose={handleSendDialogClose}
      />
      <ReceiveDialog
        address={accountPublicKey}
        open={receiveDialogOpen}
        onClose={handleReceiveDialogClose}
      />
    </Container>
  );
};

export default Index;
