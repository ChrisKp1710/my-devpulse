#!/bin/bash
# Script di post-installazione per DevPulse  
# Eseguito DOPO che l'app è stata copiata in /Applications

set -e

echo "🚀 DevPulse Post-Installation Setup..."
echo "==============================================="

# Funzioni helper
detect_arch() {
    case $(uname -m) in
        arm64|aarch64) echo "arm64" ;;
        *) echo "x64" ;;
    esac
}

get_user() {
    if [[ -n "$USER" ]]; then
        echo "$USER"
    elif [[ -n "$SUDO_USER" ]]; then
        echo "$SUDO_USER"
    else
        echo $(ls -l /dev/console | awk '{print $3}')
    fi
}

check_homebrew() {
    local user="$1"
    local home_dir=$(eval echo "~$user")
    
    local brew_paths=(
        "/opt/homebrew/bin/brew"     # Apple Silicon
        "/usr/local/bin/brew"        # Intel
        "$home_dir/.homebrew/bin/brew"
    )
    
    for brew_path in "${brew_paths[@]}"; do
        if [[ -x "$brew_path" ]]; then
            echo "$brew_path"
            return 0
        fi
    done
    
    return 1
}

show_installation_dialog() {
    osascript << 'EOF'
tell application "System Events"
    display dialog "DevPulse Setup

Per funzionare correttamente, DevPulse ha bisogno di:
• Homebrew (per gestire dipendenze)
• sshpass (per connessioni SSH con password)

Questi strumenti verranno installati automaticamente.
L'installazione potrebbe richiedere alcuni minuti.

Vuoi continuare?" buttons {"Annulla", "Continua"} default button "Continua" with icon note with title "DevPulse Setup"
    if button returned of result is "Annulla" then
        error "Installazione annullata dall'utente"
    end if
end tell
EOF
}

show_progress_dialog() {
    local message="$1"
    osascript << EOF
tell application "System Events"
    display notification "$message" with title "DevPulse Setup" subtitle "Installazione in corso..."
end tell
EOF
}

show_status_dialog() {
    local homebrew_status="$1"
    local sshpass_status="$2"
    
    osascript << EOF
tell application "System Events"
    display dialog "DevPulse - Stato Dipendenze

🍺 Homebrew: $homebrew_status
🔐 sshpass: $sshpass_status

Cosa vuoi fare?" buttons {"Esci", "Continua Setup"} default button "Continua Setup" with icon note with title "DevPulse Status Check"
    if button returned of result is "Esci" then
        error "Setup annullato dall'utente"
    end if
end tell
EOF
}

install_homebrew() {
    local user="$1"
    local home_dir=$(eval echo "~$user")
    
    echo "📦 Installazione Homebrew per $user..."
    show_progress_dialog "Installazione Homebrew in corso..."
    
    sudo -u "$user" /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
        echo "❌ Errore installazione Homebrew"
        return 1
    }
    
    # Configura PATH per Apple Silicon
    if [[ $(detect_arch) == "arm64" ]]; then
        sudo -u "$user" bash -c "echo 'eval \"\$(/opt/homebrew/bin/brew shellenv)\"' >> $home_dir/.zprofile"
        sudo -u "$user" bash -c "echo 'eval \"\$(/opt/homebrew/bin/brew shellenv)\"' >> $home_dir/.zshrc"
        sudo -u "$user" bash -c "echo 'eval \"\$(/opt/homebrew/bin/brew shellenv)\"' >> $home_dir/.bash_profile"
    fi
    
    echo "✅ Homebrew installato"
    show_progress_dialog "✅ Homebrew installato con successo"
}

install_sshpass() {
    local brew_cmd="$1"
    local user="$2"
    
    echo "🔐 Installazione sshpass..."
    show_progress_dialog "Installazione sshpass in corso..."
    
    sudo -u "$user" "$brew_cmd" tap esolitos/ipa || {
        echo "⚠️  Errore tap repository, provo installazione diretta..."
    }
    
    sudo -u "$user" "$brew_cmd" install esolitos/ipa/sshpass || {
        echo "❌ Errore installazione sshpass"
        return 1
    }
    
    echo "✅ sshpass installato"
    show_progress_dialog "✅ sshpass installato con successo"
}

# === PROCESSO DI SETUP ===

