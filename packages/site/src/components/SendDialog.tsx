import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
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
import Button from "@mui/material/Button";
import { MetaMaskContext, MetamaskActions, TariContext } from "../hooks";
import { hex_to_int_array, resource_address_to_int_array, sendWalletRequest } from "../utils/snap";

const tokens = [
    { value: "resource_0101010101010101010101010101010101010101010101010101010101010101", text: "Tari" },
    { value: "a_coin", text: "A coin" },
    { value: "b_coin", text: "B coin" },
];

export interface SendDialogProps {
    open: boolean;
    onSend: (token: string, amount: number, recipient: string) => void;
    onClose: () => void;
}

export function SendDialog(props: SendDialogProps) {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tariState, tariDispatch] = useContext(TariContext);

    const { onSend, onClose, open } = props;
    const [token, setToken] = React.useState(tokens[0].value);
    const [amount, setAmount] = React.useState(0);
    const [recipient, setRecipient] = React.useState('');

    useEffect(() => {
        // clear dialog data each time it closes
        if (!open) {
            setToken(tokens[0].value);
            setAmount(0);
            setRecipient('');
        }
    }, [open]);

    const handleTokenChange = async (event) => {
        setToken(event.target.value);
    };

    const handleAmountChange = async (event) => {
        setAmount(event.target.value);
    };

    const handleRecipientChange = async (event) => {
        setRecipient(event.target.value);
    };

    const handleSendClick = async () => {
        try {
            console.log({token});
            const resource_address = resource_address_to_int_array(token);
            const walletRequest = {
                method: 'accounts.transfer',
                params: {
                    account: null,
                    amount: parseInt(amount),
                    resource_address,
                    destination_public_key: recipient,
                    fee: 1,
                }
            };
            console.log({token: tariState.token, walletRequest });

            const {transaction_id, result} = await sendWalletRequest(tariState.token, walletRequest);
            console.log({transaction_id, result});
            onSend(token, amount, recipient);
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog fullWidth={true} onClose={handleClose} open={open}>
            <Box sx={{ padding: 4, borderRadius: 4 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography style={{ fontSize: 24 }}>Send</Typography>
                    <IconButton aria-label="copy" onClick={handleClose}>
                        <CloseIcon style={{ fontSize: 24 }} />
                    </IconButton>
                </Stack>
                <Divider sx={{ mt: 3, mb: 3 }} variant="middle" />
                <Box>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <Typography style={{ fontSize: 12 }}>
                            Token
                        </Typography>
                        <Typography style={{ fontSize: 12 }}>
                            Max: 0
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} sx={{ marginTop: 1 }}>
                        <Select
                            id="token"
                            value={token}
                            onChange={handleTokenChange}
                            sx={{ width: '30%', borderRadius: 4 }}
                        >
                            {tokens.map((t) => (
                                <MenuItem value={t.value}>
                                    <ListItemText primary={t.text} />
                                </MenuItem>
                            ))}
                        </Select>
                        <TextField sx={{ width: '70%' }} id="amount" placeholder="0"
                            onChange={handleAmountChange}
                            InputProps={{
                                sx: { borderRadius: 4 },
                            }}
                            inputProps={{
                                style: { textAlign: "right" },
                            }}>
                        </TextField>
                    </Stack>
                    <Typography sx={{ mt: 3 }} style={{ fontSize: 12 }}>
                        Recipient
                    </Typography>
                    <TextField sx={{ mt: 1, width: '100%' }} id="recipient" placeholder="0"
                        onChange={handleRecipientChange}
                        InputProps={{
                            sx: { borderRadius: 4 },
                        }}>
                    </TextField>
                </Box>
                <Button variant="contained" sx={{ width: '100%', mt: 3, padding: 2, borderRadius: 4, textTransform: 'none', justifySelf: 'right' }} onClick={async () => { await handleSendClick(); }}>
                    <Typography style={{ fontSize: 15 }} >
                        Send
                    </Typography>
                </Button>
            </Box>
        </Dialog >
    );
}