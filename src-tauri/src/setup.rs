// src-tauri/src/setup.rs
// Modulo per rilevamento sistema e installazione sshpass
// Si integra con il tuo terminal.rs esistente

use std::process::Command;
use std::path::Path;
use tauri::{command, AppHandle, Manager, Emitter}; // ✅ AGGIUNTO Emitter
use tauri::path::BaseDirectory;
use serde::{Serialize, Deserialize};
use std::thread;

#[derive(Serialize, Deserialize, Debug)]
pub struct SystemInfo {
    pub platform: String,           // "macos"
    pub arch: String,               // "aarch64" per M2 Pro
    pub os_version: String,         // "macOS 14.0"
    pub chip: String,               // "Apple M2 Pro"
    pub supported: bool,            // true se supportato
    pub has_homebrew: bool,         // se Homebrew è installato
    pub has_sshpass: bool,          // ⚠️ Quello che serve per il tuo SSH
    pub ttyd_bundled_path: String,  // Path del tuo ttyd in bin/
    pub ttyd_bundled_ok: bool,      // Se il tuo ttyd esiste
    pub homebrew_path: Option<String>,
    pub needs_setup: bool,          // Se serve il setup
    pub ready_for_ssh: bool,        // Se può usare SSH con password
    pub setup_message: String,      // Messaggio per l'utente
    pub mac_model: String,         // Modello Mac (es. "MacBookPro21,1")
}

#[derive(Serialize, Clone)]
pub struct InstallProgress {
    pub step: String,
    pub progress: f32,
    pub is_error: bool,
    pub details: Option<String>,
}

// ✅ COMANDO: Rileva tutto il sistema per DevPulse
#[command]
pub async fn check_system_info(app: AppHandle) -> Result<SystemInfo, String> {
    println!("🔍 DevPulse System Check...");
    
    let platform = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    let mac_model = get_mac_model().await;
    
    // Rileva dettagli macOS
    let os_version = get_macos_version().await;
    let chip = detect_apple_chip().await;
    let supported = is_macos_supported(&os_version, &chip);
    
    // Verifica Homebrew
    let (has_homebrew, homebrew_path) = check_homebrew().await;
    
    // ⚠️ VERIFICA PRINCIPALE: sshpass (per il tuo SSH con password)
    let has_sshpass = command_exists("sshpass").await;
    
    // ✅ VERIFICA il tuo ttyd bundled
    let (ttyd_bundled_ok, ttyd_bundled_path) = check_your_bundled_ttyd(&app).await;
    
    // Determina stato generale
    let needs_setup = !has_sshpass || !ttyd_bundled_ok;
    let ready_for_ssh = has_sshpass && ttyd_bundled_ok;
    
    let setup_message = if ready_for_ssh {
        "🎉 DevPulse è pronto per l'uso!".to_string()
    } else if !ttyd_bundled_ok {
        "❌ ttyd bundled mancante".to_string()
    } else if !has_sshpass {
        "⚠️ sshpass necessario per SSH con password".to_string()
    } else {
        "🔧 Setup richiesto".to_string()
    };
    
    println!("📋 DevPulse Status Report:");
    println!("   Sistema: {} {} ({})", os_version, chip, arch);
    println!("   Sistema: {} {} {} ({})", os_version, chip, mac_model, arch);
    println!("   Supportato: {}", supported);
    println!("   Homebrew: {} ({})", has_homebrew, homebrew_path.as_deref().unwrap_or("non trovato"));
    println!("   {} ttyd bundled: {}", if ttyd_bundled_ok { "✅" } else { "❌" }, ttyd_bundled_path);
    println!("   {} sshpass: {}", if has_sshpass { "✅" } else { "⚠️" }, if has_sshpass { "Installato" } else { "MANCANTE" });
    println!("   🎯 SSH ready: {} | Setup needed: {}", ready_for_ssh, needs_setup);
    println!("   💬 {}", setup_message);
    
    Ok(SystemInfo {
        platform: platform.to_string(),
        arch: arch.to_string(),
        os_version,
        chip,
        supported,
        has_homebrew,
        has_sshpass,
        ttyd_bundled_path,
        ttyd_bundled_ok,
        homebrew_path,
        needs_setup,
        ready_for_ssh,
        setup_message,
        mac_model,
    })
}

// ✅ COMANDO: Installa solo sshpass (il tuo ttyd è già pronto)
#[command]
pub async fn install_sshpass_for_devpulse(app: AppHandle) -> Result<(), String> {
    println!("🚀 Installazione sshpass per DevPulse SSH...");
    
    let app_clone = app.clone();
    
    thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            if let Err(e) = run_sshpass_installation(&app_clone).await {
                let _ = emit_progress(&app_clone, "❌ Errore installazione", 0.0, true, Some(e)).await;
            }
        });
    });
    
    Ok(())
}

