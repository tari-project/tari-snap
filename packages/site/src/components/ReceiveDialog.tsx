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
import React, { useEffect } from "react";
import CloseIcon from '@mui/icons-material/Close';
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import { QRCodeSVG } from 'qrcode.react';

const token = "Tari";
const address = "fooo"

export interface SendDialogProps {
    open: boolean;
    onClose: () => void;
}

export function ReceiveDialog(props: SendDialogProps) {
    const { onClose, open } = props;

    const handleClose = () => {
        onClose();
    };

    const handleCopyClick = async () => {
        navigator.clipboard.writeText(address);
    };

    return (
        <Dialog fullWidth={true} onClose={handleClose} open={open}>
            <Box sx={{ padding: 4, borderRadius: 4 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography style={{ fontSize: 24 }}>Receive {token}</Typography>
                    <IconButton aria-label="copy" onClick={handleClose}>
                        <CloseIcon style={{ fontSize: 24 }} />
                    </IconButton>
                </Stack>
                <Divider sx={{ mt: 3, mb: 3 }} variant="middle" />
                <Stack direction="row" justifyContent="center">
                    <QRCodeSVG value={address} />
                </Stack>
                <Stack direction="row" justifyContent="center">
                    <Typography sx={{ mt: 4, fontSize: 12, }}>Your {token} address</Typography>
                </Stack>           
                <Stack direction="row" justifyContent="center">
                    <Typography sx={{ mt: 2, fontSize: 24, }}>{address}</Typography>
                </Stack>   
                <Button variant="contained" sx={{ width: '100%', mt: 3, padding: 2, borderRadius: 4, textTransform: 'none', justifySelf: 'right' }} onClick={handleCopyClick}>
                    <Typography style={{ fontSize: 15 }} >
                        Copy address
                    </Typography>
                </Button>
            </Box>
        </Dialog >
    );
}