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

    #[cfg(target_os = "windows")]
    {
        let ssh_command = format!(
            "ssh -p {} {}@{}",
            request.ssh_port, request.ssh_user, request.ip
        );

        println!("🖥️ Comando (Windows): {}", ssh_command);

        Command::new(ttyd_path)
            .arg("--writable")
            .arg("-t")
            .arg("titleFixed=DevPulse")
            .arg("powershell")
            .args(&["-NoExit", "-Command", &ssh_command])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Errore avvio ttyd: {e}"))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let ssh_command = if let Some(password) = request.password.clone() {
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

        println!("🖥️ Comando (Unix): {}", ssh_command);

        Command::new(ttyd_path)
            .arg("--writable")
            .arg("-t")
            .arg("titleFixed=DevPulse")
            .arg("/bin/bash")
            .args(&["-c", &ssh_command])
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| format!("Errore avvio ttyd: {e}"))?;
    }

    Ok(())
}