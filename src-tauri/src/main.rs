//! Configurazione del main.rs per DevPulse con shell embedded (ttyd) + setup automatico

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::net::SocketAddr;
use std::time::{Duration, Instant};
use tauri::{command, AppHandle, Manager};
use tauri_plugin_fs;
use terminal::{open_terminal, logout_terminal, check_terminal_status}; 
use setup::{check_system_info, install_sshpass_for_devpulse}; // 🆕 Setup module
use power_management::{wake_server, shutdown_server, test_network_connectivity};

mod terminal;
mod setup;  // 🆕 Nuovo modulo setup
mod power_management;

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
    pub server_type: String,
    pub status: String,
    // ✅ AGGIUNTI: Campi per gestione energia Wake-on-LAN
    pub mac_address: Option<String>,
    pub wol_enabled: Option<bool>,
    pub shutdown_command: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub is_online: bool,
    pub response_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

#[command]
fn greet(name: &str) -> String {
    format!("Ciao, {}! 🎉 DevPulse con setup automatico!", name)
}

#[command]
async fn ping_server(host: String, port: u16) -> Result<PingResult, String> {
    let address = format!("{}:{}", host, port);
    let socket_addr: SocketAddr = address
        .parse()
        .map_err(|e| format!("Indirizzo non valido: {}", e))?;

    let start = Instant::now();
    match std::net::TcpStream::connect_timeout(&socket_addr, Duration::from_secs(5)) {
        Ok(_) => Ok(PingResult {
            is_online: true,
            response_time_ms: Some(start.elapsed().as_millis() as u64),
            error_message: None,
        }),
        Err(e) => Ok(PingResult {
            is_online: false,
            response_time_ms: None,
            error_message: Some(e.to_string()),
        }),
    }
}

#[command]
async fn debug_system_state(app: AppHandle) -> Result<String, String> {
    use crate::setup::check_system_info;
    
    let info = check_system_info(app).await?;
    let debug_msg = format!(
        "🔍 DEBUG SYSTEM STATE:\n\
         - Platform: {}\n\
         - Needs setup: {}\n\
         - Ready for SSH: {}\n\
         - Has sshpass: {}\n\
         - ttyd bundled OK: {}\n\
         - Setup message: {}",
        info.platform,
        info.needs_setup,
        info.ready_for_ssh,
        info.has_sshpass,
        info.ttyd_bundled_ok,
        info.setup_message
    );
    
    println!("{}", debug_msg);
    Ok(debug_msg)
}

#[command]
async fn ping_all_servers(app: AppHandle) -> Result<Vec<(String, PingResult)>, String> {
    let servers = load_servers(app).await?;
    let mut results = Vec::new();
    for server in servers {
        let ping = ping_server(server.ip.clone(), server.ssh_port).await?;
        results.push((server.id, ping));
    }
    Ok(results)
}

#[command]
async fn save_server(app: AppHandle, server: Server) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore path: {e}"))?
        .join("servers.json");

    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }

    let mut list = if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        vec![]
    };

    list.push(server);
    let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
async fn load_servers(app: AppHandle) -> Result<Vec<Server>, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore path: {e}"))?
        .join("servers.json");

    if !path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let parsed = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(parsed)
}

// 🆕 NUOVO: Delete server (per completezza)
#[command]
async fn delete_server(app: AppHandle, id: String) -> Result<(), String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore path: {e}"))?
        .join("servers.json");

    if !path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut servers: Vec<Server> = serde_json::from_str(&content).unwrap_or_default();
    
    servers.retain(|s| s.id != id);
    
    let json = serde_json::to_string_pretty(&servers).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// 🆕 NUOVO: Funzioni per import/export (per il tuo BackupSettings)
#[command]
async fn export_servers_to_file(app: AppHandle) -> Result<String, String> {
    let app_data_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore path: {e}"))?;
    
    let servers_path = app_data_path.join("servers.json");
    
    if !servers_path.exists() {
        return Err("Nessun file server trovato".to_string());
    }
    
    // Crea nome file con timestamp
    let timestamp = chrono::Local::now().format("%Y-%m-%d").to_string();
    let export_filename = format!("devpulse-servers-{}.json", timestamp);
    let export_path = app_data_path.join(&export_filename);
    
    // Copia il file
    fs::copy(&servers_path, &export_path).map_err(|e| e.to_string())?;
    
    Ok(export_path.to_string_lossy().to_string())
}

#[command]
async fn import_servers_from_file(app: AppHandle) -> Result<u32, String> {
    use tauri_plugin_dialog::DialogExt;
    
    // Apri dialog per selezionare file
    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON files", &["json"])
        .blocking_pick_file()
        .ok_or("Nessun file selezionato")?;
    
    // Converti FilePath in Path gestendo l'Option
    let file_path_buf = file_path.as_path().ok_or("Percorso file non valido")?;
    
    // Leggi il file selezionato
    let content = fs::read_to_string(file_path_buf).map_err(|e| e.to_string())?;
    let imported_servers: Vec<Server> = serde_json::from_str(&content)
        .map_err(|e| format!("File JSON non valido: {}", e))?;
    
    // Backup del file esistente
    let app_data_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore path: {e}"))?;
    
    let servers_path = app_data_path.join("servers.json");
    
    if servers_path.exists() {
        let backup_name = format!("servers-backup-{}.json", 
                                chrono::Local::now().format("%Y%m%d-%H%M%S"));
        let backup_path = app_data_path.join(backup_name);
        let _ = fs::copy(&servers_path, backup_path);
    }
    
    // Salva i nuovi server come servers.json
    let json = serde_json::to_string_pretty(&imported_servers).map_err(|e| e.to_string())?;
    fs::write(servers_path, json).map_err(|e| e.to_string())?;
    
    Ok(imported_servers.len() as u32)
}

fn main() {
    println!("🚀 Avvio DevPulse con setup automatico...");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init()) // 🆕 Per i dialog di import/export
        .invoke_handler(tauri::generate_handler![
            // ✅ Funzioni esistenti
            greet,
            ping_server,
            ping_all_servers,
            save_server,
            load_servers,
            delete_server,  // 🆕
            
            // 🆕 Import/Export per BackupSettings
            export_servers_to_file,
            import_servers_from_file,
            
            // ✅ Funzioni terminal (il tuo codice esistente)
            open_terminal,
            logout_terminal,
            check_terminal_status,
            
            // 🆕 Funzioni setup (nuovo modulo)
            check_system_info,
            install_sshpass_for_devpulse,
            debug_system_state,

            // 🆕 Funzioni gestione energia
            wake_server,
            shutdown_server, 
            test_network_connectivity,
        ])
        .run(tauri::generate_context!())
        .expect("Errore avvio DevPulse");
}