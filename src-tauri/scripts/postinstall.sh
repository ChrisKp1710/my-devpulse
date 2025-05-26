#!/bin/bash
# Script di post-installazione per DevPulse  
# Eseguito DOPO che l'app è stata copiata in /Applications

set -e

echo "🚀 DevPulse Post-Installation Setup..."

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

install_homebrew() {
    local user="$1"
    local home_dir=$(eval echo "~$user")
    
    echo "📦 Installazione Homebrew per $user..."
    
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
}

install_sshpass() {
    local brew_cmd="$1"
    local user="$2"
    
    echo "🔐 Installazione sshpass..."
    
    sudo -u "$user" "$brew_cmd" tap esolitos/ipa || {
        echo "⚠️  Errore tap repository, provo installazione diretta..."
    }
    
    sudo -u "$user" "$brew_cmd" install esolitos/ipa/sshpass || {
        echo "❌ Errore installazione sshpass"
        return 1
    }
    
    echo "✅ sshpass installato"
}

# === PROCESSO DI SETUP ===

echo "🔍 Rilevamento sistema..."
ARCH=$(detect_arch)
CURRENT_USER=$(get_user)
echo "   Architettura: $ARCH"
echo "   Utente: $CURRENT_USER"

# 1. Verifica Homebrew
echo ""
echo "📋 Verifica Homebrew..."
if BREW_PATH=$(check_homebrew "$CURRENT_USER"); then
    echo "✅ Homebrew trovato: $BREW_PATH"
else
    echo "⚠️  Homebrew non trovato - installazione necessaria"
    if install_homebrew "$CURRENT_USER"; then
        sleep 2
        if BREW_PATH=$(check_homebrew "$CURRENT_USER"); then
            echo "✅ Homebrew installato: $BREW_PATH"
        else
            echo "❌ Homebrew non disponibile dopo l'installazione"
            exit 1
        fi
    else
        echo "❌ Errore installazione Homebrew"
        exit 1
    fi
fi

# 2. Verifica/Installa sshpass
echo ""
echo "🔐 Setup sshpass..."
if sudo -u "$CURRENT_USER" command -v sshpass >/dev/null 2>&1; then
    echo "✅ sshpass già disponibile"
else
    echo "⚠️  sshpass non trovato - installazione..."
    if install_sshpass "$BREW_PATH" "$CURRENT_USER"; then
        echo "✅ sshpass installato correttamente"
    else
        echo "❌ Errore installazione sshpass"
        exit 1
    fi
fi

# 3. Verifica finale
echo ""
echo "🔍 Verifica finale setup..."

if sudo -u "$CURRENT_USER" bash -c "source ~/.zprofile 2>/dev/null || true; command -v sshpass" >/dev/null 2>&1; then
    echo "✅ sshpass: OK"
else
    echo "❌ sshpass non accessibile"
    exit 1
fi

if [[ -x "/Applications/my-devpulse.app/Contents/Resources/bin/ttyd" ]]; then
    echo "✅ ttyd bundled: OK"
else
    echo "⚠️  ttyd bundled non trovato (sarà disponibile al primo avvio)"
fi

# 4. Configura permessi applicazione
echo ""
echo "🔧 Configurazione DevPulse..."
chmod +x /Applications/my-devpulse.app/Contents/MacOS/* 2>/dev/null || true

# Rimuovi quarantena se presente
xattr -dr com.apple.quarantine /Applications/my-devpulse.app 2>/dev/null || true

echo ""
echo "🎉 INSTALLAZIONE COMPLETATA!"
echo "=========================================="
echo "✅ DevPulse installato in /Applications"
echo "✅ Homebrew configurato"
echo "✅ sshpass pronto per SSH con password"
echo "✅ ttyd bundled per terminale integrato"
echo ""
echo "🚀 DevPulse è pronto per l'uso!"
echo "   Puoi trovarlo nel Launchpad o in /Applications"
echo ""

exit 0