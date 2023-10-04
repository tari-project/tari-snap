use serde::{Deserialize, Serialize};
use tari_crypto::ristretto::{RistrettoPublicKey, pedersen::PedersenCommitment, RistrettoComSig, RistrettoSchnorr, RistrettoSecretKey};
use tari_template_lib::{models::{EncryptedData, UnclaimedConfidentialOutputAddress}, prelude::ConfidentialWithdrawProof};

pub type PrivateKey = RistrettoSecretKey;
pub type PublicKey = RistrettoPublicKey;
pub type Commitment = PedersenCommitment;
pub type Signature = RistrettoSchnorr;

#[derive(thiserror::Error, Debug)]
#[error("Invalid size")]
pub struct FixedHashSizeError;


#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct ConfidentialOutput {
    pub commitment: Commitment,
    pub stealth_public_nonce: PublicKey,
    pub encrypted_data: EncryptedData,
    pub minimum_value_promise: u64,
}

#[derive(Debug, Clone, Eq, PartialEq, Deserialize, Serialize)]
pub struct ConfidentialClaim {
    pub public_key: PublicKey,
    pub output_address: UnclaimedConfidentialOutputAddress,
    pub range_proof: Vec<u8>,
    pub proof_of_knowledge: RistrettoComSig,
    pub withdraw_proof: Option<ConfidentialWithdrawProof>,
}
