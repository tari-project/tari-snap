pub mod types;
pub mod transaction;
pub mod hashing;
pub mod serde_with;
pub mod argument_parser;
pub mod template;
pub mod substate;
pub mod fee_claim;
pub mod shard_id;

use std::str::FromStr;

use hashing::{hasher, EngineHashDomainLabel};
use tari_crypto::keys::PublicKey;
use tari_template_lib::{Hash, args};
use tari_template_lib::prelude::{ComponentAddress, Amount, ResourceAddress};
use template::TemplateAddress;
use transaction::instruction::Instruction;
use transaction::transaction::Transaction;
use wasm_bindgen::prelude::*;
use tari_crypto::tari_utilities::hex::Hex;
use tari_crypto::ristretto::{RistrettoSecretKey, RistrettoPublicKey};

#[wasm_bindgen]
pub fn build_ristretto_public_key(ecdsa_private_key: &str) -> Result<String, JsError> {
    let private_key = RistrettoSecretKey::from_hex(ecdsa_private_key)?;
    let public_key = RistrettoPublicKey::from_secret_key(&private_key);
    Ok(public_key.to_hex())
}

#[wasm_bindgen]
pub fn create_transfer_transaction(source_ecdsa_private_key: &str, destination_public_key: &str, resource_address: &str, amount: i64, fee: i64) -> Result<JsValue, JsError> {
    let source_private_key = RistrettoSecretKey::from_hex(source_ecdsa_private_key)?;
    let source_public_key = RistrettoPublicKey::from_secret_key(&source_private_key);
    let source_account_address = get_account_address_from_public_key(&source_public_key.to_hex())?;

    let destination_account_address = get_account_address_from_public_key(destination_public_key)?;
    
    let instructions = [
        Instruction::CallMethod {
            component_address: source_account_address,
            method: "withdraw".to_string(),
            args: args![ResourceAddress::from_str(resource_address)?, Amount::new(amount)],
        },
        Instruction::PutLastInstructionOutputOnWorkspace {
            key: b"bucket".to_vec(),
        },
        Instruction::CallMethod {
            component_address: destination_account_address,
            method: "deposit".to_string(),
            args: args![Workspace("bucket")],
        },
        Instruction::CallMethod {
            component_address: source_account_address,
            method: "pay_fee".to_string(),
            args: args![Amount::new(fee)],
        },
    ];

    let transaction = Transaction::builder()
        .with_fee_instructions(instructions.to_vec())
        .with_input_refs(vec![])
        .sign(&source_private_key)
        .build();

    Ok(serde_wasm_bindgen::to_value(&transaction)?)
}

fn get_account_address_from_public_key(public_key: &str) -> Result<ComponentAddress, JsError> {
    let destination_component_id = Hash::from_hex(public_key)?;
    const ACCOUNT_TEMPLATE_ADDRESS: TemplateAddress = TemplateAddress::from_array([0; 32]);
    let account_address = new_component_address_from_parts(&ACCOUNT_TEMPLATE_ADDRESS, &destination_component_id);

    Ok(account_address)
}

fn new_component_address_from_parts(template_address: &TemplateAddress, component_id: &Hash) -> ComponentAddress {
    let address = hasher(EngineHashDomainLabel::ComponentAddress)
        .chain(template_address)
        .chain(component_id)
        .result();
    ComponentAddress::new(address)
}