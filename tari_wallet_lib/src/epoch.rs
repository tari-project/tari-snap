//   Copyright 2023 The Tari Project
//   SPDX-License-Identifier: BSD-3-Clause

use std::fmt::Display;

use newtype_ops::newtype_ops;
use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Deserialize, Serialize)]
pub struct Epoch(pub u64);

impl Epoch {
    pub fn as_u64(self) -> u64 {
        self.0
    }

    pub fn is_zero(&self) -> bool {
        self.0 == 0
    }

    pub fn to_le_bytes(self) -> [u8; 8] {
        self.0.to_le_bytes()
    }

    pub fn saturating_sub(&self, other: Epoch) -> Epoch {
        Epoch(self.0.saturating_sub(other.0))
    }

    pub fn checked_sub(&self, other: Self) -> Option<Epoch> {
        self.0.checked_sub(other.0).map(Epoch)
    }
}

impl From<u64> for Epoch {
    fn from(e: u64) -> Self {
        Self(e)
    }
}

impl Display for Epoch {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

newtype_ops! { [Epoch] {add sub mul div} {:=} Self Self }
newtype_ops! { [Epoch] {add sub mul div} {:=} &Self &Self }
newtype_ops! { [Epoch] {add sub mul div} {:=} Self &Self }
