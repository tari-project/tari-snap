import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React, { useContext, useEffect } from "react";
import CloseIcon from '@mui/icons-material/Close';
import IconButton from "@mui/material/IconButton";
import { MetaMaskContext, MetamaskActions, TariContext } from "../hooks";
import { ThemeFullWidthButton } from "./Buttons";
import { copyToCliboard, truncateText } from "../utils/text";
import { defaultSnapOrigin } from "../config/snap";
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import QuestionMarkOutlined from "@mui/icons-material/QuestionMarkOutlined";

export interface SendNftDialogProps {
    nft: Object | null;
    open: boolean;
    onClose: () => void;
}

export function SendNftDialog(props: SendNftDialogProps) {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tariState, tariDispatch] = useContext(TariContext);

    const { nft, onClose, open } = props;
    const [recipient, setRecipient] = React.useState('');

    // clear dialog form each time it closes
    useEffect(() => {
        if (!open) {
            setRecipient('');
        }
    }, [open]);

    const handleRecipientChange = async (event) => {
        setRecipient(event.target.value);
    };

    const nftIsImage = (nft: any) => {
        return nft.metadata.image_url;
    }

    const nftIsBadge = (nft: any) => {
        return Object.keys(nft.metadata).length === 0;
    }

    const handleSendClick = async () => {
        try {
            const response = await window.ethereum.request({
                method: 'wallet_invokeSnap',
                params: {
                    snapId: defaultSnapOrigin,
                    request: {
                        method: 'transferNft',
                        params: {
                            nft_address: nft.address,
                            nft_id: nft.id,
                            nft_resource: nft.collection,
                            destination_public_key: recipient,
                            fee: 1,
                        }
                    }
                },
            });
            console.log({ response });
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
        }
        handleClose();
    };

    const handleClose = () => {
        onClose();
    };

    const handleCopyClick = async (text) => {
        copyToCliboard(text);
    };

    const shouldRender = () => {
        return nft
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
                <Box sx={{ textAlign: 'center' }}>
                    {
                        nftIsImage(nft) ? (<img style={{ maxWidth: '50%', maxHeight: '50%', borderRadius: '10px' }} src={nft.metadata.image_url} />) :
                        nftIsBadge(nft) ? (<BadgeOutlined color='disabled' style={{ fontSize: 64, height: '100%' }} />) :
                        (<QuestionMarkOutlined color='disabled' style={{ fontSize: 64, height: '100%' }} />)
                    }
                </Box>
                <Stack direction="column" alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                    <Typography alignSelf="center" style={{ fontSize: 18 }} >
                        {truncateText(nft.metadata.name, 20)}
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="center">

                        <Typography style={{ fontSize: 15 }} >
                            {truncateText(nft.address, 20)}
                        </Typography>
                        <IconButton aria-label="copy" onClick={() => handleCopyClick(nft.address)}>
                            <ContentCopyIcon />
                        </IconButton>
                    </Stack>

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
                <Stack direction="row" justifyContent="center" sx={{ mt: 4, width: '100%' }}>
                    <ThemeFullWidthButton text="Send" onClick={async () => { await handleSendClick(); }} />
                </Stack>
            </Box>
        </Dialog >
    );
}