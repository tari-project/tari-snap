use std::str::FromStr;

pub type TemplateAddress = tari_template_lib::Hash;

// TODO: should we refactor TemplateAddress as a newtype to implement FromStr?
pub fn parse_template_address(s: String) -> Option<TemplateAddress> {
    if let Some(hash_str) = s.strip_prefix("template_") {
        if let Ok(address) = TemplateAddress::from_str(hash_str) {
            return Some(address);
        }
    }

    None
}