// ✅ VERIFICA il tuo ttyd bundled (in src-tauri/bin/ttyd)
async fn check_your_bundled_ttyd(app: &AppHandle) -> (bool, String) {
    match app.path().resolve("bin/ttyd", BaseDirectory::Resource) {
        Ok(ttyd_path) => {
            let path_str = ttyd_path.to_string_lossy().to_string();
            let exists = ttyd_path.exists();
            
            if exists {
                println!("✅ Il tuo ttyd trovato: {}", path_str);
                
                // Su Unix, verifica che sia eseguibile
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    if let Ok(metadata) = std::fs::metadata(&ttyd_path) {
                        let is_executable = metadata.permissions().mode() & 0o111 != 0;
                        if !is_executable {
                            println!("🔧 Fixing permissions per ttyd...");
                            let _ = Command::new("chmod")
                                .arg("+x")
                                .arg(&ttyd_path)
                                .output();
                        }
                    }
                }
                
                (true, path_str)
            } else {
                println!("❌ Il tuo ttyd NON trovato in: {}", path_str);
                (false, path_str)
            }
        },
        Err(e) => {
            let error_msg = format!("Errore path ttyd bundled: {}", e);
            println!("❌ {}", error_msg);
            (false, error_msg)
        }
    }
}

// ✅ PROCESSO DI INSTALLAZIONE SSHPASS
async fn run_sshpass_installation(app: &AppHandle) -> Result<(), String> {
    emit_progress(app, "🍎 Preparazione setup DevPulse...", 5.0, false, 
                 Some("Verifico ttyd bundled e preparo installazione sshpass".to_string())).await;
    
    // Step 1: Verifica che il tuo ttyd sia OK
    let (ttyd_ok, ttyd_path) = check_your_bundled_ttyd(app).await;
    if !ttyd_ok {
        return Err(format!("❌ Il tuo ttyd bundled non è disponibile: {}", ttyd_path));
    }
    
    emit_progress(app, "✅ ttyd bundled verificato", 10.0, false,
                 Some(format!("Il tuo ttyd pronto: {}", ttyd_path))).await;
    
    // Step 2: Verifica/Installa Homebrew per sshpass
    let (has_brew, brew_path) = check_homebrew().await;
    
    if !has_brew {
        emit_progress(app, "📦 Installazione Homebrew...", 15.0, false,
                     Some("Homebrew necessario per installare sshpass su macOS".to_string())).await;
        
        install_homebrew(app).await?;
        emit_progress(app, "✅ Homebrew installato", 50.0, false, None).await;
    } else {
        let brew_path_value = brew_path.unwrap_or_else(|| "non specificato".to_string());
        emit_progress(app, "✅ Homebrew disponibile", 50.0, false,
                     Some(format!("Percorso: {}", brew_path_value))).await;
    }
    
    // Step 3: Installa sshpass per il tuo SSH
    emit_progress(app, "🔐 Setup repository sshpass...", 55.0, false,
                 Some("sshpass è necessario per SSH con password nel tuo terminal.rs".to_string())).await;
    
    // Aggiungi tap esolitos/ipa
    let tap_output = Command::new("brew")
        .args(&["tap", "esolitos/ipa"])
        .output()
        .map_err(|e| format!("Errore tap sshpass: {}", e))?;
    
    if !tap_output.status.success() {
        let error = String::from_utf8_lossy(&tap_output.stderr).to_string();
        return Err(format!("Errore aggiunta repository: {}", error));
    }
    
    emit_progress(app, "📥 Installazione sshpass...", 70.0, false,
                 Some("Download e compilazione sshpass...".to_string())).await;
    
    // Installa sshpass
    let install_output = Command::new("brew")
        .args(&["install", "esolitos/ipa/sshpass"])
        .output()
        .map_err(|e| format!("Errore installazione sshpass: {}", e))?;
    
    if !install_output.status.success() {
        let error = String::from_utf8_lossy(&install_output.stderr).to_string();
        return Err(format!("Installazione sshpass fallita: {}", error));
    }
    
    emit_progress(app, "🔍 Verifica finale DevPulse...", 90.0, false, None).await;
    
    // Verifica che tutto sia pronto
    if command_exists("sshpass").await {
        emit_progress(app, "🎉 DevPulse setup completato!", 100.0, false,
                     Some("✅ ttyd bundled + ✅ sshpass = Il tuo SSH con password è pronto!".to_string())).await;
        Ok(())
    } else {
        Err("❌ sshpass non risulta disponibile dopo l'installazione".to_string())
    }
}

