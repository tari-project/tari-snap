//   Copyright 2023 The Tari Project
//   SPDX-License-Identifier: BSD-3-Clause

use std::str::FromStr;

use serde::{Deserialize, Deserializer};
use serde_json as json;
use tari_template_lib::{arg, args::Arg, models::Amount};

use crate::{substate::SubstateAddress, template::{parse_template_address, TemplateAddress}};

pub fn json_deserialize<'de, D>(d: D) -> Result<Vec<Arg>, D::Error>
where D: Deserializer<'de> {
    if d.is_human_readable() {
        // human_readable !== json. This is why the function name is json_deserialize
        let value = json::Value::deserialize(d)?;
        match value {
            json::Value::Array(args) => args
                .into_iter()
                .map(|arg| {
                    if let Some(s) = arg.as_str() {
                        parse_arg(s).map_err(serde::de::Error::custom)
                    } else {
                        let parsed = json::from_value(arg).map_err(serde::de::Error::custom)?;
                        Ok(parsed)
                    }
                })
                .collect(),
            _ => json::from_value(value).map_err(serde::de::Error::custom),
        }
    } else {
        Vec::<Arg>::deserialize(d)
    }
}

fn parse_arg(s: &str) -> Result<Arg, ArgParseError> {
    let ty = try_parse_special_string_arg(s)?;
    Ok(ty.into())
}

fn try_parse_special_string_arg(s: &str) -> Result<StringArg<'_>, ArgParseError> {
    let s = s.trim();
    if s.is_empty() {
        return Ok(StringArg::String(""));
    }

    if s.chars().all(|c| c.is_ascii_digit() || c == '-') {
        if let Ok(ty) = s
            .parse()
            .map(StringArg::UnsignedInteger)
            .or_else(|_| s.parse().map(StringArg::SignedInteger))
        {
            return Ok(ty);
        }
    }

    if let Some(contents) = strip_cast_func(s, "Amount") {
        let amt = contents
            .parse()
            .map(Amount)
            .map_err(|_| ArgParseError::ExpectedAmount {
                got: contents.to_string(),
            })?;
        return Ok(StringArg::Amount(amt));
    }

    if let Some(contents) = strip_cast_func(s, "Workspace") {
        return Ok(StringArg::Workspace(contents.as_bytes().to_vec()));
    }

    if let Ok(address) = SubstateAddress::from_str(s) {
        return Ok(StringArg::SubstateAddress(address));
    }

    if let Some(address) = parse_template_address(s.to_owned()) {
        return Ok(StringArg::TemplateAddress(address));
    }

    match s {
        "true" => return Ok(StringArg::Bool(true)),
        "false" => return Ok(StringArg::Bool(false)),
        _ => (),
    }

    Ok(StringArg::String(s))
}

/// Strips off "casting" syntax and returns the contents e.g. Foo(bar baz) returns "bar baz". Or None if there is no
/// cast in the input string.
fn strip_cast_func<'a>(s: &'a str, cast: &str) -> Option<&'a str> {
    s.strip_prefix(cast)
        .and_then(|s| s.strip_prefix('('))
        .and_then(|s| s.strip_suffix(')'))
}

pub enum StringArg<'a> {
    Amount(Amount),
    String(&'a str),
    Workspace(Vec<u8>),
    SubstateAddress(SubstateAddress),
    TemplateAddress(TemplateAddress),
    UnsignedInteger(u64),
    SignedInteger(i64),
    Bool(bool),
}

impl From<StringArg<'_>> for Arg {
    fn from(value: StringArg<'_>) -> Self {
        match value {
            StringArg::Amount(v) => arg!(v),
            StringArg::String(v) => arg!(v),
            StringArg::SubstateAddress(v) => match v {
                SubstateAddress::Component(v) => arg!(v),
                SubstateAddress::Resource(v) => arg!(v),
                SubstateAddress::Vault(v) => arg!(v),
                SubstateAddress::UnclaimedConfidentialOutput(v) => arg!(v),
                SubstateAddress::NonFungible(v) => arg!(v),
                SubstateAddress::NonFungibleIndex(v) => arg!(v),
                SubstateAddress::TransactionReceipt(v) => arg!(v),
                SubstateAddress::FeeClaim(v) => arg!(v),
            },
            StringArg::TemplateAddress(v) => arg!(v),
            StringArg::UnsignedInteger(v) => arg!(v),
            StringArg::SignedInteger(v) => arg!(v),
            StringArg::Bool(v) => arg!(v),
            StringArg::Workspace(s) => arg!(Workspace(s)),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ArgParseError {
    #[error("Expected an integer, got '{got}'")]
    ExpectedAmount { got: String },
    #[error("JSON error: {0}")]
    JsonError(#[from] json::Error),
}
