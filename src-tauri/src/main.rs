#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 📦 Import di librerie e moduli esterni
use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::collections::HashMap;
use std::fs;
use std::io::prelude::*;
use std::net::{TcpStream, SocketAddr}; // ✅ AGGIUNTO per ping
use std::sync::Mutex;
use std::time::{Duration, Instant}; // ✅ AGGIUNTO per ping
use tauri::{command, AppHandle, Manager, State};

// 🧱 Definizione della struttura dati Server per la persistenza JSON
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

// 🔐 Dati richiesti per avviare una connessione SSH
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

// ✅ NUOVO: Struttura per il risultato del ping
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub is_online: bool,
    pub response_time_ms: Option<u64>,
    pub error_message: Option<String>,
}

// 🔄 Sessione SSH attiva (stream TCP + sessione SSH)
pub struct SshSession {
    pub session: Session,
    pub stream: TcpStream,
}

// 🧠 Mappa globale delle sessioni attive (gestita con Mutex)
pub type SshSessions = Mutex<HashMap<String, SshSession>>;

// 👋 Funzione di esempio
#[command]
fn greet(name: &str) -> String {
    format!("Ciao, {}! 🎉", name)
}

// ✅ NUOVO: Comando per fare ping a un server
#[command]
async fn ping_server(host: String, port: u16) -> Result<PingResult, String> {
    println!("🏓 Ping verso {}:{}", host, port);
    
    let address = format!("{}:{}", host, port);
    let socket_addr: SocketAddr = address.parse()
        .map_err(|e| format!("Indirizzo non valido: {}", e))?;
    
    let start_time = Instant::now();
    
    // Timeout di 5 secondi per la connessione
    match TcpStream::connect_timeout(&socket_addr, Duration::from_secs(5)) {
        Ok(_stream) => {
            let response_time = start_time.elapsed().as_millis() as u64;
            println!("✅ Server {}:{} è ONLINE ({}ms)", host, port, response_time);
            
            Ok(PingResult {
                is_online: true,
                response_time_ms: Some(response_time),
                error_message: None,
            })
        }
        Err(e) => {
            println!("❌ Server {}:{} è OFFLINE - Errore: {}", host, port, e);
            Ok(PingResult {
                is_online: false,
                response_time_ms: None,
                error_message: Some(format!("Connessione fallita: {}", e)),
            })
        }
    }
}

// ✅ NUOVO: Comando per fare ping a tutti i server salvati
#[command]
async fn ping_all_servers(app: AppHandle) -> Result<Vec<(String, PingResult)>, String> {
    let servers = load_servers(app).await?;
    let mut results = Vec::new();
    
    for server in servers {
        let ping_result = ping_server(server.ip.clone(), server.ssh_port).await?;
        results.push((server.id, ping_result));
    }
    
    Ok(results)
}

