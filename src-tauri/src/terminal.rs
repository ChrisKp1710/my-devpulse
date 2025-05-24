use std::process::{Command, Stdio, Child};
use std::sync::Mutex;
use tauri::{command, AppHandle, Manager};
use tauri::path::BaseDirectory;
use once_cell::sync::OnceCell;

static TERMINAL_PROCESS: OnceCell<Mutex<Option<Child>>> = OnceCell::new();

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalRequest {
    pub ssh_user: String,
    pub ip: String,
    pub ssh_port: u16,
    pub password: Option<String>,
}

#[command]
pub async fn open_terminal(app: AppHandle, request: TerminalRequest) -> Result<(), String> {
    let ttyd_path = app
        .path()
        .resolve("bin/ttyd", BaseDirectory::Resource)
        .map_err(|e| format!("Errore percorso ttyd: {e}"))?;

    if !ttyd_path.exists() {
        return Err(format!("Binario ttyd non trovato in: {}", ttyd_path.display()));
    }

    let ssh_command = if cfg!(target_os = "windows") {
        format!(
            "ssh -p {} {}@{}",
            request.ssh_port, request.ssh_user, request.ip
        )
    } else if let Some(password) = request.password.clone() {
        format!(
            "sshpass -p '{}' ssh -tt -o StrictHostKeyChecking=no -p {} {}@{}",
            password, request.ssh_port, request.ssh_user, request.ip
        )
    } else {
        format!(
            "ssh -tt -o StrictHostKeyChecking=no -p {} {}@{}",
            request.ssh_port, request.ssh_user, request.ip
        )
    };

    println!("🖥️ Comando: {}", ssh_command);

    // Evita ri-lancio se già attivo
    if let Some(lock) = TERMINAL_PROCESS.get() {
        if lock.lock().unwrap().is_some() {
            return Ok(()); // Già in esecuzione
        }
    }

    let mut command = Command::new(ttyd_path);
    command
        .arg("--writable")
        .arg("-t")
        .arg("titleFixed=DevPulse")
        .arg(if cfg!(target_os = "windows") { "powershell" } else { "/bin/bash" })
        .args(&["-c", &ssh_command])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    let child = command.spawn().map_err(|e| format!("Errore avvio ttyd: {e}"))?;

    // Salva il processo per logout successivo
    let mutex = TERMINAL_PROCESS.get_or_init(|| Mutex::new(None));
    *mutex.lock().unwrap() = Some(child);

    Ok(())
}

#[command]
pub fn logout_terminal() -> Result<(), String> {
    if let Some(lock) = TERMINAL_PROCESS.get() {
        let mut guard = lock.lock().unwrap();
        if let Some(mut child) = guard.take() {
            child.kill().map_err(|e| format!("Errore chiusura ttyd: {e}"))?;
            println!("✅ Terminale chiuso.");
        }
    }
    Ok(())
}