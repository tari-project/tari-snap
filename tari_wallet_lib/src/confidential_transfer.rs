use std::convert::TryFrom;

use tari_crypto::ristretto::{RistrettoPublicKey, RistrettoSecretKey};
use tari_dan_wallet_crypto::{create_withdraw_proof, ConfidentialOutputMaskAndValue, ConfidentialProofStatement};
use tari_dan_wallet_sdk::{apis::confidential_transfer::ConfidentialTransferInputSelection, models::ConfidentialProofId};
use tari_engine_types::{resource::Resource, substate::SubstateId, vault::Vault};
use tari_template_lib::{args, models::{Amount, ComponentAddress, ResourceAddress}};
use tari_transaction::{Instruction, SubstateRequirement, Transaction};
use wasm_bindgen::{JsError, JsValue};
use tari_common_types::types::PublicKey;

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

pub struct ConfidentialTransferParams {
    pub source_private_key: RistrettoSecretKey,
    pub source_public_key: RistrettoPublicKey,
    pub source_account_address: ComponentAddress,
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


fn resolved_inputs_for_transfer(
    _src_vault: Vault,
    _from_account: ComponentAddress,
    _resource_address: ResourceAddress,
    _spend_amount: Amount,
    _input_selection: ConfidentialTransferInputSelection,
) -> Result<InputsToSpend, JsError> {
    todo!()
}

fn create_confidential_proof_statement(
    _dest_public_key: &PublicKey,
    _confidential_amount: Amount,
    _reveal_amount: Amount,
    _resource_view_key: Option<PublicKey>,
) -> Result<ConfidentialProofStatement, JsError> {
    todo!()
}

fn create_change_statement() -> Result<ConfidentialProofStatement, JsError> {
    todo!()
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
        params.source_vault,
        params.source_account_address,
        params.resource_address,
        Amount::new(params.amount),
        params.input_selection,
    )?;

    let resource_view_key = params.resource_substate.view_key().cloned();

    let output_statement = create_confidential_proof_statement(
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
        Some(create_change_statement()?)
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
        .with_input_refs(input_refs)
        .sign(&params.source_private_key)
        .build();

    Ok(serde_wasm_bindgen::to_value(&transaction)?)
}