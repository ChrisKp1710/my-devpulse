#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{command, AppHandle, Manager};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Server {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub ssh_user: String,
    pub ssh_port: u16,
    pub auth_method: String,
    pub password: Option<String>,
    pub ssh_key_path: Option<String>,
    pub ssh_key: String,
    pub server_type: String, // cambiato da "type" (parola riservata)
    pub status: String,
}

#[command]
fn greet(name: &str) -> String {
    format!("Ciao, {}! 🎉", name)
}

#[command]
async fn save_server(app: AppHandle, server: Server) -> Result<(), String> {
    println!("📥 Ricevuto server da salvare: {:?}", server);
    
    // Ottieni la directory dell'app
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;

    println!("📁 Directory app: {:?}", app_dir);

    let file_path = app_dir.join("servers.json");
    println!("💾 Percorso file: {:?}", file_path);

    // Crea la directory se non esiste
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            println!("❌ Errore creazione directory: {}", e);
            format!("Errore creazione directory: {e}")
        })?;
        println!("✅ Directory creata/verificata");
    }

    // Carica i server esistenti o crea un array vuoto
    let mut servers: Vec<Server> = if file_path.exists() {
        match fs::read_to_string(&file_path) {
            Ok(content) => {
                println!("📄 File esistente trovato, contenuto: {}", content);
                serde_json::from_str(&content).unwrap_or_else(|e| {
                    println!("⚠️ Errore parsing JSON: {}, uso array vuoto", e);
                    vec![]
                })
            }
            Err(e) => {
                println!("⚠️ Errore lettura file: {}, uso array vuoto", e);
                vec![]
            }
        }
    } else {
        println!("📄 File non esiste, creo array vuoto");
        vec![]
    };

    // Aggiungi il nuovo server
    servers.push(server);
    println!("📊 Totale servers dopo aggiunta: {}", servers.len());

    // Serializza e salva
    let json = serde_json::to_string_pretty(&servers).map_err(|e| {
        println!("❌ Errore serializzazione JSON: {}", e);
        format!("Errore serializzazione: {e}")
    })?;

    fs::write(&file_path, &json).map_err(|e| {
        println!("❌ Errore scrittura file: {}", e);
        format!("Errore scrittura file: {e}")
    })?;

    println!("✅ Server salvato con successo in: {:?}", file_path);
    Ok(())
}

#[command]
async fn load_servers(app: AppHandle) -> Result<Vec<Server>, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;

    let file_path = app_dir.join("servers.json");
    
    if !file_path.exists() {
        println!("📄 File servers.json non esiste, ritorno array vuoto");
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&file_path).map_err(|e| {
        println!("❌ Errore lettura file: {}", e);
        format!("Errore lettura file: {e}")
    })?;

    let servers: Vec<Server> = serde_json::from_str(&content).map_err(|e| {
        println!("❌ Errore parsing JSON: {}", e);
        format!("Errore parsing JSON: {e}")
    })?;

    println!("✅ Caricati {} servers", servers.len());
    Ok(servers)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, save_server, load_servers])
        .run(tauri::generate_context!())
        .expect("Errore durante l'avvio dell'app");
}