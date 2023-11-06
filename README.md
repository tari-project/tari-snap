# tari-snap

This repository contains:
* A MetaMask snap that adds support to Tari network, allowing the user to send and retrieve transactions.
* A web wallet as an UI to visualize and perform account management operations (see balances, transfer, etc.).

Please read the [TODO](TODO.md) file for upcoming features.

## Pre-requisites

To interact with Snaps, you will need to install [MetaMask Flask](https://metamask.io/flask/), a canary distribution for developers that provides access to upcoming features.

You will also need a Tari network running, with an indexer. 

For building the project, Node.js version 18 or superior is required.

## Getting Started

First clone the repo
```shell
git clone https://github.com/mrnaveira/tari-snap
cd tari-snap
```

Then you need to build the WebAssembly library used to build Tari transactions:
```shell
cd tari_wallet_lib
npm install
npm run build
```

The snap requires connection to a Tari indexer to access the Tari network. The URL value is configured in the `tari-snap/snap/.env` file, which you need to create by making a copy of the `tari-snap/snap/.env.example` file.

Finally, from the root folder (`tari-snap`), build and launch the snap and wallet website:
```shell
yarn install
yarn start
```

The output of the yarn start command will direct you to open the URL `http://127.0.0.1:8000` for the wallet website.