// 🚀 Avvia una nuova sessione SSH
#[command]
async fn start_ssh_session(
    connection: SshConnectionRequest,
    ssh_sessions: State<'_, SshSessions>,
) -> Result<String, String> {
    println!("🔐 Avvio sessione SSH verso {}@{}:{}", connection.username, connection.host, connection.port);

    let tcp = TcpStream::connect(format!("{}:{}", connection.host, connection.port))
        .map_err(|e| format!("Errore connessione TCP: {}", e))?;
    let tcp_clone = tcp.try_clone().map_err(|e| format!("Errore clonazione stream: {}", e))?;
    let mut sess = Session::new().map_err(|e| format!("Errore creazione sessione SSH: {}", e))?;
    sess.set_tcp_stream(tcp_clone);
    sess.handshake().map_err(|e| format!("Errore handshake SSH: {}", e))?;

    match connection.auth_method.as_str() {
        "password" => {
            if let Some(password) = &connection.password {
                sess.userauth_password(&connection.username, password)
                    .map_err(|e| format!("Errore autenticazione password: {}", e))?
            } else {
                return Err("Password mancante per autenticazione password".to_string());
            }
        }
        "key" => {
            if let Some(key_path) = &connection.key_path {
                sess.userauth_pubkey_file(&connection.username, None, std::path::Path::new(key_path), None)
                    .map_err(|e| format!("Errore autenticazione chiave: {}", e))?
            } else {
                return Err("Percorso chiave mancante per autenticazione chiave".to_string());
            }
        }
        _ => return Err("Metodo di autenticazione non supportato".to_string()),
    }

    if !sess.authenticated() {
        return Err("Autenticazione fallita".to_string());
    }

    let session_id = format!("ssh_{}_{}", connection.host, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
    let ssh_session = SshSession { session: sess, stream: tcp };

    let mut sessions = ssh_sessions.lock().unwrap();
    sessions.insert(session_id.clone(), ssh_session);

    println!("✅ Sessione SSH salvata: {}", session_id);
    Ok(session_id)
}

// 📥 Esegue un comando su una sessione SSH esistente
#[command]
async fn execute_ssh_command(
    session_id: String,
    command: String,
    ssh_sessions: State<'_, SshSessions>,
) -> Result<String, String> {
    println!("📝 Esecuzione comando: {} (Sessione: {})", command, session_id);

    let mut sessions = ssh_sessions.lock().unwrap();
    let ssh_session = sessions.get_mut(&session_id).ok_or_else(|| "Sessione SSH non trovata".to_string())?;
    let mut channel = ssh_session.session.channel_session().map_err(|e| format!("Errore creazione canale: {}", e))?;
    channel.exec(&command).map_err(|e| format!("Errore esecuzione comando: {}", e))?;

    let mut output = String::new();
    channel.read_to_string(&mut output).map_err(|e| format!("Errore lettura output: {}", e))?;

    let mut stderr = String::new();
    channel.stderr().read_to_string(&mut stderr).map_err(|e| format!("Errore lettura stderr: {}", e))?;
    channel.wait_close().map_err(|e| format!("Errore chiusura canale: {}", e))?;
    let exit_status = channel.exit_status().map_err(|e| format!("Errore status uscita: {}", e))?;

    let mut result = output;
    if !stderr.is_empty() {
        result.push_str("\n--- STDERR ---\n");
        result.push_str(&stderr);
    }
    if exit_status != 0 {
        result.push_str(&format!("\n--- EXIT CODE: {} ---", exit_status));
    }
    Ok(result)
}

// ❌ Chiude una sessione SSH esistente e la rimuove dal registro
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

// 💾 Salva un nuovo server in servers.json
#[command]
async fn save_server(app: AppHandle, server: Server) -> Result<(), String> {
    println!("📥 Ricevuto server da salvare: {:?}", server);
    let app_dir = app.path().app_data_dir().map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;
    let file_path = app_dir.join("servers.json");

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Errore creazione directory: {e}"))?;
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
    let json = serde_json::to_string_pretty(&servers).map_err(|e| format!("Errore serializzazione: {e}"))?;
    fs::write(&file_path, &json).map_err(|e| format!("Errore scrittura file: {e}"))?;
    println!("✅ Server salvato con successo");
    Ok(())
}

// 📤 Carica tutti i server da servers.json
#[command]
async fn load_servers(app: AppHandle) -> Result<Vec<Server>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;
    let file_path = app_dir.join("servers.json");

    if !file_path.exists() {
        return Ok(vec![]);
    }

    let content = fs::read_to_string(&file_path).map_err(|e| format!("Errore lettura file: {e}"))?;
    let servers: Vec<Server> = serde_json::from_str(&content).map_err(|e| format!("Errore parsing JSON: {e}"))?;

    println!("✅ Caricati {} servers", servers.len());
    Ok(servers)
}

// 🗑️ Elimina un server dal file in base all'ID
#[command]
async fn delete_server(app: AppHandle, id: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;
    let file_path = app_dir.join("servers.json");

    if !file_path.exists() {
        return Err("File servers.json non trovato".to_string());
    }

    let content = fs::read_to_string(&file_path).map_err(|e| format!("Errore lettura file: {e}"))?;
    let mut servers: Vec<Server> = serde_json::from_str(&content).map_err(|e| format!("Errore parsing JSON: {e}"))?;
    let original_len = servers.len();
    servers.retain(|server| server.id != id);

    if servers.len() == original_len {
        return Err(format!("Nessun server con ID {} trovato", id));
    }

    let json = serde_json::to_string_pretty(&servers).map_err(|e| format!("Errore serializzazione JSON: {e}"))?;
    fs::write(&file_path, json).map_err(|e| format!("Errore scrittura file: {e}"))?;
    println!("🗑️ Server con ID {} eliminato correttamente", id);
    Ok(())
}

// 🚀 Inizializzazione dell'app Tauri - ✅ AGGIORNATA
fn main() {
    tauri::Builder::default()
        .manage(SshSessions::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_server,
            load_servers,
            delete_server,
            start_ssh_session,
            execute_ssh_command,
            close_ssh_session,
            ping_server,        // ✅ NUOVO
            ping_all_servers    // ✅ NUOVO
        ])
        .run(tauri::generate_context!())
        .expect("Errore durante l'avvio dell'app");
}