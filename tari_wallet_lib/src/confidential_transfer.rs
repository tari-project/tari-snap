use std::convert::TryFrom;

use tari_crypto::ristretto::{RistrettoPublicKey, RistrettoSecretKey};
use tari_dan_wallet_crypto::{create_withdraw_proof, encrypt_value_and_mask, extract_value_and_mask, kdfs, unblind_output, ConfidentialOutputMaskAndValue, ConfidentialProofStatement};
use tari_engine_types::{confidential::ConfidentialOutput, resource::Resource, substate::SubstateId, vault::Vault};
use tari_template_lib::{args, models::{Amount, ComponentAddress, EncryptedData, ObjectKey, ResourceAddress, VaultId}};
use tari_transaction::{Instruction, SubstateRequirement, Transaction};
use wasm_bindgen::{JsError, JsValue};
use tari_common_types::types::{Commitment, PrivateKey, PublicKey};
use tari_crypto::keys::PublicKey as _;

pub type ConfidentialProofId = u64;

#[derive(Debug)]
struct InputsToSpend {
    pub confidential: Vec<ConfidentialOutputMaskAndValue>,
    pub proof_id: ConfidentialProofId,
    pub revealed: Amount,
}

impl InputsToSpend {
    pub fn total_amount(&self) -> Amount {
        self.total_confidential_amount() + self.revealed
    }

