#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 📦 Import di librerie e moduli esterni - CORRETTI
use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::collections::HashMap;
use std::collections::VecDeque;
use std::fs;
use std::io::prelude::*;
use std::net::{TcpStream, SocketAddr};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{command, AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use chrono::Utc;
use tokio::sync::RwLock;

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

// ✅ NUOVO: Struttura per gestire shell interattive
pub struct InteractiveShell {
    pub channel: ssh2::Channel,
    pub output_buffer: Arc<RwLock<VecDeque<u8>>>,
}

// 🧠 Mappa globale delle sessioni attive (gestita con Mutex)
pub type SshSessions = Mutex<HashMap<String, SshSession>>;

// ✅ NUOVO: Mappa delle shell interattive
pub type InteractiveShells = Mutex<HashMap<String, InteractiveShell>>;

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

// ✅ NUOVO: Avvia shell interattiva con PTY - VERSIONE MIGLIORATA
#[command]
async fn start_interactive_shell(
    session_id: String,
    terminal_cols: u32,
    terminal_rows: u32,
    ssh_sessions: State<'_, SshSessions>,
    interactive_shells: State<'_, InteractiveShells>,
) -> Result<(), String> {
    println!("🚀 Avvio shell interattiva per sessione: {}", session_id);
    
    let mut sessions = ssh_sessions.lock().unwrap();
    let ssh_session = sessions.get_mut(&session_id)
        .ok_or_else(|| "Sessione SSH non trovata".to_string())?;

    // Crea un canale con PTY per shell interattiva
    let mut channel = ssh_session.session.channel_session()
        .map_err(|e| format!("Errore creazione canale: {}", e))?;
    
    // ✅ IMPORTANTE: Configurazione PTY migliorata
    channel.request_pty("xterm-256color", None, Some((terminal_cols, terminal_rows, 0, 0)))
        .map_err(|e| format!("Errore richiesta PTY: {}", e))?;
    
    // ✅ IMPORTANTE: Imposta variabili d'ambiente per una shell migliore
    let _ = channel.setenv("TERM", "xterm-256color");
    let _ = channel.setenv("COLUMNS", &terminal_cols.to_string());
    let _ = channel.setenv("LINES", &terminal_rows.to_string());
    
    // ✅ IMPORTANTE: Avvia shell
    channel.shell()
        .map_err(|e| format!("Errore avvio shell: {}", e))?;

    // ✅ IMPORTANTE: Aspetta che la shell sia pronta
    std::thread::sleep(std::time::Duration::from_millis(500));

    // Buffer per l'output
    let output_buffer = Arc::new(RwLock::new(VecDeque::new()));
    
    // Crea la shell interattiva
    let interactive_shell = InteractiveShell {
        channel,
        output_buffer: output_buffer.clone(),
    };

    // Salva nella mappa delle shell
    let mut shells = interactive_shells.lock().unwrap();
    shells.insert(session_id.clone(), interactive_shell);

    println!("✅ Shell interattiva avviata per: {}", session_id);
    Ok(())
}

// ✅ NUOVO: Invia dati alla shell - VERSIONE MIGLIORATA
#[command]
async fn send_to_shell(
    session_id: String,
    data: String,
    interactive_shells: State<'_, InteractiveShells>,
) -> Result<(), String> {
    println!("📝 Invio alla shell [{}]: {:?}", session_id, data);
    
    let mut shells = interactive_shells.lock().unwrap();
    let shell = shells.get_mut(&session_id)
        .ok_or_else(|| "Shell interattiva non trovata".to_string())?;

    // ✅ IMPORTANTE: Scrivi i dati
    shell.channel.write_all(data.as_bytes())
        .map_err(|e| format!("Errore invio dati: {}", e))?;
    
    // ✅ IMPORTANTE: Flush immediato
    shell.channel.flush()
        .map_err(|e| format!("Errore flush: {}", e))?;

    println!("✅ Dati inviati e flushed correttamente");
    
    // ✅ NUOVO: Piccola pausa per permettere al server di processare
    std::thread::sleep(std::time::Duration::from_millis(10));
    
    Ok(())
}

// ✅ NUOVO: Leggi output dalla shell - VERSIONE CORRETTA
#[command]
async fn read_shell_output(
    session_id: String,
    interactive_shells: State<'_, InteractiveShells>,
) -> Result<String, String> {
    let mut shells = interactive_shells.lock().unwrap();
    let shell = shells.get_mut(&session_id)
        .ok_or_else(|| "Shell interattiva non trovata".to_string())?;

    let mut buffer = [0; 4096];
    let mut output = String::new();
    
    // ✅ CORRETTO: Usiamo un loop con timeout per leggere tutto l'output disponibile
    let start_time = std::time::Instant::now();
    const TIMEOUT_MS: u64 = 50; // Timeout di 50ms per evitare blocchi
    
    loop {
        // Controlla timeout
        if start_time.elapsed().as_millis() > TIMEOUT_MS as u128 {
            break;
        }
        
        match shell.channel.read(&mut buffer) {
            Ok(0) => {
                // Nessun dato disponibile, aspetta un po' e riprova
                std::thread::sleep(std::time::Duration::from_millis(1));
                continue;
            }
            Ok(n) => {
                let data = String::from_utf8_lossy(&buffer[..n]);
                output.push_str(&data);
                
                // Se abbiamo letto poco, probabilmente non c'è altro
                if n < 100 {
                    std::thread::sleep(std::time::Duration::from_millis(1));
                }
            }
            Err(e) => {
                // Se è un errore di "would block", non c'è più da leggere
                if e.kind() == std::io::ErrorKind::WouldBlock {
                    break;
                }
                // Altri errori potrebbero essere seri
                return Err(format!("Errore lettura: {}", e));
            }
        }
        
        // Se abbiamo già dell'output e non arriva più nulla, usciamo
        if !output.is_empty() {
            std::thread::sleep(std::time::Duration::from_millis(5));
            // Prova un'ultima lettura
            match shell.channel.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buffer[..n]);
                    output.push_str(&data);
                }
            }
            break;
        }
    }
    
    if !output.is_empty() {
        println!("📤 Output letto: {} caratteri", output.len());
    }
    
    Ok(output)
}

