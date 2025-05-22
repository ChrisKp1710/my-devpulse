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
    pub server_type: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")] // ← AGGIUNGI QUESTA RIGA
pub struct SshConnectionRequest {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: String, // Sarà mappato da authMethod
    pub password: Option<String>,
    pub key_path: Option<String>, // Sarà mappato da keyPath
}

#[command]
fn greet(name: &str) -> String {
    format!("Ciao, {}! 🎉", name)
}

#[command]
async fn start_ssh_session(connection: SshConnectionRequest) -> Result<String, String> {
    println!("🔐 Avvio sessione SSH verso {}@{}:{}", 
             connection.username, connection.host, connection.port);
    
    println!("🔑 Metodo autenticazione: {}", connection.auth_method);
    
    // Per ora restituiamo un messaggio di successo
    // In futuro qui implementeremo la connessione SSH reale
    let session_id = format!("ssh_{}_{}", connection.host, 
                           std::time::SystemTime::now()
                           .duration_since(std::time::UNIX_EPOCH)
                           .unwrap()
                           .as_secs());
    
    println!("✅ Sessione SSH simulata creata: {}", session_id);
    
    Ok(session_id)
}

#[command]
async fn execute_ssh_command(session_id: String, command: String) -> Result<String, String> {
    println!("📝 Esecuzione comando: {} (Sessione: {})", command, session_id);
    
    // Per ora simuliamo l'output
    match command.trim() {
        "ls" | "ls -la" => Ok("total 8\ndrwxr-xr-x  2 user user 4096 Jan  1 12:00 Documents\ndrwxr-xr-x  2 user user 4096 Jan  1 12:00 Downloads\ndrwxr-xr-x  2 user user 4096 Jan  1 12:00 Desktop\n-rw-r--r--  1 user user  220 Jan  1 12:00 .bashrc".to_string()),
        "pwd" => Ok("/home/user".to_string()),
        "whoami" => Ok("user".to_string()),
        "date" => Ok("Thu Jan  1 12:00:00 UTC 2025".to_string()),
        "uname -a" => Ok("Linux server 5.15.0 #1 SMP x86_64 GNU/Linux".to_string()),
        "ps aux" => Ok("USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1  22584  2016 ?        Ss   12:00   0:00 /sbin/init\nuser      1234  0.0  0.2  12345  4096 pts/0    S+   12:00   0:00 bash".to_string()),
        "free -h" => Ok("              total        used        free      shared  buff/cache   available\nMem:           8.0G        2.1G        4.2G        256M        1.7G        5.5G\nSwap:          2.0G          0B        2.0G".to_string()),
        "df -h" => Ok("Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G  8.5G   10G  46% /\n/dev/sda2       100G   45G   50G  48% /home".to_string()),
        "uptime" => Ok(" 12:00:00 up 10 days,  3:42,  1 user,  load average: 0.15, 0.05, 0.01".to_string()),
        "cat /etc/os-release" => Ok("NAME=\"Ubuntu\"\nVERSION=\"22.04.3 LTS (Jammy Jellyfish)\"\nID=ubuntu\nID_LIKE=debian".to_string()),
        cmd if cmd.starts_with("echo ") => Ok(cmd.strip_prefix("echo ").unwrap_or("").to_string()),
        cmd if cmd.starts_with("cd ") => Ok("".to_string()), // cd non produce output
        "clear" => Ok("\x1b[2J\x1b[H".to_string()), // Clear screen ANSI sequence
        "help" | "?" => Ok("Comandi disponibili:\n  ls, pwd, whoami, date, uname -a\n  ps aux, free -h, df -h, uptime\n  echo <text>, cd <dir>, clear\n  cat /etc/os-release".to_string()),
        _ => Ok(format!("bash: {}: command not found", command))
    }
}

#[command]
async fn save_server(app: AppHandle, server: Server) -> Result<(), String> {
    println!("📥 Ricevuto server da salvare: {:?}", server);
    
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Errore nel recupero della cartella app: {e}"))?;

    println!("📁 Directory app: {:?}", app_dir);

    let file_path = app_dir.join("servers.json");
    println!("💾 Percorso file: {:?}", file_path);

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            println!("❌ Errore creazione directory: {}", e);
            format!("Errore creazione directory: {e}")
        })?;
        println!("✅ Directory creata/verificata");
    }

    let mut servers: Vec<Server> = if file_path.exists() {
        match fs::read_to_string(&file_path) {
            Ok(content) => {
                println!("📄 File esistente trovato");
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

    servers.push(server);
    println!("📊 Totale servers dopo aggiunta: {}", servers.len());

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
        .invoke_handler(tauri::generate_handler![
            greet, 
            save_server, 
            load_servers, 
            start_ssh_session,
            execute_ssh_command
        ])
        .run(tauri::generate_context!())
        .expect("Errore durante l'avvio dell'app");
}