    pub fn total_confidential_amount(&self) -> Amount {
        let confidential_amt = self.confidential.iter().map(|o| o.value).sum::<u64>();
        Amount::try_from(confidential_amt).unwrap()
    }
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum ConfidentialTransferInputSelection {
    ConfidentialOnly,
    RevealedOnly,
    PreferRevealed,
    PreferConfidential,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConfidentialOutputModel {
    pub account_address: SubstateId,
    pub vault_address: SubstateId,
    pub commitment: Commitment,
    pub value: u64,
    pub sender_public_nonce: Option<PublicKey>,
    pub encryption_secret_key_index: u64,
    pub encrypted_data: EncryptedData,
    pub public_asset_tag: Option<PublicKey>,
    pub status: OutputStatus,
    pub locked_by_proof: Option<ConfidentialProofId>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum OutputStatus {
    /// The output is available for spending
    Unspent,
    /// The output has been spent.
    Spent,
    /// The output is locked for spending. Once the transaction has been accepted, this output becomes Spent.
    Locked,
    /// The output is locked as an unconfirmed output. Once the transaction has been accepted, this output becomes
    /// Unspent.
    LockedUnconfirmed,
    /// This output existing in the vault but could not be validated successfully, meaning the encrypted value and/or
    /// mask were not constructed correctly by the sender. This output will not "be counted" in the confidential
    /// balance.
    Invalid,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConfidentialTransferParams {
    pub source_private_key: RistrettoSecretKey,
    pub source_public_key: RistrettoPublicKey,
    pub source_account_address: ComponentAddress,
    pub source_vault_id: VaultId,
    pub source_vault: Vault,
    pub destination_public_key: RistrettoPublicKey,
    pub destination_account_address: ComponentAddress,
    pub resource_address: ResourceAddress,
    pub resource_substate: Resource,
    pub create_destination_account: bool,
    pub amount: i64,
    pub fee: i64,
    pub proof_from_resource: Option<ResourceAddress>,
    pub output_to_revealed: bool,
    pub input_selection: ConfidentialTransferInputSelection,
}

impl ConfidentialTransferParams {
    pub fn confidential_amount(&self) -> Amount {
        if self.output_to_revealed {
            Amount::zero()
        } else {
            Amount::new(self.amount)
        }
    }

    pub fn revealed_amount(&self) -> Amount {
        if self.output_to_revealed {
            Amount::new(self.amount)
        } else {
            Amount::zero()
        }
    }
}

pub fn get_confidential_balance(
    vault: &Vault,
    key: &RistrettoSecretKey
) -> Result<u64, JsError> {
    let dummy_substate_id = SubstateId::Resource(ResourceAddress::new(ObjectKey::default()));
    let vault_outputs = get_confidential_outputs_from_vault(dummy_substate_id.clone(), dummy_substate_id, vault, key)?;
    let balance = vault_outputs.iter().map(|o| o.value).sum();
    Ok(balance)
}

fn resolved_inputs_for_transfer(
    vault_address: SubstateId,
    src_vault: Vault,
    from_account: ComponentAddress,
    key: &RistrettoSecretKey,
    _resource_address: ResourceAddress,
    spend_amount: Amount,
    input_selection: ConfidentialTransferInputSelection,
) -> Result<InputsToSpend, JsError> {
    // TODO: should we implement other types of input selection?
    match &input_selection {
        ConfidentialTransferInputSelection::ConfidentialOnly => {
            let (confidential_inputs, _) = get_confidential_amount_from_vault(SubstateId::Component(from_account), vault_address, &src_vault, key, spend_amount)?;
            let confidential_inputs = resolve_output_masks(key, confidential_inputs)?;

            Ok(InputsToSpend {
                confidential: confidential_inputs,
                proof_id: 0,
                revealed: Amount::zero(),
            })
        },
        ConfidentialTransferInputSelection::RevealedOnly => {
            todo!()
        },
        ConfidentialTransferInputSelection::PreferRevealed => {
            todo!()
        },
        ConfidentialTransferInputSelection::PreferConfidential => {
            todo!()
        },
    }
}

fn get_confidential_amount_from_vault(
    account_address: SubstateId,
    vault_address: SubstateId,
    vault: &Vault,
    key: &RistrettoSecretKey,
    amount: Amount,
) -> Result<(Vec<ConfidentialOutputModel>, u64), JsError> {
    if amount.is_negative() {
        return Err(JsError::new("Amount cannot be negative"));
    }
    let amount = amount.as_u64_checked().unwrap();
    let mut total_output_amount = 0;
    let mut outputs = Vec::new();

    let mut vault_outputs = get_confidential_outputs_from_vault(account_address, vault_address, vault, key)?;

    while total_output_amount < amount {
        let output =
            vault_outputs.pop();
        match output {
            Some(output) => {
                total_output_amount += output.value;
                outputs.push(output);
            },
            None => {
                break;
            }            
        }
    }

    Ok((outputs, total_output_amount))
}

fn get_confidential_outputs_from_vault(account_address: SubstateId, vault_address: SubstateId, vault: &Vault, key: &RistrettoSecretKey) -> Result<Vec<ConfidentialOutputModel>, JsError> {
    let commitments = vault.get_confidential_commitments()
        .ok_or(JsError::new(&format!("No confidential commitments in the vault")))?;
    let outputs: Vec<ConfidentialOutput> = commitments.values().cloned().collect();

    // extract value from each commitment and build the ConfidentialOutputModel
    let mut result = vec![];
    for output in outputs {
        let unblinded_result = unblind_output(
            &output.commitment,
            &output.encrypted_data,
            key,
            &output.stealth_public_nonce,
            );

        let (value, status) = match unblinded_result {
            Ok(output) => (output.value, OutputStatus::Unspent),
            Err(_) => {
                (0, OutputStatus::Invalid)
            },
        };

        result.push(ConfidentialOutputModel {
            account_address: account_address.clone(),
            vault_address: vault_address.clone(),
            commitment: output.commitment.clone(),
            value,
            sender_public_nonce: Some(output.stealth_public_nonce.clone()),
            // TODO: this field is used somewhere?
            encryption_secret_key_index: 0_u64,
            encrypted_data: output.encrypted_data.clone(),
            public_asset_tag: None,
            status,
            locked_by_proof: None,
        });
    }

    // sort by descending value
    result.sort_by(|a, b| a.value.cmp(&b.value));
    Ok(result)
}

fn resolve_output_masks(
    account_key: &RistrettoSecretKey,
    outputs: Vec<ConfidentialOutputModel>,
) -> Result<Vec<ConfidentialOutputMaskAndValue>, JsError> {
    let mut outputs_with_masks = Vec::with_capacity(outputs.len());
    for output in outputs {
        let output_key =
            derive_key(account_key, output.encryption_secret_key_index)?;
        // Either derive the mask from the sender's public nonce or from the local key manager
        let shared_decrypt_key = match output.sender_public_nonce {
            Some(nonce) => {
                // Derive shared secret
                kdfs::encrypted_data_dh_kdf_aead(&output_key, &nonce)
            },
            None => {
                // Derive local secret
                let output_key = 
                    derive_key(account_key, output.encryption_secret_key_index)?;
                output_key
            },
        };

        let (_, mask) = extract_value_and_mask(
            &shared_decrypt_key,
            &output.commitment,
            &output.encrypted_data,
        )?;

        outputs_with_masks.push(ConfidentialOutputMaskAndValue {
            value: output.value,
            mask,
        });
    }
    Ok(outputs_with_masks)
}

fn derive_key(account_key: &RistrettoSecretKey, _index: u64) -> Result<RistrettoSecretKey, JsError> {
    //TODO: this is not safe, we must implement a key derivation for the snap
    Ok(account_key.clone())
}

pub fn next_key(account_key: &RistrettoSecretKey) -> Result<RistrettoSecretKey, JsError> {
    //TODO: this is not safe, we must implement a key derivation for the snap
    Ok(account_key.clone())
}

fn create_confidential_proof_statement(
    account_key: &RistrettoSecretKey,
    dest_public_key: &RistrettoPublicKey,
    confidential_amount: Amount,
    reveal_amount: Amount,
    resource_view_key: Option<RistrettoPublicKey>,
) -> Result<ConfidentialProofStatement, JsError> {
    let mask = if confidential_amount.is_zero() {
        PrivateKey::default()
    } else {
        next_key(account_key)?
    };

    let (nonce, public_nonce) = PublicKey::random_keypair(&mut rand::thread_rng());  
    let encrypted_data = encrypt_value_and_mask(
        confidential_amount
            .as_u64_checked()
            .unwrap_or_else(|| panic!("BUG: confidential_amount {} is negative", confidential_amount)),
        &mask,
        dest_public_key,
        &nonce,
    )?;

    Ok(ConfidentialProofStatement {
        amount: confidential_amount,
        mask,
        sender_public_nonce: public_nonce,
        encrypted_data,
        minimum_value_promise: 0,
        reveal_amount,
        resource_view_key,
    })
}

pub fn build_confidential_transfer_transaction(
    params: ConfidentialTransferParams
) -> Result<JsValue, JsError> {

    let resource_substate_id = SubstateId::Resource(params.resource_address);
    let mut input_refs = vec![SubstateRequirement::new(resource_substate_id, None)];

    let amount =  Amount::new(params.amount);
    let confidential_amount = params.confidential_amount();
    let revealed_amount = params.revealed_amount();

    let inputs_to_spend = resolved_inputs_for_transfer(
        SubstateId::Vault(params.source_vault_id),
        params.source_vault,
        params.source_account_address,
        &params.source_private_key,
        params.resource_address,
        Amount::new(params.amount),
        params.input_selection,
    )?;

    let resource_view_key = params.resource_substate.view_key().cloned();

    let output_statement = create_confidential_proof_statement(
        &params.source_private_key,
        &params.destination_public_key,
        confidential_amount,
        revealed_amount,
        resource_view_key.clone(),
    )?;

    let remaining_left_to_pay = amount
            .checked_sub_positive(inputs_to_spend.revealed)
            .unwrap_or_else(|| {
                panic!("Vault dow not contain a confidential resource")
            });

    let change_confidential_amount = inputs_to_spend.total_confidential_amount() - remaining_left_to_pay;
    let maybe_change_statement = if change_confidential_amount.is_zero() {
        None
    } else {
        let statement = create_confidential_proof_statement(
            &params.source_private_key,
            &params.source_public_key,
            change_confidential_amount,
            Amount::zero(),
            resource_view_key,
        )?;
    
        Some(statement)
    };

    let proof = create_withdraw_proof(
        &inputs_to_spend.confidential,
        inputs_to_spend.revealed,
        &output_statement,
        maybe_change_statement.as_ref()
    )?;

    let mut instructions = vec![];

    if params.create_destination_account {
        instructions.push(Instruction::CreateAccount {
            owner_public_key: params.destination_public_key.clone(),
            workspace_bucket: None,
        });
    }

    if let Some( badge) = params.proof_from_resource {
        instructions.push(Instruction::CallMethod {
            component_address: params.source_account_address,
            method: "create_proof_for_resource".to_string(),
            args: args![badge],
        });
        instructions.push(Instruction::PutLastInstructionOutputOnWorkspace {
            key: b"proof".to_vec(),
        });
        input_refs.push(SubstateRequirement::new(SubstateId::Resource(badge), None));
    }

    instructions.push(
        Instruction::CallMethod {
            component_address: params.source_account_address,
            method: "withdraw_confidential".to_string(),
            args: args![
                params.resource_address,
                proof
            ],
        });
    instructions.push(   
        Instruction::PutLastInstructionOutputOnWorkspace {
            key: b"bucket".to_vec(),
        }
    );
    instructions.push(Instruction::CallMethod {
        component_address: params.destination_account_address,
        method: "deposit".to_string(),
        args: args![Workspace("bucket")],
    });
    instructions.push(Instruction::CallMethod {
        component_address: params.source_account_address,
        method: "pay_fee".to_string(),
        args: args![Amount::new(params.fee)],
    });

    let transaction = Transaction::builder()
        .with_fee_instructions(instructions.to_vec())
        .with_inputs(input_refs)
        .sign(&params.source_private_key)
        .build();

    Ok(serde_wasm_bindgen::to_value(&transaction)?)
}