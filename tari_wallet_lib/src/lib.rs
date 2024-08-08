pub mod component;
mod crypto;
pub mod metadata;
mod confidential_transfer;

use std::collections::HashMap;
use std::str::FromStr;

use component::get_account_address_from_public_key;
use confidential_transfer::{build_confidential_transfer_transaction, ConfidentialTransferInputSelection, ConfidentialTransferParams};
use crypto::AlwaysMissLookupTable;
use tari_crypto::keys::{PublicKey, SecretKey};
use tari_crypto::ristretto::{RistrettoPublicKey, RistrettoSecretKey};
use tari_crypto::tari_utilities::hex::Hex;
use tari_crypto::tari_utilities::ByteArray;
use tari_engine_types::confidential::ElgamalVerifiableBalance;
use tari_engine_types::instruction::Instruction;
use tari_engine_types::resource::Resource;
use tari_engine_types::substate::SubstateId;
use tari_engine_types::vault::Vault;
use tari_template_lib::args;
use tari_template_lib::constants::XTR_FAUCET_COMPONENT_ADDRESS;
use tari_template_lib::models::VaultId;
use tari_template_lib::prelude::{
    Amount, NonFungibleAddress, ResourceAddress, RistrettoPublicKeyBytes, NonFungibleId,
};
use tari_transaction::{SubstateRequirement, Transaction};
use wasm_bindgen::prelude::*;

fn ecdsa_to_ristretto_private_key(ecdsa_str: &str) -> Result<RistrettoSecretKey, JsError> {
    let no_prefix_hex = ecdsa_str.strip_prefix("0x").unwrap_or(ecdsa_str);
    RistrettoSecretKey::from_uniform_bytes(no_prefix_hex.as_bytes())
        .map_err(|e| JsError::new(&format!("Could not parse private key: {:?}", e)))
}

#[wasm_bindgen]
pub fn build_ristretto_private_key(ecdsa_str: &str) -> Result<String, JsError> {
    let private_key = ecdsa_to_ristretto_private_key(ecdsa_str)?;
    Ok(private_key.to_hex())
}

#[wasm_bindgen]
pub fn build_ristretto_public_key(ecdsa_str: &str) -> Result<String, JsError> {
    let private_key = ecdsa_to_ristretto_private_key(ecdsa_str)?;
    let public_key = RistrettoPublicKey::from_secret_key(&private_key);
    Ok(public_key.to_hex())
}

#[wasm_bindgen]
pub fn get_account_component_address(public_key: &str) -> Result<String, JsError> {
    let account_address = get_account_address_from_public_key(&public_key)?;
    Ok(account_address.to_string())
}

#[wasm_bindgen]
pub fn get_owner_token(public_key_hex: &str) -> Result<JsValue, JsError> {
    let public_key = RistrettoPublicKey::from_hex(public_key_hex)
        .map_err(|e| JsError::new(&format!("Could not parse public key: {:?}", e)))?;
    let owner_token = NonFungibleAddress::from_public_key(
        RistrettoPublicKeyBytes::from_bytes(public_key.as_bytes()).unwrap(),
    );
    let encoded_token = tari_bor::encode(&owner_token)?;

    Ok(serde_wasm_bindgen::to_value(&encoded_token)?)
}

#[wasm_bindgen]
pub fn encode_metadata(metadata_js: JsValue) -> Result<JsValue, JsError> {
    metadata::encode_metadata(metadata_js)
}

#[wasm_bindgen]
pub fn parse_resource_address(resource_address_str: &str) -> Result<JsValue, JsError> {
    let resource_address =  ResourceAddress::from_str(resource_address_str)?;
    Ok(serde_wasm_bindgen::to_value(&resource_address)?)
}

#[wasm_bindgen]
pub fn encode_non_fungible_id(id_str: &str) -> Result<JsValue, JsError> {
    let id =  NonFungibleId::try_from_canonical_string(id_str)
        .map_err(|_| JsError::new("Invalid NonFungibleId String"))?;
    let encoded_id = tari_bor::encode(&id)?;
    Ok(serde_wasm_bindgen::to_value(&encoded_id)?)
}

#[wasm_bindgen]
pub fn encode_amount(amount: i64) -> Result<JsValue, JsError> {
    let amount = Amount::new(amount);
    let encoded_amount = tari_bor::encode(&amount)?;
    Ok(serde_wasm_bindgen::to_value(&encoded_amount)?)
}

