import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface SystemInfo {
  platform: string;
  arch: string;
  os_version: string;
  chip: string;
  supported: boolean;
  has_homebrew: boolean;
  has_sshpass: boolean;
  ttyd_bundled_path: string;
  ttyd_bundled_ok: boolean;
  homebrew_path?: string;
  needs_setup: boolean;
  ready_for_ssh: boolean;
  setup_message: string;
  mac_model?: string;
}

export interface InstallProgress {
  step: string;
  progress: number;
  isError: boolean;
  details?: string;
}

export function useEnvironmentCheck() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress>({
    step: "Preparazione...",
    progress: 0,
    isError: false,
    details: "",
  });

  // ✅ Check manuale per retry (solo per il pulsante Riprova)
  const checkEnvironment = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("🔍 Manual environment check...");
      const result = await invoke<SystemInfo>("check_system_info");
      console.log("📋 Manual check result:", result);
      setSystemInfo(result);
      
      if (result.ready_for_ssh) {
        setSetupCompleted(true);
      }
    } catch (error) {
      console.error("❌ Errore rilevamento ambiente:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ⚙️ Funzione installazione (solo per uso manuale)
  const installDependencies = useCallback(async () => {
    console.log("🚀 Manual installation start...");
    setIsInstalling(true);
    try {
      await invoke("install_sshpass_for_devpulse");
    } catch (error) {
      console.error("❌ Errore installazione:", error);
      setInstallProgress((prev) => ({
        ...prev,
        step: "Errore installazione",
        isError: true,
        progress: prev.progress || 0,
      }));
      setIsInstalling(false);
    }
  }, []);

  // 📡 Setup iniziale e listener eventi - SOLO UNA VOLTA
  useEffect(() => {
    // ✅ Check iniziale inline
    const initialCheck = async () => {
      setIsLoading(true);
      try {
        console.log("🔍 Initial environment check...");
        const result = await invoke<SystemInfo>("check_system_info");
        console.log("📋 Initial check result:", result);
        setSystemInfo(result);
        
        if (result.ready_for_ssh) {
          setSetupCompleted(true);
        }
      } catch (error) {
        console.error("❌ Errore check iniziale:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialCheck();

    // ✅ Listener per eventi installazione
    let unlisten: () => void;

    listen<InstallProgress>("install_progress", (event) => {
      const { step, progress, isError, details } = event.payload;
      console.log(`📊 Install progress: ${step} (${progress}%)`);
      
      setInstallProgress({
        step,
        progress,
        isError,
        details: details ?? "",
      });
    }).then((unsub) => {
      unlisten = unsub;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []); // ✅ Solo una volta

  // ✅ Quando installazione completata al 100%
  useEffect(() => {
    if (installProgress.progress === 100 && !installProgress.isError) {
      console.log("✅ Installation completed! Running final check...");
      
      setIsInstalling(false);

      // Check finale
      setTimeout(async () => {
        try {
          const finalCheck = await invoke<SystemInfo>("check_system_info");
          console.log("🔍 Final check result:", finalCheck);
          setSystemInfo(finalCheck);
          
          if (finalCheck.ready_for_ssh) {
            console.log("🎉 DevPulse is ready!");
            setSetupCompleted(true);
            setInstallProgress(prev => ({
              ...prev,
              step: "🎉 DevPulse è pronta per l'uso!",
              progress: 100,
              isError: false
            }));
          }
        } catch (error) {
          console.error("❌ Final check failed:", error);
          setInstallProgress(prev => ({
            ...prev,
            step: "Errore verifica finale",
            isError: true
          }));
        }
      }, 1000);
    }
  }, [installProgress.progress, installProgress.isError]);

  // ✅ Auto-start installazione solo quando necessario
  useEffect(() => {
    if (!isLoading && systemInfo && systemInfo.needs_setup && !isInstalling && !installProgress.isError && !setupCompleted) {
      console.log("🔧 Auto-starting installation...");
      setIsInstalling(true);
      
      // Avvia installazione
      invoke("install_sshpass_for_devpulse").catch(error => {
        console.error("❌ Auto-install failed:", error);
        setInstallProgress(prev => ({
          ...prev,
          step: "Errore installazione automatica",
          isError: true,
        }));
        setIsInstalling(false);
      });
    }
  }, [isLoading, systemInfo, isInstalling, installProgress.isError, setupCompleted]);

  return {
    isLoading,
    isInstalling,
    installProgress,
    systemInfo,
    checkEnvironment, // Per il pulsante "Riprova"
    installDependencies, // Per uso manuale (se serve)
    isReady: systemInfo?.ready_for_ssh === true && setupCompleted,
    needsSetup: systemInfo?.needs_setup === true && !setupCompleted,
  };
}