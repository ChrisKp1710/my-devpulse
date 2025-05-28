// src/lib/serverStorage.ts
import type { Server } from "@/context/ServerContext.types";
import { invoke } from "@tauri-apps/api/core";

// 📂 Carica i server da Tauri
export const loadServers = async (): Promise<Server[]> => {
  try {
    const servers = await invoke<Server[]>("load_servers");
    console.log("📂 Server caricati:", servers);
    return servers || [];
  } catch (error) {
    console.error("❌ Errore caricamento server:", error);
    return [];
  }
};

// 💾 Salva un singolo server
export const saveServer = async (server: Server): Promise<void> => {
  try {
    const rustServer = {
      id: server.id,
      name: server.name,
      ip: server.ip,
      sshUser: server.sshUser,
      sshPort: server.sshPort,
      authMethod: server.authMethod,
      password: server.password || null,
      sshKeyPath: server.sshKeyPath || null,
      sshKey: server.sshKey,
      serverType: server.type,
      status: server.status,
      macAddress: server.macAddress || null,
      wolEnabled: server.wolEnabled || false,
      shutdownCommand: server.shutdownCommand || null,
    };

    await invoke("save_server", { server: rustServer });
    console.log("✅ Server salvato:", server.name);
  } catch (error) {
    console.error("❌ Errore salvataggio server:", error);
    throw error;
  }
};

// 🗑️ Elimina un server per ID
export const deleteServerById = async (id: string): Promise<void> => {
  try {
    await invoke("delete_server", { id });
    console.log("🗑️ Server eliminato:", id);
  } catch (error) {
    console.error("❌ Errore eliminazione server:", error);
    throw error;
  }
};

// Per compatibilità (deprecata)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const saveServers = async (_servers: Server[]): Promise<void> => {
  console.warn("⚠️ saveServers è deprecata");
};