#[wasm_bindgen]
pub fn create_transaction(
    account_private_key_hex: &str,
    instructions_js: JsValue,
    fee_instructions_js: JsValue,
    input_refs_js: JsValue,
) -> Result<JsValue, JsError> {
    let account_private_key = RistrettoSecretKey::from_hex(account_private_key_hex)
        .map_err(|e| JsError::new(&format!("Could not parse private key: {:?}", e)))?;
    let fee_instructions: Vec<Instruction> = serde_wasm_bindgen::from_value(fee_instructions_js)?;
    let instructions: Vec<Instruction> = serde_wasm_bindgen::from_value(instructions_js)?;
    let input_refs: Vec<SubstateRequirement> = serde_wasm_bindgen::from_value(input_refs_js)?;

    let transaction = Transaction::builder()
        .with_fee_instructions(fee_instructions.to_vec())
        .with_instructions(instructions.to_vec())
        .with_inputs(input_refs.to_vec())
        .sign(&account_private_key)
        .build();

    encode_transaction(&transaction)
}

#[wasm_bindgen]
pub fn create_transfer_transaction(
    source_private_key: &str,
    destination_public_key_hex: &str,
    create_destination_account: bool,
    resource_address: &str,
    amount: i64,
    fee: i64,
) -> Result<JsValue, JsError> {
    let source_private_key = RistrettoSecretKey::from_hex(source_private_key)
        .map_err(|e| JsError::new(&format!("Could not parse private key: {:?}", e)))?;
    let source_public_key = RistrettoPublicKey::from_secret_key(&source_private_key);
    let source_account_address = get_account_address_from_public_key(&source_public_key.to_hex())?;

    let destination_account_address = get_account_address_from_public_key(destination_public_key_hex)?;
    let destination_public_key = RistrettoPublicKey::from_hex(destination_public_key_hex)
        .map_err(|e| JsError::new(&format!("Could not parse public key: {:?}", e)))?;

    let mut instructions = vec![
        Instruction::CallMethod {
            component_address: source_account_address,
            method: "withdraw".to_string(),
            args: args![
                ResourceAddress::from_str(resource_address)?,
                Amount::new(amount)
            ],
        },
        Instruction::PutLastInstructionOutputOnWorkspace {
            key: b"bucket".to_vec(),
        },
    ];

    if create_destination_account {
        instructions.push(Instruction::CreateAccount {
            owner_public_key: destination_public_key.clone(),
            workspace_bucket: None,
        });
    }

    instructions.push(Instruction::CallMethod {
        component_address: destination_account_address,
        method: "deposit".to_string(),
        args: args![Workspace("bucket")],
    });
    instructions.push(Instruction::CallMethod {
        component_address: source_account_address,
        method: "pay_fee".to_string(),
        args: args![Amount::new(fee)],
    });

    let resource_address_obj = ResourceAddress::from_str(resource_address)?;
    let resource_substate = SubstateId::Resource(resource_address_obj);
    let resource_shard_id = SubstateRequirement::new(resource_substate, None);
    let input_refs = vec![resource_shard_id];

    let transaction = Transaction::builder()
        .with_fee_instructions(instructions.to_vec())
        .with_inputs(input_refs)
        .sign(&source_private_key)
        .build();

    encode_transaction(&transaction)
}

#[wasm_bindgen]
pub fn create_confidential_transfer_transaction(
    source_private_key: &str,
    source_vault_id: &str,
    source_vault_js: JsValue,
    destination_public_key_hex: &str,
    create_destination_account: bool,
    resource_address: &str,
    resource_substate_js: JsValue,
    amount: i64,
    fee: i64,
    proof_from_resource: Option<String>,
    output_to_revealed: bool,
    input_selection_js: JsValue,
) -> Result<JsValue, JsError> {
    let source_private_key = RistrettoSecretKey::from_hex(source_private_key)
        .map_err(|e| JsError::new(&format!("Could not parse private key: {:?}", e)))?;
    let source_public_key = RistrettoPublicKey::from_secret_key(&source_private_key);
    let source_account_address = get_account_address_from_public_key(&source_public_key.to_hex())?;

    let destination_account_address = get_account_address_from_public_key(destination_public_key_hex)?;
    let destination_public_key = RistrettoPublicKey::from_hex(destination_public_key_hex)
        .map_err(|e| JsError::new(&format!("Could not parse public key: {:?}", e)))?;

    let resource_address = ResourceAddress::from_str(resource_address)?;
    let proof_from_resource = proof_from_resource.map(|s| ResourceAddress::from_str(&s)).transpose()?;

    let source_vault_id = VaultId::from_str(source_vault_id)?;
    let source_vault: Vault = serde_wasm_bindgen::from_value(source_vault_js)?;
    let resource_substate: Resource = serde_wasm_bindgen::from_value(resource_substate_js)?;
    let input_selection: ConfidentialTransferInputSelection = serde_wasm_bindgen::from_value(input_selection_js)?;

    let params = ConfidentialTransferParams {
        source_private_key,
        source_public_key,
        source_account_address,
        destination_public_key,
        destination_account_address,
        resource_address,
        create_destination_account,
        amount,
        fee,
        proof_from_resource,
        output_to_revealed,
        source_vault,
        resource_substate,
        input_selection,
        source_vault_id,
    };

    Ok(build_confidential_transfer_transaction(params)?)
}

