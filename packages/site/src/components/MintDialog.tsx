import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React, { useEffect } from "react";
import CloseIcon from '@mui/icons-material/Close';
import IconButton from "@mui/material/IconButton";
import { ThemeFullWidthButton } from "./Buttons";
import { MetamaskActions } from "../hooks";
import { defaultSnapOrigin } from "../config/snap";

export interface MintDialogProps {
    open: boolean;
    onClose: () => void;
}

export function MintDialog(props: MintDialogProps) {
    const { onClose, open } = props;

    const [url, setUrl] = React.useState('');
    const [name, setName] = React.useState('');
    const [fee, setFee] = React.useState(0);

    // clear dialog form each time it closes
    useEffect(() => {
        if (!open) {
            setUrl('');
            setName('');
        }
    }, [open]);

    const handleClose = () => {
        onClose();
    };

    const handleUrlChange = async (event) => {
        setUrl(event.target.value);
    };

    const handleNameChange = async (event) => {
        setName(event.target.value);
    };

    const handleFeeChange = async (event) => {
        setFee(event.target.value);
    };

    const handleMintClick = async () => {
        try {
            const metadata = [];
            if (name) {
                metadata.push({ key: 'name', value: name });
            }
            if (url) {
                metadata.push({ key: 'image_url', value: url });
            }
            const response = await window.ethereum.request({
                method: 'wallet_invokeSnap',
                params: {
                    snapId: defaultSnapOrigin,
                    request: {
                        method: 'mintAccountNft',
                        params: {
                            metadata,
                            fee,
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

    return (
        <Dialog fullWidth={true} onClose={handleClose} open={open}>
            <Box sx={{ padding: 4, borderRadius: 4 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography style={{ fontSize: 24 }}>Mint</Typography>
                    <IconButton aria-label="copy" onClick={handleClose}>
                        <CloseIcon style={{ fontSize: 24 }} />
                    </IconButton>
                </Stack>
                <Box sx={{ textAlign: 'center'}}>
                    <img style={{maxWidth: '50%', maxHeight: '50%', borderRadius: '10px'}} src={url}/>
                </Box>         
                <Typography sx={{ mt: 4 }} style={{ fontSize: 14 }}>
                    Image URL
                </Typography>
                <TextField sx={{ width: '100%' }}
                    id="input-url"
                    value={url}
                    onChange={handleUrlChange}
                    InputProps={{
                        sx: { borderRadius: 4, mt: 1 },
                    }}>
                </TextField>
                <Typography sx={{ mt: 3 }} style={{ fontSize: 14 }}>
                    Name
                </Typography>
                <TextField sx={{ width: '100%' }}
                    id="input-name"
                    value={name}
                    onChange={handleNameChange}
                    InputProps={{
                        sx: { borderRadius: 4, mt: 1 },
                    }}></TextField>
                <Typography sx={{ mt: 3 }} style={{ fontSize: 14 }}>
                    Fee
                </Typography>
                <TextField sx={{ mt: 1, width: '100%' }} 
                    placeholder="0"
                    id="input-fee"
                    value={fee}
                    onChange={handleFeeChange}
                    InputProps={{
                        sx: { borderRadius: 4, mt: 1 },
                    }}>
                 </TextField>
                <Stack direction="row" justifyContent="center" sx={{ mt: 3, width: '100%' }}>
                    <ThemeFullWidthButton text="Mint" onClick={handleMintClick} />
                </Stack>
            </Box>
        </Dialog >
    );
}

function metamaskDispatch(arg0: { type: any; payload: any; }) {
    throw new Error("Function not implemented.");
}
