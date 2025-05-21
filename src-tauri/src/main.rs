#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{command, AppHandle, Manager};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Server {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub user: String,
    pub port: u16,
    pub auth_method: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
}

#[command]
fn greet(name: &str) -> String {
    format!("Ciao, {}! 🎉", name)
}

#[command]
async fn save_server(app: AppHandle, server: Server) -> Result<(), String> {
    // ✅ `path()` ora funziona perché abbiamo importato il trait Manager
    let app_dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;

    let file_path = app_dir.join("servers.json");

    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let mut servers: Vec<Server> = if file_path.exists() {
        let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };

    servers.push(server);

    let json = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    fs::write(file_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, save_server])
        .run(tauri::generate_context!())
        .expect("Errore durante l'avvio dell'app");
}