import { useContext, useEffect, useRef } from 'react';
import { MetaMaskContext, MetamaskActions, TariContext } from '../../hooks';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import React from 'react';
import Box from '@mui/material/Box';
import { ThemeButton } from '../Buttons';
import { ReceiveDialog } from '../ReceiveDialog';
import IconButton from '@mui/material/IconButton';
import { copyToCliboard, truncateText } from '../../utils/text';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getAccountData, getSubstate } from '../../utils/snap';
import Grid from '@mui/material/Grid';
import { MintDialog } from '../MintDialog';
import StartIcon from '@mui/icons-material/Start';
import { SendNftDialog } from '../SendNftDialog';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import QuestionMarkOutlined from '@mui/icons-material/QuestionMarkOutlined';
import Checkbox from '@mui/material/Checkbox';


function Nfts() {
    const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
    const [tari, tariDispatch] = useContext(TariContext);

    const [mintDialogOpen, setMintDialogOpen] = React.useState(false);
    const [receiveDialogOpen, setReceiveDialogOpen] = React.useState(false);
    const [selectedNft, setSelectedNft] = React.useState(null);
    const [sendDialogOpen, setSendDialogOpen] = React.useState(false);
    const [nfts, setNfts] = React.useState([]);
    const [filteredNfts, setFilteredNfts] = React.useState([]);
    const [imageNftCheck, setImageNftCheck] = React.useState(true);
    const [badgeNftCheck, setBadgeNftCheck] = React.useState(true);
    const [otherNftCheck, setOtherNftCheck] = React.useState(true);

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

    const nftIsImage = (nft: any) => {
        return nft.metadata.image_url;
    }

    const nftIsBadge = (nft: any) => {
        return Object.keys(nft.metadata).length === 0;
    }

    // filter grid of nfts when the checkboxes or the account nfts change
    useEffect(() => {
        let filtered = nfts;

        if (!imageNftCheck) {
            filtered = filtered.filter((nft) => !nftIsImage(nft));
        }

        if (!badgeNftCheck) {
            filtered = filtered.filter((nft) => !nftIsBadge(nft));
        }

        if (!otherNftCheck) {
            filtered = filtered.filter((nft) => nftIsImage(nft) || nftIsBadge(nft));
        }

        setFilteredNfts(filtered);
    }, [nfts, imageNftCheck, badgeNftCheck, otherNftCheck]);

    const handleCheckImages = (event: any) => {
        let checkboxValue = event.target.checked;
        setImageNftCheck(checkboxValue);
    };

    const handleCheckBadges = (event: any) => {
        let checkboxValue = event.target.checked;
        setBadgeNftCheck(checkboxValue);
    };

    const handleCheckOther = (event: any) => {
        let checkboxValue = event.target.checked;
        setOtherNftCheck(checkboxValue);
    };

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
                            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                <Stack direction="row" spacing={0.5} justifyContent="flex-start" alignItems='center'>
                                    <Checkbox defaultChecked onClick={handleCheckImages} value={imageNftCheck} />
                                    <Typography style={{ fontSize: 14 }}>Images</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} justifyContent="flex-start" alignItems='center'>
                                    <Checkbox defaultChecked onClick={handleCheckBadges} value={badgeNftCheck} />
                                    <Typography style={{ fontSize: 14 }}>Badges</Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.5} justifyContent="flex-start" alignItems='center'>
                                    <Checkbox defaultChecked onClick={handleCheckOther} value={otherNftCheck} />
                                    <Typography style={{ fontSize: 14 }}>Other</Typography>
                                </Stack>
                            </Stack>
                            <Grid container spacing={2} sx={{ mt: 3 }}>
                                {filteredNfts.map((nft: any) => (
                                    <Grid item xs={3}>
                                        <Stack direction="column" sx={{ padding: 1, height: '100%' }}>
                                            <Box sx={{ textAlign: 'center', verticalAlign: 'middle', height: '80%' }}>
                                                {
                                                    nftIsImage(nft) ? (<img style={{ borderRadius: 8, width: '100%' }} src={nft.metadata.image_url} />) :
                                                    nftIsBadge(nft) ? (<BadgeOutlined color='disabled' style={{ fontSize: 64, height: '100%' }} />) :
                                                    (<QuestionMarkOutlined color='disabled' style={{ fontSize: 64, height: '100%' }} />)
                                                }
                                            </Box>
                                            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                                <Typography style={{ fontSize: 16 }} >
                                                    {nft.metadata.name ? truncateText(nft.metadata.name, 20) : truncateText(nft.address, 20)}
                                                </Typography>
                                                <IconButton aria-label="send" sx={{ padding: 0, minHeight: 0 }} onClick={() => handleSendOpen(nft)}>
                                                    <StartIcon style={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    </Grid>
                                ))}
                            </Grid>
                        </Stack>
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