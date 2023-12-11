use crate::{serde_with, hashing::{EngineHashDomainLabel, hasher32}, transaction::transaction_receipt::TransactionReceiptAddress, fee_claim::FeeClaimAddress};
use serde::{Deserialize, Serialize};
use tari_bor::{encode, BorError, decode_exact};
use std::{
    fmt::{Display, Formatter},
    str::FromStr,
};
use tari_template_lib::{Hash, prelude::NonFungibleId};
use tari_template_lib::{
    models::{NonFungibleIndexAddress, UnclaimedConfidentialOutputAddress, VaultId},
    prelude::{
        ComponentAddress, NonFungibleAddress, ResourceAddress,
    },
};

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum SubstateAddress {
    Component(#[serde(with = "serde_with::string")] ComponentAddress),
    Resource(#[serde(with = "serde_with::string")] ResourceAddress),
    Vault(#[serde(with = "serde_with::string")] VaultId),
    UnclaimedConfidentialOutput(UnclaimedConfidentialOutputAddress),
    NonFungible(NonFungibleAddress),
    NonFungibleIndex(NonFungibleIndexAddress),
    TransactionReceipt(TransactionReceiptAddress),
    FeeClaim(FeeClaimAddress),
}

impl SubstateAddress {
    pub fn as_component_address(&self) -> Option<ComponentAddress> {
        match self {
            Self::Component(addr) => Some(*addr),
            _ => None,
        }
    }

    pub fn as_vault_id(&self) -> Option<VaultId> {
        match self {
            Self::Vault(id) => Some(*id),
            _ => None,
        }
    }

    pub fn as_resource_address(&self) -> Option<ResourceAddress> {
        match self {
            Self::Resource(address) => Some(*address),
            _ => None,
        }
    }

    pub fn as_unclaimed_confidential_output_address(
        &self,
    ) -> Option<UnclaimedConfidentialOutputAddress> {
        match self {
            Self::UnclaimedConfidentialOutput(address) => Some(*address),
            _ => None,
        }
    }

    pub fn to_canonical_hash(&self) -> Hash {
        match self {
            SubstateAddress::Component(address) => *address.hash(),
            SubstateAddress::Resource(address) => *address.hash(),
            SubstateAddress::Vault(id) => *id.hash(),
            SubstateAddress::UnclaimedConfidentialOutput(address) => *address.hash(),
            SubstateAddress::NonFungible(address) => hasher32(EngineHashDomainLabel::NonFungibleId)
                .chain(address.resource_address().hash())
                .chain(address.id())
                .result(),
            SubstateAddress::NonFungibleIndex(address) => hasher32(EngineHashDomainLabel::NonFungibleIndex)
                .chain(address.resource_address().hash())
                .chain(&address.index())
                .result(),
            SubstateAddress::TransactionReceipt(address) => *address.hash(),
            SubstateAddress::FeeClaim(address) => *address.hash(),
        }
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        encode(self).unwrap()
    }

    pub fn from_bytes(bytes: &[u8]) -> Result<Self, BorError> {
        decode_exact(bytes)
    }

    // TODO: look at using BECH32 standard
    pub fn to_address_string(&self) -> String {
        self.to_string()
    }

    pub fn as_non_fungible_address(&self) -> Option<&NonFungibleAddress> {
        match self {
            SubstateAddress::NonFungible(addr) => Some(addr),
            _ => None,
        }
    }

    pub fn as_non_fungible_index_address(&self) -> Option<&NonFungibleIndexAddress> {
        match self {
            SubstateAddress::NonFungibleIndex(addr) => Some(addr),
            _ => None,
        }
    }

    pub fn is_resource(&self) -> bool {
        matches!(self, Self::Resource(_))
    }

    pub fn is_component(&self) -> bool {
        matches!(self, Self::Component(_))
    }

    pub fn is_vault(&self) -> bool {
        matches!(self, Self::Vault(_))
    }

    pub fn is_non_fungible(&self) -> bool {
        matches!(self, Self::NonFungible(_))
    }

    pub fn is_non_fungible_index(&self) -> bool {
        matches!(self, Self::NonFungibleIndex(_))
    }

    pub fn is_layer1_commitment(&self) -> bool {
        matches!(self, Self::UnclaimedConfidentialOutput(_))
    }

    pub fn is_transaction_receipt(&self) -> bool {
        matches!(self, Self::TransactionReceipt(_))
    }
}

impl From<ComponentAddress> for SubstateAddress {
    fn from(address: ComponentAddress) -> Self {
        Self::Component(address)
    }
}

impl From<ResourceAddress> for SubstateAddress {
    fn from(address: ResourceAddress) -> Self {
        Self::Resource(address)
    }
}

impl From<VaultId> for SubstateAddress {
    fn from(address: VaultId) -> Self {
        Self::Vault(address)
    }
}

impl From<NonFungibleAddress> for SubstateAddress {
    fn from(address: NonFungibleAddress) -> Self {
        Self::NonFungible(address)
    }
}

impl From<NonFungibleIndexAddress> for SubstateAddress {
    fn from(address: NonFungibleIndexAddress) -> Self {
        Self::NonFungibleIndex(address)
    }
}

impl From<UnclaimedConfidentialOutputAddress> for SubstateAddress {
    fn from(address: UnclaimedConfidentialOutputAddress) -> Self {
        Self::UnclaimedConfidentialOutput(address)
    }
}

impl Display for SubstateAddress {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            SubstateAddress::Component(addr) => write!(f, "{}", addr),
            SubstateAddress::Resource(addr) => write!(f, "{}", addr),
            SubstateAddress::Vault(addr) => write!(f, "{}", addr),
            SubstateAddress::NonFungible(addr) => write!(f, "{}", addr),
            SubstateAddress::NonFungibleIndex(addr) => write!(f, "{}", addr),
            SubstateAddress::UnclaimedConfidentialOutput(commitment_address) => {
                write!(f, "{}", commitment_address)
            }
            SubstateAddress::TransactionReceipt(addr) => write!(f, "{}", addr),
            SubstateAddress::FeeClaim(addr) => write!(f, "{}", addr),
        }
    }
}

#[derive(Debug, thiserror::Error)]
#[error("Invalid substate address '{0}'")]
pub struct InvalidSubstateAddressFormat(String);

impl FromStr for SubstateAddress {
    type Err = InvalidSubstateAddressFormat;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.split_once('_') {
            Some(("component", addr)) => {
                let addr = ComponentAddress::from_hex(addr)
                    .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                Ok(SubstateAddress::Component(addr))
            }
            Some(("resource", addr)) => {
                match addr.split_once(' ') {
                    Some((resource_str, addr)) => match addr.split_once('_') {
                        // resource_xxxx nft_xxxxx
                        Some(("nft", addr)) => {
                            let resource_addr = ResourceAddress::from_hex(resource_str)
                                .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                            let id = NonFungibleId::try_from_canonical_string(addr)
                                .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                            Ok(SubstateAddress::NonFungible(NonFungibleAddress::new(
                                resource_addr,
                                id,
                            )))
                        }
                        // resource_xxxx index_
                        Some(("index", index_str)) => {
                            let resource_addr = ResourceAddress::from_hex(resource_str)
                                .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                            let index = u64::from_str(index_str)
                                .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                            Ok(SubstateAddress::NonFungibleIndex(
                                NonFungibleIndexAddress::new(resource_addr, index),
                            ))
                        }
                        _ => Err(InvalidSubstateAddressFormat(s.to_string())),
                    },
                    // resource_xxxx
                    None => {
                        let addr = ResourceAddress::from_hex(addr)
                            .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                        Ok(SubstateAddress::Resource(addr))
                    }
                }
            }
            Some(("vault", addr)) => {
                let id = VaultId::from_hex(addr)
                    .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                Ok(SubstateAddress::Vault(id))
            }
            Some(("commitment", addr)) => {
                let commitment_address = UnclaimedConfidentialOutputAddress::from_hex(addr)
                    .map_err(|_| InvalidSubstateAddressFormat(s.to_string()))?;
                Ok(SubstateAddress::UnclaimedConfidentialOutput(
                    commitment_address,
                ))
            }
            Some(("txreceipt", addr)) => {
                let tx_receipt_addr = TransactionReceiptAddress::from_hex(addr)
                    .map_err(|_| InvalidSubstateAddressFormat(addr.to_string()))?;
                Ok(SubstateAddress::TransactionReceipt(tx_receipt_addr))
            }
            Some(("feeclaim", addr)) => {
                let addr = Hash::from_hex(addr)
                    .map_err(|_| InvalidSubstateAddressFormat(addr.to_string()))?;
                Ok(SubstateAddress::FeeClaim(addr.into()))
            }
            Some(_) | None => Err(InvalidSubstateAddressFormat(s.to_string())),
        }
    }
}