#[wasm_bindgen]
pub fn create_free_test_coins_transaction(
    is_new_account: bool,
    account_private_key: &str,
    amount: i64,
    fee: i64,
) -> Result<JsValue, JsError> {
    let account_private_key = RistrettoSecretKey::from_hex(account_private_key)
        .map_err(|e| JsError::new(&format!("Could not parse private key: {:?}", e)))?;
    let account_public_key = RistrettoPublicKey::from_secret_key(&account_private_key);
    let account_component_address =
        get_account_address_from_public_key(&account_public_key.to_hex())?;

    let mut instructions = vec![
        Instruction::CallMethod {
            component_address: XTR_FAUCET_COMPONENT_ADDRESS,
            method: "take".to_string(),
            args: args![Amount::new(amount)],
        },
        Instruction::PutLastInstructionOutputOnWorkspace {
            key: b"free_test_coins".to_vec(),
        },
    ];

    if is_new_account {
        instructions.push(Instruction::CreateAccount {
            owner_public_key: account_public_key.clone(),
            workspace_bucket: Some("free_test_coins".to_string()),
        });
    } else {
        instructions.push(Instruction::CallMethod
             {
            component_address: account_component_address,
            method: "deposit".to_string(),
            args: args![Workspace("free_test_coins")],
        });
    }

    // Pay fees from the account
    instructions.push(Instruction::CallMethod {
        component_address: account_component_address,
        method: "pay_fee".to_string(),
        args: args![Amount::new(fee)],
    });

    let transaction = Transaction::builder()
        .with_fee_instructions(instructions.to_vec())
        .sign(&account_private_key)
        .build();

    encode_transaction(&transaction)
}

#[wasm_bindgen]
pub fn get_confidential_balance(
    vault_js: JsValue,
    account_private_key: &str,
) -> Result<JsValue, JsError> {
    let vault: Vault = serde_wasm_bindgen::from_value(vault_js)?;
    let account_private_key = RistrettoSecretKey::from_hex(account_private_key)
        .map_err(|e| JsError::new(&format!("Could not parse private key: {:?}", e)))?;
    let balance = confidential_transfer::get_confidential_balance(&vault, &account_private_key)?;
    Ok(serde_wasm_bindgen::to_value(&balance)?)
}

#[wasm_bindgen]
pub fn view_vault_balance(
    vault_js: JsValue,
    minimum_expected_value: Option<u64>,
    maximum_expected_value: Option<u64>,
    ecdsa_str: &str
) -> Result<JsValue, JsError> {
    // TODO: refactor to reuse the "get_confidential_balance" function
    let vault: Vault = serde_wasm_bindgen::from_value(vault_js)?;
    let secret_view_key = ecdsa_to_ristretto_private_key(ecdsa_str)?;

    #[allow(clippy::mutable_key_type)]
    let commitments = vault
        .get_confidential_commitments()
        .ok_or_else(|| 
            JsError::new(&format!("Vault dow not contain a confidential resource")))?;

    let value_range = minimum_expected_value.unwrap_or(0)..=maximum_expected_value.unwrap_or(10_000_000_000);

    let balances = ElgamalVerifiableBalance::batched_brute_force(
        &secret_view_key,
        value_range,
        &mut AlwaysMissLookupTable,
        commitments.values().filter_map(|output| output.viewable_balance.as_ref()),
    )?;

    let result: HashMap<String, Option<u64>> = commitments
            .keys()
            .map(|c| c.as_public_key().to_string())
            .zip(balances.clone())
            .collect();
    
    Ok(serde_wasm_bindgen::to_value(&result)?)        
}

// serde-wasm has some limitations when the structs use the serde's "flatten" macro
// See https://github.com/RReverser/serde-wasm-bindgen/issues/9 for more context on the problem
// This causes the transaction being a empty JsValue if we encode it directly with serde_wasm_bindgen
// So the simplest workaround is to return the transaction as JSON and then parsing it on the snap's TypeScript side
fn encode_transaction(transaction: &Transaction) -> Result<JsValue, JsError> {
    let json = serde_json::to_string(&transaction)?;
    Ok(serde_wasm_bindgen::to_value(&json)?)
}