// ✅ NUOVO: Ridimensiona il terminale - VERSIONE CORRETTA
#[command]
async fn resize_shell(
    session_id: String,
    cols: u32,
    rows: u32,
    interactive_shells: State<'_, InteractiveShells>,
) -> Result<(), String> {
    let mut shells = interactive_shells.lock().unwrap();
    let shell = shells.get_mut(&session_id)
        .ok_or_else(|| "Shell interattiva non trovata".to_string())?;

    // ✅ CORRETTO: request_pty_size richiede Option<u32> per i parametri pixel
    shell.channel.request_pty_size(cols, rows, Some(0), Some(0))
        .map_err(|e| format!("Errore resize PTY: {}", e))?;

    println!("🔄 PTY ridimensionato: {}x{} per {}", cols, rows, session_id);
    Ok(())
}

// ✅ NUOVO: Ferma shell interattiva
#[command]
async fn stop_interactive_shell(
    session_id: String,
    interactive_shells: State<'_, InteractiveShells>,
) -> Result<(), String> {
    let mut shells = interactive_shells.lock().unwrap();
    
    if let Some(mut shell) = shells.remove(&session_id) {
        let _ = shell.channel.close();
        println!("🛑 Shell interattiva chiusa per: {}", session_id);
    }
    
    Ok(())
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

// 📤 Esporta server come JSON string (per uso interno)
#[command]
async fn export_servers_json(app: AppHandle) -> Result<String, String> {
    let servers = load_servers(app).await?;
    serde_json::to_string_pretty(&servers)
        .map_err(|e| format!("Errore serializzazione: {}", e))
}

// 📥 Importa server da JSON string (per uso interno)
#[command]
async fn import_servers_json(app: AppHandle, json_data: String) -> Result<usize, String> {
    let new_servers: Vec<Server> = serde_json::from_str(&json_data)
        .map_err(|e| format!("Errore parsing JSON: {}", e))?;

    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Errore nel recupero cartella app: {}", e))?;
    let file_path = app_dir.join("servers.json");

    let json = serde_json::to_string_pretty(&new_servers)
        .map_err(|e| format!("Errore serializzazione: {}", e))?;
    fs::write(&file_path, json)
        .map_err(|e| format!("Errore scrittura file: {}", e))?;

    Ok(new_servers.len())
}

// 📤 Esporta i server in un file con dialog di salvataggio - ✅ CORRETTO
#[command]
async fn export_servers_to_file(app: AppHandle) -> Result<String, String> {
    println!("📤 Inizio esportazione server con dialog...");
    
    // Carica i server esistenti
    let servers = load_servers(app.clone()).await?;
    if servers.is_empty() {
        return Err("Nessun server da esportare".to_string());
    }
    
    // Genera il nome del file con data corrente
    let current_date = Utc::now().format("%Y-%m-%d").to_string();
    let default_filename = format!("devpulse-servers-{}.json", current_date);
    
    // Apri dialog di salvataggio
    let file_path = app.dialog()
        .file()
        .set_title("Salva configurazione server")
        .set_file_name(&default_filename)
        .add_filter("JSON Files", &["json"])
        .blocking_save_file();
    
    match file_path {
        Some(path) => {
            // Serializza i server in JSON
            let json_content = serde_json::to_string_pretty(&servers)
                .map_err(|e| format!("Errore serializzazione JSON: {}", e))?;
            
            // ✅ CORRETTO: Converti FilePath in PathBuf
            let path_buf = std::path::PathBuf::from(path.to_string());
            
            // Scrivi il file
            fs::write(&path_buf, json_content)
                .map_err(|e| format!("Errore scrittura file: {}", e))?;
            
            let path_str = path_buf.to_string_lossy().to_string();
            println!("✅ Server esportati in: {}", path_str);
            Ok(path_str)
        }
        None => Err("Esportazione annullata dall'utente".to_string())
    }
}

// 📥 Importa server da file con dialog di apertura - ✅ MIGLIORATO
#[command]
async fn import_servers_from_file(app: AppHandle) -> Result<usize, String> {
    println!("📥 Inizio importazione server con dialog...");
    
    // Apri dialog di apertura file
    let file_path = app.dialog()
        .file()
        .set_title("Seleziona file di configurazione server")
        .add_filter("JSON Files", &["json"])
        .add_filter("Tutti i file", &["*"])  // ✅ Permetti tutti i file JSON
        .blocking_pick_file();
    
    match file_path {
        Some(path) => {
            // ✅ CORRETTO: Converti FilePath in PathBuf
            let path_buf = std::path::PathBuf::from(path.to_string());
            
            println!("📂 File selezionato: {}", path_buf.display());
            
            // Leggi il contenuto del file
            let content = fs::read_to_string(&path_buf)
                .map_err(|e| format!("Errore lettura file: {}", e))?;
            
            // ✅ VALIDAZIONE: Controlla che sia un file JSON valido con server
            let new_servers: Vec<Server> = serde_json::from_str(&content)
                .map_err(|e| format!("File non valido - Errore parsing JSON: {}", e))?;
            
            if new_servers.is_empty() {
                return Err("Il file selezionato non contiene server validi".to_string());
            }
            
            // ✅ VALIDAZIONE: Controlla che i server abbiano i campi necessari
            for (i, server) in new_servers.iter().enumerate() {
                if server.id.is_empty() || server.name.is_empty() || server.ip.is_empty() {
                    return Err(format!("Server #{} nel file ha campi mancanti (id, name, ip)", i + 1));
                }
            }
            
            println!("✅ File validato: {} server trovati", new_servers.len());
            
            // ✅ AUTOMATICO: Salva come servers.json nella cartella dell'app
            let app_dir = app.path().app_data_dir()
                .map_err(|e| format!("Errore recupero cartella app: {}", e))?;
            let servers_file = app_dir.join("servers.json");  // ✅ SEMPRE servers.json
            
            // Crea la directory se non esiste
            if let Some(parent) = servers_file.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Errore creazione directory: {}", e))?;
            }
            
            // ✅ BACKUP: Se esiste già un servers.json, fai un backup
            if servers_file.exists() {
                let backup_name = format!("servers_backup_{}.json", 
                    chrono::Utc::now().format("%Y%m%d_%H%M%S"));
                let backup_path = app_dir.join(&backup_name);
                
                if let Err(e) = fs::copy(&servers_file, &backup_path) {
                    println!("⚠️ Warning: Impossibile creare backup: {}", e);
                } else {
                    println!("📋 Backup creato: {}", backup_name);
                }
            }
            
            // ✅ SALVA: Scrivi i nuovi server come servers.json
            let json = serde_json::to_string_pretty(&new_servers)
                .map_err(|e| format!("Errore serializzazione: {}", e))?;
            fs::write(&servers_file, json)
                .map_err(|e| format!("Errore scrittura file servers.json: {}", e))?;
            
            let count = new_servers.len();
            let original_filename = path_buf.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("file sconosciuto");
                
            println!("✅ Importati {} server da '{}' → servers.json", count, original_filename);
            Ok(count)
        }
        None => Err("Importazione annullata dall'utente".to_string())
    }
}

// 🚀 Inizializzazione dell'app Tauri - ✅ AGGIORNATA CON SHELL INTERATTIVA
fn main() {
    tauri::Builder::default()
        .manage(SshSessions::default())
        .manage(InteractiveShells::default()) // ✅ AGGIUNTO: Gestione shell interattive
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_server,
            load_servers,
            delete_server,
            start_ssh_session,
            execute_ssh_command,
            close_ssh_session,
            ping_server,
            ping_all_servers,
            export_servers_json,
            import_servers_json,
            export_servers_to_file,
            import_servers_from_file,
            // ✅ NUOVI COMANDI PER SHELL INTERATTIVA
            start_interactive_shell,
            send_to_shell,
            read_shell_output,
            resize_shell,
            stop_interactive_shell
        ])
        .run(tauri::generate_context!())
        .expect("Errore durante l'avvio dell'app");
}