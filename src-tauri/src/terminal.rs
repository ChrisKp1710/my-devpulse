use std::process::{Command, Stdio};
use tauri::{command, AppHandle, Manager};
use tauri::path::BaseDirectory;

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

    let ssh_command = format!(
        "ssh -p {} {}@{}",
        request.ssh_port, request.ssh_user, request.ip
    );

    println!("🖥️ Avvio terminale con comando: {}", ssh_command);

    Command::new(ttyd_path)
        .arg("-t")
        .arg("titleFixed=DevPulse")
        .arg("--once")
        .arg("sh")
        .arg("-c")
        .arg(&ssh_command)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .stdin(Stdio::null())
        .spawn()
        .map_err(|e| format!("Errore avvio ttyd: {e}"))?;

    Ok(())
}