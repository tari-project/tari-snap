# tari-snap

This repository is a proof of concept of a MetaMask snap that add support to Tari network by acting as proxy to a running Tari Wallet Daemon

## Pre-requisites

To interact with Snaps, you will need to install [MetaMask Flask](https://metamask.io/flask/), a canary distribution for developers that provides access to upcoming features.

You will also need a Tari network running, with a wallet daemon (on `http://127.0.0.1:9000`) and an active account.

## Getting Started

```shell
git clone https://github.com/mrnaveira/tari-snap
cd tari-snap
yarn install && yarn start
```

The output of the yarn start command will direct you to open the URL `http://127.0.0.1:8000` for the test site.

In the test site you will need to click each button in order:
* **Install**: requests MetaMask to install the tari-snap
* **Set Tari wallet**: requests the snap to set up the proxy to the Tari wallet daemon at `http://127.0.0.1:9000`. In the future, this button could be located on the Tari wallet UI.
* **Get Tari wallet token**: This is the first requests that each dapp would do to connect to the tari-snap and request a JWT from the wallet daemon. The JWT is necessary for future calls.
* Now that we have the wallet JWT we can make any allowed request to the wallet daemon. This example includes **Get keys** (get all the wallet public keys) and **Send transaction** (sends a method call to an account to get the balance, you may need to edit the transaction parameters to adapt to your Tari network).

To inspect the results of the actions you will need to open the JavaScript console in your browser.

