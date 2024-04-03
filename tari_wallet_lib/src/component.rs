use tari_crypto::ristretto::RistrettoPublicKey;
use tari_crypto::tari_utilities::hex::Hex;
use tari_engine_types::component::new_account_address_from_parts;
use tari_template_builtin::{ACCOUNT_NFT_TEMPLATE_ADDRESS, ACCOUNT_TEMPLATE_ADDRESS};
use tari_template_lib::{prelude::ComponentAddress, };
use wasm_bindgen::JsError;


pub fn get_account_address_from_public_key(public_key: &str) -> Result<ComponentAddress, JsError> {
    let destination_component_id = RistrettoPublicKey::from_hex(public_key).unwrap();
    let account_address = new_account_address_from_parts(&ACCOUNT_TEMPLATE_ADDRESS, &destination_component_id);
    Ok(account_address)
}

pub fn get_account_nft_address_from_public_key(public_key: &str) -> Result<ComponentAddress, JsError> {
    let public_key = RistrettoPublicKey::from_hex(public_key).unwrap();
    let account_nft_address = new_account_address_from_parts(&ACCOUNT_NFT_TEMPLATE_ADDRESS, &public_key);
    Ok(account_nft_address)
}