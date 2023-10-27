import { useContext, useEffect } from 'react';
import { MetaMaskContext, MetamaskActions, TariContext } from '../../hooks';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import React from 'react';
import Box from '@mui/material/Box';
import { ThemeButton } from '../Buttons';
import { defaultSnapOrigin } from '../../config/snap';
import { ReceiveDialog } from '../ReceiveDialog';
import IconButton from '@mui/material/IconButton';
import { copyToCliboard } from '../../utils/text';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getAccountData } from '../../utils/snap';

function Nfts() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tari, tariDispatch] = useContext(TariContext);

    const [receiveDialogOpen, setReceiveDialogOpen] = React.useState(false); 
    const [nfts, setNfts] = React.useState([]); 

    const getNfts = async () => {
        try {
            const data = await getAccountData();

            if (!tari || !data || !data.resources) {
                return [];
            }

            let nft_addresses = data.resources
                .filter(res => res.type === 'nonfungible')
                .map(res => {
                    const collection = res.resource_address;
                    const items = res.token_ids.map(id => `${collection} ${id}`);
                    return items;
                })
                .flat();

            return nft_addresses;
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
            return [];
        }
    };

    const refreshNfts = async () => {
        const currentNfts = await getNfts();
        setNfts(currentNfts);
        console.log({currentNfts});

        // we keep polling for nfts to keep them updated
        setTimeout(async () => { await refreshNfts() }, 10000);
    }

    useEffect(() => {
        refreshNfts();
    }, []);

    const handleMint = async () => {
        try {
            const metadata = [
                { key: 'name', value: 'Test NFT' },
                { key: 'image_url', value: 'https://img.freepik.com/free-vector/hand-drawn-nft-style-ape-illustration_23-2149622024.jpg' },
            ];
            const response = await window.ethereum.request({
                method: 'wallet_invokeSnap',
                params: {
                    snapId: defaultSnapOrigin,
                    request: {
                        method: 'mintAccountNft',
                        params: {
                            metadata,
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
    }

    const handleReceiveOpen = () => {
        setReceiveDialogOpen(true);
    };

    const handleReceiveClose = () => {
        setReceiveDialogOpen(false);
    };

    const handleCopyClick = async (text: string | undefined) => {
        copyToCliboard(text);
    };

    return (
        <Container>
        {tari.account?.public_key ?
            (<Container>
                <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft: 4, paddingRight: 4, borderRadius: 4 }}>
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                            <Box>
                                <Typography style={{ fontSize: 12 }} >
                                    Account address
                                </Typography>
                                <Stack direction="row" alignItems="center" justifyContent="center">
                                    <Typography style={{ fontSize: 15 }} >
                                        {tari.account?.public_key}
                                    </Typography>
                                    <IconButton aria-label="copy" onClick={() => handleCopyClick(tari.account?.public_key)}>
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Stack>
                            </Box>
                        <Stack direction="row" spacing={2}>
                            <ThemeButton text="Mint" onClick={async () => { await handleMint(); }}/>
                            <ThemeButton text="Receive" onClick={handleReceiveOpen}/>
                        </Stack>
                    </Stack>
    
                </Paper>
                <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft: 4, paddingRight: 4, borderRadius: 4 }}>
                    No NFTs owned
                </Paper>
                <ReceiveDialog
                        address={tari.account?.public_key}
                        open={receiveDialogOpen}
                        onClose={handleReceiveClose}
                    />
            </Container>) 
            : (<div/>) }
    </Container>
    );
}

export default Nfts;