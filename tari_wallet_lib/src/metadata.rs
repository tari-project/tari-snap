use serde::{Serialize, Deserialize};
use tari_template_lib::prelude::Metadata;
use wasm_bindgen::{JsValue, JsError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataField {
    key: String,
    value: String,
}

pub fn encode_metadata(metadata_js: JsValue) -> Result<JsValue, JsError> {
    let fields: Vec<MetadataField> = serde_wasm_bindgen::from_value(metadata_js)?;
    let mut metadata = Metadata::new();
    for field in fields {
        metadata.insert(field.key, field.value);
    }
    let encoded_metadata = tari_bor::encode(&metadata)?;
    
    Ok(serde_wasm_bindgen::to_value(&encoded_metadata)?)
}