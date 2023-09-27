import { useContext } from 'react';
import styled, { useTheme } from 'styled-components';
import { MetamaskActions, MetaMaskContext, TariActions, TariContext } from '../hooks';
import { connectSnap, getThemePreference, getSnap, getTariWalletToken, setTariWallet } from '../utils';
import { HeaderButtons, SendHelloButton } from './Buttons';
import { SnapLogo } from './SnapLogo';
import { Toggle } from './Toggle';

const HeaderWrapper = styled.header`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2.4rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.border.default};
`;

const Title = styled.p`
  font-size: ${(props) => props.theme.fontSizes.title};
  font-weight: bold;
  margin: 0;
  margin-left: 1.2rem;
  ${({ theme }) => theme.mediaQueries.small} {
    display: none;
  }
`;

const LogoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const Header = ({
  handleToggleClick,
}: {
  handleToggleClick(): void;
}) => {
  const theme = useTheme();
  const [metamaskState, metamaskDispatch] = useContext(MetaMaskContext);
  const [tariState, tariDispatch] = useContext(TariContext);

  const handleMetamaskConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      metamaskDispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  const handleSetTariWalletClick = async () => {
    try {
      let token = await setTariWallet();
      tariDispatch({
        type: TariActions.SetToken,
        payload: token,
      });
    } catch (e) {
      console.error(e);
      metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };
  
  const handleConnectWalletClick = async () => {
    try {
      const token = await getTariWalletToken();
      console.log({token});
      tariDispatch({
        type: TariActions.SetToken,
        payload: token,
      });
    } catch (e) {
      console.error(e);
      metamaskDispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };

  return (
    <HeaderWrapper>
      <LogoWrapper>
        <SnapLogo color={theme.colors.icon.default} size={36} />
        <Title>Tari Wallet</Title>
      </LogoWrapper>
      <RightContainer>
        <HeaderButtons
          metamaskState={metamaskState} metamaskDispatch={(v) => metamaskDispatch(v)} onConnectClick={handleMetamaskConnectClick}
          onTariWalletClick={handleSetTariWalletClick}
          onTariTokenClick={handleConnectWalletClick}/>
      </RightContainer>
    </HeaderWrapper>
  );
};
