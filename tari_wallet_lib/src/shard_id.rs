//   Copyright 2022 The Tari Project
//   SPDX-License-Identifier: BSD-3-Clause

use serde::{Deserialize, Serialize};

use crate::{substate::SubstateAddress, hashing::{EngineHashDomainLabel, hasher32}};
use crate::serde_with;

#[derive(Copy, Clone, Debug, Eq, PartialEq, Hash, Serialize, Deserialize)]
pub struct ShardId(#[serde(with = "serde_with::hex")] pub [u8; 32]);


impl ShardId {
    /// Defines the mapping of SubstateAddress to ShardId
    pub fn from_address(addr: &SubstateAddress, version: u32) -> Self {
        Self::from_hash(&addr.to_canonical_hash(), version)
    }

    pub fn from_hash(hash: &[u8], version: u32) -> Self {
        let new_addr = hasher32(EngineHashDomainLabel::ShardId)
            .chain(&hash)
            .chain(&version)
            .result();
        Self(new_addr.into_array())
    }
}