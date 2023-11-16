import React from 'react';
import Balances from '../components/sections/Balances';
import Transactions from '../components/sections/Transactions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import Nfts from '../components/sections/Nfts';


function Index() {
    const [tab, setTab] = React.useState(0);

    return (
        <Box sx={{ mt: 4 }}>
            <Stack direction='row' alignItems="center" justifyContent="center">
                <MenuItem sx={{ fontSize: 20, fontWeight: tab == 0 ? 'bold' : 'default' }} onClick={() => {setTab(0)}}>Balances</MenuItem>
                <MenuItem sx={{ fontSize: 20, fontWeight: tab == 1 ? 'bold' : 'default' }} onClick={() => {setTab(1)}}>Transactions</MenuItem>
                <MenuItem sx={{ fontSize: 20, fontWeight: tab == 2 ? 'bold' : 'default' }} onClick={() => {setTab(2)}}>NFTs</MenuItem>
            </Stack>

            {/* Balances */}
            {tab === 0 && (
                <Box >
                    <Balances />
                </Box>
            )}

            {/* Transactions */}
            {tab === 1 && (
                <Box >
                    <Transactions />
                </Box>
            )}

            {/* NFTs */}
            {tab === 2 && (
                <Box >
                    <Nfts />
                </Box>
            )}
        </Box>
    );
}

export default Index;