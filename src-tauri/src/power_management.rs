// src-tauri/src/power_management.rs
use std::net::UdpSocket;
use std::process::{Command, Stdio};
use tauri::command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct PowerResult {
    pub success: bool,
    pub message: String,
    pub details: Option<String>,
}

// ✅ WAKE-ON-LAN: Implementazione completa e robusta
#[command]
pub async fn wake_server(mac_address: String, broadcast_ip: Option<String>) -> Result<PowerResult, String> {
    println!("🔌 Wake-on-LAN per MAC: {}", mac_address);
    
    // Pulisci e valida MAC address
    let clean_mac = mac_address
        .replace(":", "")
        .replace("-", "")
        .replace(" ", "")
        .to_uppercase();
    
    if clean_mac.len() != 12 {
        return Ok(PowerResult {
            success: false,
            message: "MAC address non valido".to_string(),
            details: Some("Il MAC address deve essere nel formato XX:XX:XX:XX:XX:XX".to_string()),
        });
    }
    
    // Converti MAC in bytes
    let mut mac_bytes = Vec::new();
    for i in (0..clean_mac.len()).step_by(2) {
        let byte_str = &clean_mac[i..i+2];
        match u8::from_str_radix(byte_str, 16) {
            Ok(byte) => mac_bytes.push(byte),
            Err(_) => return Ok(PowerResult {
                success: false,
                message: "MAC address formato non valido".to_string(),
                details: Some("Usa solo caratteri esadecimali (0-9, A-F)".to_string()),
            }),
        }
    }
    
    // Crea magic packet: 6 byte FF + 16 ripetizioni del MAC
    let mut magic_packet = vec![0xFF; 6];
    for _ in 0..16 {
        magic_packet.extend_from_slice(&mac_bytes);
    }
    
    // Configura socket UDP
    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(s) => s,
        Err(e) => return Ok(PowerResult {
            success: false,
            message: "Errore configurazione rete".to_string(),
            details: Some(format!("Impossibile creare socket UDP: {}", e)),
        }),
    };
    
    if let Err(e) = socket.set_broadcast(true) {
        return Ok(PowerResult {
            success: false,
            message: "Errore configurazione broadcast".to_string(),
            details: Some(format!("Impossibile abilitare broadcast: {}", e)),
        });
    }
    
    // Invia magic packet su più porte e indirizzi per massima compatibilità
    let targets = vec![
        (broadcast_ip.clone().unwrap_or_else(|| "255.255.255.255".to_string()), 9),
        (broadcast_ip.clone().unwrap_or_else(|| "255.255.255.255".to_string()), 7),
        ("192.168.1.255".to_string(), 9),  // Common local broadcast
        ("192.168.0.255".to_string(), 9),  // Another common range
    ];
    
    let mut success_count = 0;
    let mut errors = Vec::new();
    
    for (target_ip, port) in targets {
        match socket.send_to(&magic_packet, format!("{}:{}", target_ip, port)) {
            Ok(_) => {
                success_count += 1;
                println!("✅ Magic packet inviato a {}:{}", target_ip, port);
            },
            Err(e) => {
                let error_msg = format!("{}:{} - {}", target_ip, port, e);
                errors.push(error_msg);
                println!("⚠️ Errore invio a {}:{}: {}", target_ip, port, e);
            }
        }
    }
    
    if success_count > 0 {
        Ok(PowerResult {
            success: true,
            message: format!("Magic packet inviato con successo ({} tentativi)", success_count),
            details: Some(format!("Server dovrebbe accendersi tra 10-60 secondi. MAC: {}", mac_address)),
        })
    } else {
        Ok(PowerResult {
            success: false,
            message: "Impossibile inviare magic packet".to_string(),
            details: Some(format!("Errori: {}", errors.join(", "))),
        })
    }
}

