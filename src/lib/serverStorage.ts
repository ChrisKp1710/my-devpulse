// src/lib/serverStorage.ts
import type { Server } from "@/context/ServerContext.types";
import { isTauri } from "@/lib/utils";

// 💾 Salva i server (solo in Tauri)
export const saveServers = async (servers: Server[]) => {
  if (!isTauri()) {
    console.warn("⚠️ Tauri non rilevato: salvataggio disattivato.");
    return;
  }

  try {
    const { saveServers } = await import("./serverStorage.tauri");
    return saveServers(servers);
  } catch (error) {
    console.error("❌ Errore import dinamico saveServers:", error);
  }
};

// 📂 Carica i server (solo in Tauri)
export const loadServers = async (): Promise<Server[]> => {
  if (!isTauri()) {
    console.warn("⚠️ Tauri non rilevato: caricamento disattivato.");
    return [];
  }

  try {
    const { loadServers } = await import("./serverStorage.tauri");
    return await loadServers();
  } catch (error) {
    console.error("❌ Errore import dinamico loadServers:", error);
    return [];
  }
};