// ✅ FUNZIONI HELPER PER MACOS

async fn get_macos_version() -> String {
    match Command::new("sw_vers").arg("-productVersion").output() {
        Ok(output) => {
            let version_str = String::from_utf8_lossy(&output.stdout);
            let version = version_str.trim();
            format!("macOS {}", version)
        },
        Err(_) => "macOS Unknown".to_string(),
    }
}
async fn get_mac_model() -> String {
    match Command::new("sysctl").arg("-n").arg("hw.model").output() {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => "Unknown".to_string(),
    }
}

async fn detect_apple_chip() -> String {
    if let Ok(output) = Command::new("sysctl").arg("-n").arg("machdep.cpu.brand_string").output() {
        let cpu_info = String::from_utf8_lossy(&output.stdout);
        
        if cpu_info.contains("Apple") {
            // Rileva M2 Pro specificamente
            if let Ok(model_output) = Command::new("sysctl").arg("-n").arg("hw.model").output() {
                let model_str = String::from_utf8_lossy(&model_output.stdout);
                let model = model_str.trim();
                
                match model {
                    // M2 Pro/Max (il tuo!)
                    m if m.contains("MacBookPro21") => "Apple M2 Pro".to_string(),
                    m if m.contains("Mac15") => "Apple M2 Pro/Max".to_string(),
                    
                    // Altri M2
                    m if m.contains("MacBookPro20") => "Apple M2".to_string(),
                    m if m.contains("MacBookAir15") => "Apple M2".to_string(),
                    
                    // M1 Series
                    m if m.contains("MacBookPro17") || m.contains("MacBookPro18") => "Apple M1".to_string(),
                    m if m.contains("Mac13") || m.contains("Mac14") => "Apple M1 Pro/Max".to_string(),
                    
                    // M3/M4 Series
                    m if m.contains("Mac16") || m.contains("Mac17") => "Apple M3".to_string(),
                    m if m.contains("Mac18") => "Apple M4".to_string(),
                    
                    _ if cpu_info.contains("M2") => "Apple M2 Pro".to_string(), // Default M2
                    _ => "Apple Silicon".to_string(),
                }
            } else {
                "Apple Silicon".to_string()
            }
        } else {
            "Intel".to_string()
        }
    } else {
        "Unknown".to_string()
    }
}

fn is_macos_supported(_version: &str, chip: &str) -> bool {
    // M2 Pro e tutti i chip Apple sono supportati
    chip.contains("Apple") || chip.contains("M1") || chip.contains("M2") || chip.contains("M3") || chip.contains("M4")
}

async fn check_homebrew() -> (bool, Option<String>) {
    let possible_paths = [
        "/opt/homebrew/bin/brew",     // Apple Silicon (M2 Pro)
        "/usr/local/bin/brew",        // Intel Mac
    ];
    
    for path in &possible_paths {
        if Path::new(path).exists() {
            return (true, Some(path.to_string()));
        }
    }
    
    // Fallback: usa which
    if let Ok(output) = Command::new("which").arg("brew").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return (true, Some(path));
        }
    }
    
    (false, None)
}

async fn command_exists(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

async fn install_homebrew(app: &AppHandle) -> Result<(), String> {
    let install_script = r#"/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)""#;
    
    emit_progress(app, "⬇️ Download Homebrew...", 25.0, false,
                 Some("Installazione Homebrew per macOS...".to_string())).await;
    
    let output = Command::new("/bin/bash")
        .arg("-c")
        .arg(install_script)
        .output()
        .map_err(|e| format!("Errore installazione Homebrew: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Installazione Homebrew fallita: {}", error));
    }
    
    // Configura PATH per Apple Silicon (M2 Pro)
    let arch = std::env::consts::ARCH;
    if arch == "aarch64" {
        emit_progress(app, "🔧 Configurazione PATH M2 Pro...", 45.0, false, None).await;
        
        let _ = Command::new("/bin/bash")
            .arg("-c")
            .arg("echo 'eval \"$(/opt/homebrew/bin/brew shellenv)\"' >> ~/.zprofile")
            .output();
    }
    
    Ok(())
}

async fn emit_progress(
    app: &AppHandle,
    step: &str,
    progress: f32,
    is_error: bool,
    details: Option<String>
) {
    let _ = app.emit("install_progress", InstallProgress {
        step: step.to_string(),
        progress,
        is_error,
        details,
    });
    
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}