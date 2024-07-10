use tari_crypto::ristretto::RistrettoPublicKey;
use tari_crypto::tari_utilities::hex::Hex;
use tari_engine_types::component::new_component_address_from_public_key;
use tari_template_builtin::ACCOUNT_TEMPLATE_ADDRESS;
use tari_template_lib::prelude::ComponentAddress;
use wasm_bindgen::JsError;

pub fn get_account_address_from_public_key(public_key: &str) -> Result<ComponentAddress, JsError> {
    let destination_component_id = RistrettoPublicKey::from_hex(public_key).unwrap();
    let account_address = new_component_address_from_public_key(&ACCOUNT_TEMPLATE_ADDRESS, &destination_component_id);
    Ok(account_address)
}