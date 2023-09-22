import { useContext } from 'react';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  getTariWalletToken,
  isLocalSnap,
  sendHello,
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
  const [state, dispatch] = useContext(MetaMaskContext);
  const [sendDialogOpen, setSendDialogOpen] = React.useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = React.useState(false);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleSendHelloClick = async () => {
    try {
      await sendHello();
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleSetTariWalletClick = async () => {
    try {
      await setTariWallet();
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleGetTariWalletTokenClick = async () => {
    try {
      const token = await getTariWalletToken();
      console.log({ token });
      window.tariToken = token;
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleGetTariWalletKeysClick = async () => {
    try {
      const walletRequest = {
        method: 'keys.list',
        params: {}
      };

      const keys = await sendWalletRequest(window.tariToken, walletRequest);
      console.log({ keys });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleSendTransactionClick = async () => {
    try {
      const walletRequest = {
        method: 'transactions.submit',
        params: {
          "signing_key_index": 0,
          "fee_instructions": [],
          "instructions": [
            {
              "CallMethod": {
                "component_address": "component_00c7bfe3dc0fe7fd0d1d7b0e3333b8c4b6e6f321ca181681ac45e7b2782e9573",
                "method": "get_balances",
                "args": []
              }
            }
          ],
          "inputs": [
            { "address": "component_00c7bfe3dc0fe7fd0d1d7b0e3333b8c4b6e6f321ca181681ac45e7b2782e9573" }
          ],
          "override_inputs": false,
          "new_outputs": 0,
          "specific_non_fungible_outputs": [],
          "new_resources": [],
          "new_non_fungible_outputs": [],
          "new_non_fungible_index_outputs": [],
          "is_dry_run": true,
          "proof_ids": []
        }
      };

      const result = await sendWalletRequest(window.tariToken, walletRequest);
      console.log({ result });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  function createData(
    name: string,
    calories: number,
    fat: number,
    carbs: number,
    protein: number,
  ) {
    return { name, calories, fat, carbs, protein };
  }

  const accountAddress = "account_address";

  const tokens = [
    { name: 'Tari', address: 'resource_0101010101010101010101010101010101010101010101010101010101010101', balance: 10000 },
    { name: 'A', address: 'resource_0101010101010101010101010101010101010101010101010101010101010102', balance: 555000 },
    { name: 'B', address: 'resource_0101010101010101010101010101010101010101010101010101010101010103', balance: 10 },
  ];

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
    console.log({token, amount, recipientAddress});
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
      <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft:4, paddingRight:4, borderRadius: 4 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography style={{ fontSize: 12 }} >
              Account name
            </Typography>
            <Stack direction="row" alignItems="center" justifyContent="center">
              <Typography style={{ fontSize: 15 }} >
                {accountAddress}
              </Typography>
              <IconButton aria-label="copy" onClick={() => handleCopyClick(accountAddress)}>
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
      <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft:4, paddingRight:4, borderRadius: 4}}>
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
          {tokens.map((token) => (
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
          ))}
        </TableBody>
      </Table>
      </Paper>
      <SendDialog
        open={sendDialogOpen}
        onSend={handleSendDialogSend}
        onClose={handleSendDialogClose}
      />
      <ReceiveDialog
        open={receiveDialogOpen}
        onClose={handleReceiveDialogClose}
      />
    </Container>
  );
};

export default Index;
