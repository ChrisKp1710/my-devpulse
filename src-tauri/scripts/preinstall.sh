#!/bin/bash
# Script di pre-installazione per DevPulse
# Eseguito PRIMA dell'installazione

echo "🔍 DevPulse Pre-Installation Check..."

# Verifica macOS
if [[ $(uname -s) != "Darwin" ]]; then
    echo "❌ Questo installer è solo per macOS"
    exit 1
fi

# Verifica versione macOS (minimo 10.15)
if ! sw_vers -productVersion | grep -E "1[1-9]\.|[2-9][0-9]\." >/dev/null; then
    echo "❌ macOS 10.15 o superiore richiesto"
    exit 1
fi

# Rimuovi versione precedente se presente
if [[ -d "/Applications/my-devpulse.app" ]]; then
    echo "🗑️  Rimozione versione precedente..."
    rm -rf "/Applications/my-devpulse.app"
fi

echo "✅ Pre-check completato"
exit 0