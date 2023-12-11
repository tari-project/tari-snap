use rand::rngs::OsRng;
use serde::{Serialize, Deserialize};
use tari_crypto::{
    keys::PublicKey as PublicKeyT,
    ristretto::{RistrettoPublicKey, RistrettoSecretKey},
};

use crate::{types::{PublicKey, Signature}, hashing::{EngineHashDomainLabel, hasher64}, shard_id::ShardId, epoch::Epoch};

use super::instruction::Instruction;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionSignatureFields {
    pub fee_instructions: Vec<Instruction>,
    pub instructions: Vec<Instruction>,
    pub inputs: Vec<ShardId>,
    pub input_refs: Vec<ShardId>,
    pub min_epoch: Option<Epoch>,
    pub max_epoch: Option<Epoch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
pub struct TransactionSignature {
    public_key: PublicKey,
    signature: Signature,
}

impl TransactionSignature {
    pub fn new(public_key: PublicKey, signature: Signature) -> Self {
        Self { public_key, signature }
    }

    pub fn sign(secret_key: &RistrettoSecretKey, fields: TransactionSignatureFields) -> Self {
        let public_key = RistrettoPublicKey::from_secret_key(secret_key);
        let challenge = Self::create_challenge(fields);

        Self {
            signature: Signature::sign(secret_key, challenge, &mut OsRng).unwrap(),
            public_key,
        }
    }

    pub fn verify(&self, fields: TransactionSignatureFields) -> bool {
        let challenge = Self::create_challenge(fields);
        self.signature.verify(&self.public_key, challenge)
    }

    pub fn signature(&self) -> &Signature {
        &self.signature
    }

    pub fn public_key(&self) -> &RistrettoPublicKey {
        &self.public_key
    }

    fn create_challenge(fields: TransactionSignatureFields) -> [u8; 64] {
        hasher64(EngineHashDomainLabel::TransactionSignature)
            .chain(&fields)
            .result()
    }
}