// ✅ SHUTDOWN: Spegnimento via SSH cross-platform
#[command]
pub async fn shutdown_server(
    ip: String,
    ssh_user: String,
    ssh_port: u16,
    password: Option<String>,
    custom_command: Option<String>,
) -> Result<PowerResult, String> {
    println!("🛑 Spegnimento server: {}@{}:{}", ssh_user, ip, ssh_port);
    
    // Comandi di shutdown per diversi OS
    let shutdown_commands = vec![
        custom_command.unwrap_or_else(|| "sudo shutdown -h now".to_string()),
        "sudo poweroff".to_string(),
        "sudo halt".to_string(),
        "shutdown -s -t 0".to_string(), // Windows
    ];
    
    for (attempt, cmd) in shutdown_commands.iter().enumerate() {
        println!("🔄 Tentativo {}: {}", attempt + 1, cmd);
        
        let result = if let Some(pwd) = &password {
            // Con password usando sshpass (se disponibile)
            execute_ssh_with_password(&ip, &ssh_user, ssh_port, pwd, cmd).await
        } else {
            // Con chiave SSH
            execute_ssh_with_key(&ip, &ssh_user, ssh_port, cmd).await
        };
        
        match result {
            Ok(success_msg) => {
                return Ok(PowerResult {
                    success: true,
                    message: success_msg,
                    details: Some(format!("Comando eseguito: {}", cmd)),
                });
            },
            Err(e) => {
                println!("⚠️ Tentativo {} fallito: {}", attempt + 1, e);
                if attempt == shutdown_commands.len() - 1 {
                    return Ok(PowerResult {
                        success: false,
                        message: "Impossibile spegnere il server".to_string(),
                        details: Some(format!("Ultimo errore: {}", e)),
                    });
                }
            }
        }
    }
    
    Ok(PowerResult {
        success: false,
        message: "Tutti i tentativi di spegnimento sono falliti".to_string(),
        details: None,
    })
}

// ✅ Helper: SSH con password
async fn execute_ssh_with_password(
    ip: &str,
    user: &str,
    port: u16,
    password: &str,
    command: &str,
) -> Result<String, String> {
    // Prova prima sshpass (Linux/Mac)
    let mut cmd = Command::new("sshpass");
    cmd.arg("-p").arg(password)
       .arg("ssh")
       .arg("-o").arg("StrictHostKeyChecking=no")
       .arg("-o").arg("ConnectTimeout=10")
       .arg("-p").arg(port.to_string())
       .arg(format!("{}@{}", user, ip))
       .arg(command)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                Ok("Comando spegnimento eseguito con successo".to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                
                // Se sshpass non è disponibile, prova metodo alternativo
                if stderr.contains("command not found") || stderr.contains("No such file") {
                    return execute_ssh_expect(ip, user, port, password, command).await;
                }
                
                Err(format!("SSH error: {}", stderr))
            }
        },
        Err(_) => {
            // sshpass non disponibile, prova expect
            execute_ssh_expect(ip, user, port, password, command).await
        }
    }
}

// ✅ Helper: SSH con expect (fallback per password)
async fn execute_ssh_expect(
    ip: &str,
    user: &str,
    port: u16,
    password: &str,
    command: &str,
) -> Result<String, String> {
    // Script expect per automazione password
    let expect_script = format!(r#"
spawn ssh -o StrictHostKeyChecking=no -p {} {}@{} "{}"
expect {{
    "password:" {{ send "{}\r"; exp_continue }}
    "Password:" {{ send "{}\r"; exp_continue }}
    eof
}}
"#, port, user, ip, command, password, password);
    
    let mut cmd = Command::new("expect");
    cmd.arg("-c").arg(&expect_script)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                Ok("Comando spegnimento eseguito (expect)".to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Expect error: {}", stderr))
            }
        },
        Err(e) => Err(format!("Expect non disponibile: {}", e)),
    }
}

// ✅ Helper: SSH con chiave
async fn execute_ssh_with_key(
    ip: &str,
    user: &str,
    port: u16,
    command: &str,
) -> Result<String, String> {
    let mut cmd = Command::new("ssh");
    cmd.arg("-o").arg("StrictHostKeyChecking=no")
       .arg("-o").arg("ConnectTimeout=10")
       .arg("-p").arg(port.to_string())
       .arg(format!("{}@{}", user, ip))
       .arg(command)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());
    
    match cmd.output() {
        Ok(output) => {
            if output.status.success() {
                Ok("Comando spegnimento eseguito con chiave SSH".to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("SSH key error: {}", stderr))
            }
        },
        Err(e) => Err(format!("SSH execution error: {}", e)),
    }
}

// ✅ BONUS: Test connettività rete
#[command]
pub async fn test_network_connectivity(target_ip: String) -> Result<PowerResult, String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("ping")
            .args(&["-n", "1", &target_ip])
            .output()
    } else {
        Command::new("ping")
            .args(&["-c", "1", &target_ip])
            .output()
    };
    
    match output {
        Ok(result) => {
            if result.status.success() {
                Ok(PowerResult {
                    success: true,
                    message: "Rete raggiungibile".to_string(),
                    details: Some(format!("Ping a {} riuscito", target_ip)),
                })
            } else {
                Ok(PowerResult {
                    success: false,
                    message: "Rete non raggiungibile".to_string(),
                    details: Some(format!("Ping a {} fallito", target_ip)),
                })
            }
        },
        Err(e) => Ok(PowerResult {
            success: false,
            message: "Errore test rete".to_string(),
            details: Some(format!("Comando ping error: {}", e)),
        }),
    }
}