echo "🔍 Rilevamento sistema..."
ARCH=$(detect_arch)
CURRENT_USER=$(get_user)
echo "   Architettura: $ARCH"
echo "   Utente: $CURRENT_USER"

# 1. Check dello stato attuale
echo ""
echo "📋 Verifica stato dipendenze..."

# Check Homebrew
if BREW_PATH=$(check_homebrew "$CURRENT_USER"); then
    HOMEBREW_STATUS="✅ Installato ($BREW_PATH)"
    HAS_HOMEBREW=true
else
    HOMEBREW_STATUS="❌ Non trovato"
    HAS_HOMEBREW=false
fi

# Check sshpass
if sudo -u "$CURRENT_USER" command -v sshpass >/dev/null 2>&1; then
    SSHPASS_STATUS="✅ Installato"
    HAS_SSHPASS=true
else
    SSHPASS_STATUS="❌ Non trovato"
    HAS_SSHPASS=false
fi

# 2. Mostra stato e chiedi conferma
echo "🍺 Homebrew: $HOMEBREW_STATUS"
echo "🔐 sshpass: $SSHPASS_STATUS"

# Se tutto è già installato, finisci qui
if [[ "$HAS_HOMEBREW" == true && "$HAS_SSHPASS" == true ]]; then
    echo ""
    echo "🎉 TUTTO GIÀ PRONTO!"
    echo "✅ DevPulse è configurato correttamente"
    
    osascript << 'EOF'
tell application "System Events"
    display notification "DevPulse è pronto per l'uso!" with title "✅ Setup Completato" subtitle "Tutte le dipendenze sono già installate"
end tell
EOF
    
    exit 0
fi

# Altrimenti mostra dialog di conferma
show_status_dialog "$HOMEBREW_STATUS" "$SSHPASS_STATUS"

# 3. Installa quello che manca
if [[ "$HAS_HOMEBREW" == false ]]; then
    echo ""
    echo "📦 Installazione Homebrew necessaria..."
    if install_homebrew "$CURRENT_USER"; then
        sleep 2
        if BREW_PATH=$(check_homebrew "$CURRENT_USER"); then
            echo "✅ Homebrew installato: $BREW_PATH"
            HAS_HOMEBREW=true
        else
            echo "❌ Homebrew non disponibile dopo l'installazione"
            exit 1
        fi
    else
        echo "❌ Errore installazione Homebrew"
        exit 1
    fi
fi

if [[ "$HAS_SSHPASS" == false ]]; then
    echo ""
    echo "🔐 Installazione sshpass necessaria..."
    if install_sshpass "$BREW_PATH" "$CURRENT_USER"; then
        echo "✅ sshpass installato correttamente"
        HAS_SSHPASS=true
    else
        echo "❌ Errore installazione sshpass"
        exit 1
    fi
fi

# 4. Verifica finale
echo ""
echo "🔍 Verifica finale setup..."

if sudo -u "$CURRENT_USER" bash -c "source ~/.zprofile 2>/dev/null || true; command -v sshpass" >/dev/null 2>&1; then
    echo "✅ sshpass: OK"
else
    echo "❌ sshpass non accessibile"
    exit 1
fi

if [[ -x "/Applications/DevPulse.app/Contents/Resources/bin/ttyd" ]]; then
    echo "✅ ttyd bundled: OK"
else
    echo "⚠️  ttyd bundled non trovato (sarà disponibile al primo avvio)"
fi

# 5. Configura permessi applicazione
echo ""
echo "🔧 Configurazione DevPulse..."
chmod +x /Applications/DevPulse.app/Contents/MacOS/* 2>/dev/null || true

# Rimuovi quarantena se presente
xattr -dr com.apple.quarantine /Applications/DevPulse.app 2>/dev/null || true

echo ""
echo "🎉 INSTALLAZIONE COMPLETATA!"
echo "=========================================="
echo "✅ DevPulse installato in /Applications"
echo "✅ Homebrew configurato"
echo "✅ sshpass pronto per SSH con password"
echo "✅ ttyd bundled per terminale integrato"
echo ""

# Notifica finale di successo
osascript << 'EOF'
tell application "System Events"
    display notification "DevPulse è stato installato con successo e è pronto per l'uso!" with title "🎉 Installazione Completata" subtitle "Puoi trovare l'app nel Launchpad"
end tell
EOF

exit 0