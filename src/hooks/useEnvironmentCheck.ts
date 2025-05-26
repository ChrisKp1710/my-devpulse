// hooks/useEnvironmentCheck.ts
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
  const [installProgress, setInstallProgress] = useState<InstallProgress>({
    step: "Preparazione...",
    progress: 0,
    isError: false,
    details: "",
  });

  const checkEnvironment = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await invoke<SystemInfo>("check_system_info");
      setSystemInfo(result);
    } catch (err) {
      console.error("Errore rilevamento ambiente:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const installDependencies = useCallback(async () => {
    setIsInstalling(true);
    try {
      await invoke("install_sshpass_for_devpulse");
    } catch (err) {
      console.error("Errore installazione dipendenze:", err);
      setInstallProgress((prev) => ({
        ...prev,
        step: "Errore installazione",
        isError: true,
      }));
    }
  }, []);

  useEffect(() => {
    checkEnvironment();

    let unlisten: () => void;

    listen<InstallProgress>("install_progress", (event) => {
      const data = event.payload;
      setInstallProgress({
        step: data.step,
        progress: data.progress,
        isError: data.isError,
        details: data.details || "",
      });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [checkEnvironment]);

  return {
    isLoading,
    isInstalling,
    systemInfo,
    installProgress,
    checkEnvironment,
    installDependencies,
    isReady: systemInfo?.ready_for_ssh === true,
    needsSetup: systemInfo?.needs_setup === true,
  };
}