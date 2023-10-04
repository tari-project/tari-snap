pub mod types;
pub mod transaction;
pub mod hashing;
pub mod serde_with;
pub mod argument_parser;
pub mod template;
pub mod substate;
pub mod fee_claim;
pub mod shard_id;

use wasm_bindgen::prelude::*;
use tari_crypto::tari_utilities::hex::Hex;
use tari_crypto::ristretto::RistrettoSecretKey;


#[wasm_bindgen]
pub fn greeter(name: &str) -> Result<String, JsError> {
    Ok(format!("Hello {name}!"))
}

#[wasm_bindgen]
pub fn simple_number(i: i32) -> i32{
    i + 3
}

#[wasm_bindgen]
pub fn build_ristretto_private_key(secret_key: &str) -> Result<String, JsError> {
    let res = RistrettoSecretKey::from_hex(secret_key)?;
    Ok(res.to_hex())
}