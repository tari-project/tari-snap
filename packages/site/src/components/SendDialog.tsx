import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React, { useContext, useEffect } from "react";
import CloseIcon from '@mui/icons-material/Close';
import IconButton from "@mui/material/IconButton";
import { MetaMaskContext, MetamaskActions, TariContext } from "../hooks";
import { ThemeFullWidthButton } from "./Buttons";
import { truncateText } from "../utils/text";
import { defaultSnapOrigin } from "../config/snap";

export interface SendDialogProps {
    open: boolean;
    onSend: (token: string, amount: number, recipient: string) => void;
    onClose: () => void;
    accountBalances: Object[];
}

export function SendDialog(props: SendDialogProps) {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tariState, tariDispatch] = useContext(TariContext);

    const { onSend, onClose, accountBalances, open } = props;
    const [token, setToken] = React.useState(null);
    const [tokenBalance, setTokenBalance] = React.useState(0);
    const [amount, setAmount] = React.useState(0);
    const [recipient, setRecipient] = React.useState('');
    const [fee, setFee] = React.useState(0);

    // clear dialog form each time it closes
    useEffect(() => {
        if (!open && shouldRender()) {
            refreshForm();
        }
    }, [open]);

    // reset the form if the user account balances change
    useEffect(() => {
        if (!token) {
            refreshForm();
        }
    }, [props.accountBalances]);

    // recalculate the max balance when a token is selected
    useEffect(() => {
        if (token) {
            const value = getTokenBalance(token);
            setTokenBalance(value);
        }
    }, [token]);

    const refreshForm = () => {
        if (accountBalances && accountBalances.length > 0) {
            setToken(accountBalances[0].resource_address);
            setAmount(0);
            setRecipient('');
        }
    };

    const handleTokenChange = async (event) => {
        setToken(event.target.value);
    };

    const handleAmountChange = async (event) => {
        setAmount(event.target.value);
    };

    const handleRecipientChange = async (event) => {
        setRecipient(event.target.value);
    };

    const handleFeeChange = async (event) => {
        setFee(event.target.value);
    };

    const handleMaxBalanceClick = async () => {
        setAmount(tokenBalance);
    };

    const getTokenBalance = (tokenAddress: string) => {
        if (!tokenAddress || !props.accountBalances) {
            return 0;
        }

        const element = props.accountBalances.find((b) => b.resource_address === tokenAddress);
        if (element) {
            return element.balance;
        } else return 0;
    }

    const handleSendClick = async () => {
        try {
            const response = await window.ethereum.request({
                method: 'wallet_invokeSnap',
                params: {
                    snapId: defaultSnapOrigin,
                    request: {
                        method: 'transfer',
                        params: {
                            amount,
                            resource_address: token,
                            destination_public_key: recipient,
                            fee,
                        }
                    }
                },
            });
            console.log({ response });
            onSend(token, amount, recipient);
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
        }
    };

    const handleClose = () => {
        onClose();
    };

    const shouldRender = () => {
        return token && accountBalances;
    }

    if (!shouldRender()) {
        return null;
    }

    return (
        <Dialog fullWidth={true} onClose={handleClose} open={open}>
            <Box sx={{ padding: 5, borderRadius: 4 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography style={{ fontSize: 24 }}>Send</Typography>
                    <IconButton aria-label="copy" onClick={handleClose}>
                        <CloseIcon style={{ fontSize: 24 }} />
                    </IconButton>
                </Stack>
                <Divider sx={{ mt: 3, mb: 3 }} variant="middle" />
                <Box sx={{ padding: 1 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography style={{ fontSize: 14 }}>
                            Token
                        </Typography>
                        <Typography style={{ fontSize: 14, cursor: 'pointer' }} onClick={handleMaxBalanceClick}>
                            Max: {tokenBalance}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} sx={{ marginTop: 1 }}>
                        <Select
                            id="token"
                            value={token}
                            onChange={handleTokenChange}
                            sx={{ width: '30%', borderRadius: 4, height: '47px' }}
                        >
                            {props.accountBalances.map((b) => (
                                <MenuItem value={b.resource_address}>
                                    <ListItemText primary={truncateText(b.resource_address, 15)} />
                                </MenuItem>
                            ))}
                        </Select>
                        <TextField sx={{ width: '70%' }} id="amount" placeholder="0"
                            value={amount}
                            onChange={handleAmountChange}
                            InputProps={{
                                sx: { borderRadius: 4 },
                            }}
                            inputProps={{
                                style: { textAlign: "right" },
                            }}>
                        </TextField>
                    </Stack>
                    <Typography sx={{ mt: 4 }} style={{ fontSize: 14 }}>
                        Recipient
                    </Typography>
                    <TextField sx={{ mt: 1, width: '100%' }} id="recipient" placeholder="0"
                        onChange={handleRecipientChange}
                        InputProps={{
                            sx: { borderRadius: 4 },
                        }}>
                    </TextField>
                    <Typography sx={{ mt: 4 }} style={{ fontSize: 14 }}>
                        Fee
                    </Typography>
                    <TextField sx={{ mt: 1, width: '100%' }} id="fee" placeholder="0"
                        onChange={handleFeeChange}
                        InputProps={{
                            sx: { borderRadius: 4 },
                        }}>
                    </TextField>
                </Box>
                <Stack direction="row" justifyContent="center" sx={{ mt: 4, width: '100%' }}>
                    <ThemeFullWidthButton text="Send" onClick={async () => { await handleSendClick(); }} />
                </Stack>
            </Box>
        </Dialog >
    );
}