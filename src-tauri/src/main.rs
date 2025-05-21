#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console on Windows

use tauri::command;

#[command]
fn greet(name: &str) -> String {
    format!("Ciao, {}! 🎉", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet]) // <--- registra greet
        .run(tauri::generate_context!())
        .expect("errore durante l'avvio dell'app");
}