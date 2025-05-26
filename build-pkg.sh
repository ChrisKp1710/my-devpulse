#!/bin/bash
# build-pkg.sh - Script per creare PKG installer DevPulse
# Posiziona questo file nella ROOT del progetto (stesso livello di package.json)
# Esegui questo script DOPO aver fatto il build con tauri

set -e

echo "🛠️  Creazione PKG installer per DevPulse..."

# Variabili
APP_NAME="DevPulse"
APP_VERSION="1.0.0"
APP_BUNDLE="DevPulse.app"
PKG_NAME="DevPulse-Installer-v${APP_VERSION}"
BUILD_DIR="./pkg-build"
SCRIPTS_DIR="$BUILD_DIR/scripts"
PAYLOAD_DIR="$BUILD_DIR/payload"
TAURI_BUILD_DIR="src-tauri/target/release/bundle/macos"

# Verifica che l'app sia stata compilata
if [[ ! -d "$TAURI_BUILD_DIR/$APP_BUNDLE" ]]; then
    echo "❌ App non trovata in $TAURI_BUILD_DIR/$APP_BUNDLE"
    echo "   Esegui prima: npm run tauri build"
    echo "   Oppure: npm run tauri:build"
    exit 1
fi

# Verifica che gli script PKG esistano
if [[ ! -f "src-tauri/scripts/preinstall.sh" ]] || [[ ! -f "src-tauri/scripts/postinstall.sh" ]]; then
    echo "❌ Script PKG mancanti!"
    echo "   Assicurati che esistano:"
    echo "   - src-tauri/scripts/preinstall.sh"
    echo "   - src-tauri/scripts/postinstall.sh"
    exit 1
fi

# Pulisci e crea directory di build
echo "🧹 Preparazione directory di build..."
rm -rf "$BUILD_DIR"
mkdir -p "$SCRIPTS_DIR"
mkdir -p "$PAYLOAD_DIR"

# 1. Copia l'app nel payload
echo "📦 Preparazione payload..."
cp -R "$TAURI_BUILD_DIR/$APP_BUNDLE" "$PAYLOAD_DIR/"

# Verifica che la copia sia andata a buon fine
if [[ ! -d "$PAYLOAD_DIR/$APP_BUNDLE" ]]; then
    echo "❌ Errore nella copia dell'app"
    exit 1
fi

# 2. Copia gli script PKG
echo "📝 Copia script di installazione..."
cp "src-tauri/scripts/preinstall.sh" "$SCRIPTS_DIR/preinstall"
cp "src-tauri/scripts/postinstall.sh" "$SCRIPTS_DIR/postinstall"

# 3. Rendi eseguibili gli script
chmod +x "$SCRIPTS_DIR/preinstall"
chmod +x "$SCRIPTS_DIR/postinstall"

# 4. Verifica che pkgbuild sia disponibile
if ! command -v pkgbuild &> /dev/null; then
    echo "❌ pkgbuild non trovato"
    echo "   Assicurati di essere su macOS con Xcode Command Line Tools installati"
    exit 1
fi

# 5. Crea il PKG
echo "📦 Creazione PKG..."
pkgbuild \
    --root "$PAYLOAD_DIR" \
    --scripts "$SCRIPTS_DIR" \
    --identifier "com.koscielniakpinto.devpulse" \
    --version "$APP_VERSION" \
    --install-location "/Applications" \
    "$PKG_NAME.pkg"

# Verifica che il PKG sia stato creato
if [[ ! -f "$PKG_NAME.pkg" ]]; then
    echo "❌ Errore nella creazione del PKG"
    exit 1
fi

# 6. Pulizia directory temporanea
echo "🧹 Pulizia..."
rm -rf "$BUILD_DIR"

echo ""
echo "🎉 PKG Installer creato con successo!"
echo "================================================"
echo "✅ File: $PKG_NAME.pkg"
echo "✅ Dimensione: $(du -h "$PKG_NAME.pkg" | cut -f1)"
echo "✅ Posizione: $(pwd)/$PKG_NAME.pkg"
echo ""
echo "📋 L'installer include:"
echo "   • DevPulse.app → /Applications"
echo "   • Setup automatico Homebrew"
echo "   • Installazione automatica sshpass"
echo "   • Configurazione permessi e quarantena"
echo "   • Verifica sistema macOS"
echo ""
echo "🚀 Come distribuire:"
echo "   1. Condividi il file $PKG_NAME.pkg"
echo "   2. Gli utenti faranno doppio clic"
echo "   3. Seguiranno la procedura guidata"
echo "   4. DevPulse sarà pronto con SSH funzionante!"
echo ""
echo "⚠️  Nota: Durante l'installazione potrebbe essere richiesta"
echo "   la password amministratore per installare Homebrew e sshpass"
echo ""