#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::collections::HashMap;
use std::fs;
use std::io::prelude::*;
use std::net::TcpStream;
use std::sync::Mutex;
use tauri::{command, AppHandle, Manager, State};

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
pub struct SshConnectionRequest {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
}

// ✅ Struttura per mantenere le sessioni SSH attive
pub struct SshSession {
    pub session: Session,
    pub stream: TcpStream,
}

// ✅ Store globale per le sessioni SSH
pub type SshSessions = Mutex<HashMap<String, SshSession>>;

#[command]
fn greet(name: &str) -> String {
    format!("Ciao, {}! 🎉", name)
}

#[command]
async fn start_ssh_session(
    connection: SshConnectionRequest,
    ssh_sessions: State<'_, SshSessions>,
) -> Result<String, String> {
    println!("🔐 Avvio sessione SSH verso {}@{}:{}", 
             connection.username, connection.host, connection.port);
    
    // ✅ Crea connessione TCP
    let tcp = TcpStream::connect(format!("{}:{}", connection.host, connection.port))
        .map_err(|e| format!("Errore connessione TCP: {}", e))?;
    
    // ✅ Clona il stream prima di passarlo alla sessione
    let tcp_clone = tcp.try_clone().map_err(|e| format!("Errore clonazione stream: {}", e))?;
    
    // ✅ Inizializza sessione SSH
    let mut sess = Session::new().map_err(|e| format!("Errore creazione sessione SSH: {}", e))?;
    sess.set_tcp_stream(tcp_clone);
    sess.handshake().map_err(|e| format!("Errore handshake SSH: {}", e))?;
    
    // ✅ Autenticazione
    match connection.auth_method.as_str() {
        "password" => {
            if let Some(password) = &connection.password {
                sess.userauth_password(&connection.username, password)
                    .map_err(|e| format!("Errore autenticazione password: {}", e))?;
            } else {
                return Err("Password mancante per autenticazione password".to_string());
            }
        }
        "key" => {
            if let Some(key_path) = &connection.key_path {
                sess.userauth_pubkey_file(&connection.username, None, std::path::Path::new(key_path), None)
                    .map_err(|e| format!("Errore autenticazione chiave: {}", e))?;
            } else {
                return Err("Percorso chiave mancante per autenticazione chiave".to_string());
            }
        }
        _ => return Err("Metodo di autenticazione non supportato".to_string()),
    }
    
    // ✅ Verifica autenticazione
    if !sess.authenticated() {
        return Err("Autenticazione fallita".to_string());
    }
    
    println!("✅ Autenticazione SSH riuscita per {}", connection.username);
    
    // ✅ Genera ID sessione e salva
    let session_id = format!("ssh_{}_{}", connection.host, 
                           std::time::SystemTime::now()
                           .duration_since(std::time::UNIX_EPOCH)
                           .unwrap()
                           .as_secs());
    
    // ✅ Clona il TcpStream per il salvataggio (ora usiamo il stream originale)
    let ssh_session = SshSession {
        session: sess,
        stream: tcp,  // ✅ Usiamo il TcpStream originale
    };
    
    // ✅ Salva la sessione nel store globale
    let mut sessions = ssh_sessions.lock().unwrap();
    sessions.insert(session_id.clone(), ssh_session);
    
    println!("✅ Sessione SSH salvata: {}", session_id);
    
    Ok(session_id)
}

#[command]
async fn execute_ssh_command(
    session_id: String,
    command: String,
    ssh_sessions: State<'_, SshSessions>,
) -> Result<String, String> {
    println!("📝 Esecuzione comando: {} (Sessione: {})", command, session_id);
    
    // ✅ Recupera la sessione
    let mut sessions = ssh_sessions.lock().unwrap();
    let ssh_session = sessions.get_mut(&session_id)
        .ok_or_else(|| "Sessione SSH non trovata".to_string())?;
    
    // ✅ Crea canale per il comando
    let mut channel = ssh_session.session.channel_session()
        .map_err(|e| format!("Errore creazione canale: {}", e))?;
    
    // ✅ Esegui comando
    channel.exec(&command)
        .map_err(|e| format!("Errore esecuzione comando: {}", e))?;
    
    // ✅ Leggi output
    let mut output = String::new();
    channel.read_to_string(&mut output)
        .map_err(|e| format!("Errore lettura output: {}", e))?;
    
    // ✅ Leggi stderr se presente
    let mut stderr = String::new();
    channel.stderr().read_to_string(&mut stderr)
        .map_err(|e| format!("Errore lettura stderr: {}", e))?;
    
    // ✅ Attendi chiusura canale
    channel.wait_close()
        .map_err(|e| format!("Errore chiusura canale: {}", e))?;
    
    let exit_status = channel.exit_status()
        .map_err(|e| format!("Errore status uscita: {}", e))?;
    
    // ✅ Combina output e stderr
    let mut result = output;
    if !stderr.is_empty() {
        result.push_str("\n--- STDERR ---\n");
        result.push_str(&stderr);
    }
    
    if exit_status != 0 {
        result.push_str(&format!("\n--- EXIT CODE: {} ---", exit_status));
    }
    
    println!("✅ Comando eseguito, output length: {}", result.len());
    
    Ok(result)
}

#[command]
async fn close_ssh_session(
    session_id: String,
    ssh_sessions: State<'_, SshSessions>,
) -> Result<(), String> {
    println!("🔌 Chiusura sessione SSH: {}", session_id);
    
    let mut sessions = ssh_sessions.lock().unwrap();
    if let Some(_) = sessions.remove(&session_id) {
        println!("✅ Sessione SSH chiusa: {}", session_id);
        Ok(())
    } else {
        Err("Sessione SSH non trovata".to_string())
    }
}

#[command]
async fn save_server(app: AppHandle, server: Server) -> Result<(), String> {
    println!("📥 Ricevuto server da salvare: {:?}", server);
    
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;

    let file_path = app_dir.join("servers.json");

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            format!("Errore creazione directory: {e}")
        })?;
    }

    let mut servers: Vec<Server> = if file_path.exists() {
        match fs::read_to_string(&file_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| vec![]),
            Err(_) => vec![],
        }
    } else {
        vec![]
    };

    servers.push(server);

    let json = serde_json::to_string_pretty(&servers)
        .map_err(|e| format!("Errore serializzazione: {e}"))?;

    fs::write(&file_path, &json)
        .map_err(|e| format!("Errore scrittura file: {e}"))?;

    println!("✅ Server salvato con successo");
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
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Errore lettura file: {e}"))?;

    let servers: Vec<Server> = serde_json::from_str(&content)
        .map_err(|e| format!("Errore parsing JSON: {e}"))?;

    println!("✅ Caricati {} servers", servers.len());
    Ok(servers)
}

fn main() {
    tauri::Builder::default()
        .manage(SshSessions::default()) // ✅ Inizializza il store delle sessioni SSH
        .invoke_handler(tauri::generate_handler![
            greet, 
            save_server, 
            load_servers, 
            start_ssh_session,
            execute_ssh_command,
            close_ssh_session // ✅ Nuovo comando per chiudere sessioni
        ])
        .run(tauri::generate_context!())
        .expect("Errore durante l'avvio dell'app");
}