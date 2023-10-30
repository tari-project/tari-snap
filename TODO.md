# TODO
* Transaction IDs returned by the submit_transaction or sumbit_instruction methods do not match with the network. Hash calculation may be wrong.
* Wait for transaction results and notify the user. We may need to use a snap cronjob to keep polling for pending transactions. Show both successful and rejected transactions.
* Transfer dialog fixes:
    * Refresh max balance when the account balance changes
    * The initial "0" in the amount input should be removed on focus
    * Notify that the transaction has been sent
* Encapsulate indexer logic in the snap into a library, removing it from the `index.ts` file
* Should we have a button to allow the wallet site to connect to metamask? How do other snaps do this?
* Test the `sendTransaction` method in a website. Typescript types for instructions and inputs would be nice
* Test transfers of different resources (other than the default Tari token)
* Confidential transactions (a switch in the send dialog?)
* Balances section:
    * Show resource symbols
    * Icon for copying resource addresses
    * Show confidential amounts
    * Icon button in each row for quick transfer using the transfer dialog
* Transactions section:
    * Show failed transactions (probably would require the web wallet to store them in localstorage) 
    * Show transaction details
    * In each transaction row show the accumulative balance change (+ or - amount of tari or other tokens)
* Initial "landing" page for connecting to the snap
* Metamask seed phrases (BIP-44) are not compatible with Tari (aezeed)
    * Wallet daemon and other Tari tools should take this into account and accept both seed phrases, scanning the network to see which one the user has funds in
* We need to decide on a [coinType for Tari](https://github.com/satoshilabs/slips/blob/master/slip-0044.md). Right now I temporarily use `12345678`.
* About Ristretto public keys I have some concerns:
    * We are calling `RistrettoSecretKey::from_hex(metamask_ed25519_secret_key_hex)`, and it works. Is there any problem?
    * Why if I use `from_hex` and then `to_hex` I get totally different values?
* I am using `tari-crypto` version `0.17` because `0.18` gave me trouble when compiling to WASM (due to `getrandom` dependency)
* Indexer performance could be greatly improved (specially in a testnet if we start having multiple users) by implementing caching of substates/transactions.
* Support multiple accounts in the wallet (by changing the index of the private key: 0, 1, etc)
* More sections in the wallet:
    * Show NFTs, allow to mint and send them
    * Swap fungible tokens, by integrating the tariswap project in the wallet
    * Bridge from ethereum, by integrating the tari-atomic-swap project


