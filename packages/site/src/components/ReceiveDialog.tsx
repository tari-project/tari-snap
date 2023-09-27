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
import { ThemeFullWidthButton } from "./Buttons";

export interface SendDialogProps {
    address?: string,
    open: boolean;
    onClose: () => void;
}

export function ReceiveDialog(props: SendDialogProps) {
    const { address, onClose, open } = props;

    const handleClose = () => {
        onClose();
    };

    const truncateText = (text: string, length: number) => {
        if (!length || !text || text.length <= length) {
            return text;
        }
        if (text.length <= length) {
            return text;
        }
        const leftChars = Math.ceil(length/2);
        const rightChars = Math.floor(length/2);
        return text.substring(0, leftChars) + '...' + text.substring(text.length - rightChars);
    }

    const handleCopyClick = async () => {
        if(address) {
            navigator.clipboard.writeText(address);
        }
    };

    return (
        <Dialog fullWidth={true} onClose={handleClose} open={open}>
            <Box sx={{ padding: 4, borderRadius: 4 }}>
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                    <Typography style={{ fontSize: 24 }}>Receive</Typography>
                    <IconButton aria-label="copy" onClick={handleClose}>
                        <CloseIcon style={{ fontSize: 24 }} />
                    </IconButton>
                </Stack>
                <Divider sx={{ mt: 3, mb: 3 }} variant="middle" />
                <Stack direction="row" justifyContent="center">
                    <QRCodeSVG value={address} />
                </Stack>
                <Stack direction="row" justifyContent="center">
                    <Typography sx={{ mt: 4, fontSize: 14, }}>Your address</Typography>
                </Stack>           
                <Stack direction="row" justifyContent="center">
                    <Typography sx={{ mt: 2, fontSize: 24, wordWrap: "break-word" }}>{truncateText(address, 20)}</Typography>
                </Stack>   
                <Stack direction="row" justifyContent="center" sx={{ mt: 3, width: '100%' }}>
                    <ThemeFullWidthButton text="Copy Address" onClick={handleCopyClick}/>
                </Stack>
            </Box>
        </Dialog >
    );
}