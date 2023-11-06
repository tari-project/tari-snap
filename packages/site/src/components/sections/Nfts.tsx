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
import { getAccountData, getSubstate } from '../../utils/snap';
import Grid from '@mui/material/Grid';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import ImageListItemBar from '@mui/material/ImageListItemBar';
import { MintDialog } from '../MintDialog';
import { styled } from '@mui/material/styles';
import Card from '@mui/material/Card';
import StartIcon from '@mui/icons-material/Start';
import { SendNftDialog } from '../SendNftDialog';

function Nfts() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tari, tariDispatch] = useContext(TariContext);

    const [mintDialogOpen, setMintDialogOpen] = React.useState(false);
    const [receiveDialogOpen, setReceiveDialogOpen] = React.useState(false);
    const [selectedNft, setSelectedNft] = React.useState(null);
    const [sendDialogOpen, setSendDialogOpen] = React.useState(false);
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
                    const items = res.token_ids.map(id => {
                        return {
                            address: `${collection} nft_${id}`,
                            collection,
                            id
                        }
                    });
                    return items;
                })
                .flat();

            const nft_contents = await Promise.all(nft_addresses.map(async (nft: any) => {
                const content = await getSubstate(nft.address);
                return {
                    ...nft,
                    content
                }
            }));

            const substates = nft_contents
                .filter(nft => nft.content.result)
                .map(nft => {
                    //const address = content.result.address;
                    const metadata = nft.content.result.substate_contents.substate.NonFungible.data['@@TAGGED@@'][1];
                    return { ...nft, metadata };
                });

            return substates;
        } catch (e) {
            console.error(e);
            metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
            return [];
        }
    };

    const refreshNfts = async () => {
        const currentNfts = await getNfts();
        setNfts(currentNfts);

        // we keep polling for nfts to keep them updated
        setTimeout(async () => { await refreshNfts() }, 10000);
    }

    useEffect(() => {
        refreshNfts();
    }, []);

    const handleMintOpen = () => {
        setMintDialogOpen(true);
    };

    const handleMintClose = () => {
        setMintDialogOpen(false);
    };

    const handleReceiveOpen = () => {
        setReceiveDialogOpen(true);
    };

    const handleReceiveClose = () => {
        setReceiveDialogOpen(false);
    };

    const handleCopyClick = async (text: string | undefined) => {
        copyToCliboard(text);
    };

    const handleSendOpen = (nft) => {
        setSelectedNft(nft);
        setSendDialogOpen(true);
    };

    const handleSendClose = () => {
        setSendDialogOpen(false);
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
                                <ThemeButton text="Mint" onClick={handleMintOpen} />
                                <ThemeButton text="Receive" onClick={handleReceiveOpen} />
                            </Stack>
                        </Stack>

                    </Paper>
                    <Paper variant="outlined" elevation={0} sx={{ mt: 4, padding: 2, paddingLeft: 4, paddingRight: 4, borderRadius: 4 }}>
                        <Stack direction="column" justifyContent="flex-start" spacing={2}>
                            <Typography style={{ fontSize: 24 }} >
                                Owned NFTs
                            </Typography>
                        </Stack>
                        <Grid container spacing={2} sx={{ mt: 3}}>
                            {nfts.map((nft) => (
                                <Grid item xs={3}>
                                    <Stack direction="column" sx={{padding: 1}}>
                                        <Box sx={{ textAlign: 'center'}}>
                                            <img style={{borderRadius: 8, width: '100%'}} src={nft.metadata.image_url}/>
                                        </Box>
                                        <Stack direction="row" spacing={2} sx={{mt: 0.5}}>
                                            <Typography style={{ fontSize: 16 }} >
                                                {nft.metadata.name}
                                            </Typography>
                                            <IconButton aria-label="send" sx={{padding:0, minHeight: 0}} onClick={() => handleSendOpen(nft)}>
                                                <StartIcon style={{ fontSize: 16 }}/>
                                            </IconButton>
                                        </Stack>
                                    </Stack>
                                </Grid>
                            ))}
                        </Grid>
                    </Paper>
                    <MintDialog
                        open={mintDialogOpen}
                        onClose={handleMintClose}
                    />
                    <ReceiveDialog
                        address={tari.account?.public_key}
                        open={receiveDialogOpen}
                        onClose={handleReceiveClose}
                    />
                    <SendNftDialog
                        nft={selectedNft}
                        open={sendDialogOpen}
                        onClose={handleSendClose}
                    />
                </Container>)
                : (<div />)}
        </Container>
    );
}

export default Nfts;