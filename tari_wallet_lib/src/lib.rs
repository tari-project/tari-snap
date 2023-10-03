use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn greeter(name: &str) -> Result<String, JsError> {
    Ok(format!("Hello {name}!"))
}

#[wasm_bindgen]
pub fn simple_number(i: i32) -> i32{
    i + 3
}
