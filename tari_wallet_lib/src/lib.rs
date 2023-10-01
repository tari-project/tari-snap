use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
pub fn greet(name: &str) {
    let msg = &format!("Hello, {}!", name);
    console::log_1(&JsValue::from_str(msg));
}
