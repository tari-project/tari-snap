use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn get_value(name: &str) -> String {
    let msg = format!("Hello, {}!", name);
    msg
}
