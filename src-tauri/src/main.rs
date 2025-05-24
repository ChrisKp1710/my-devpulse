//! Configurazione del main.rs per DevPulse con shell embedded (ttyd)

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::net::SocketAddr;
use std::time::{Duration, Instant};
use tauri::{command, AppHandle, Manager};
use tauri_plugin_fs;
use terminal::{open_terminal, logout_terminal};

mod terminal;

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
    format!("Ciao, {}! 🎉", name)
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            ping_server,
            ping_all_servers,
            save_server,
            load_servers,
            open_terminal,
            logout_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("Errore avvio app");
}