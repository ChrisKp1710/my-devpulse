// src/lib/serverStorage.tauri.ts
import { appDataDir } from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/core"; // ✅ Tauri v2
import type { Server } from "@/context/ServerContext.types";

const FILE_NAME = "servers.json";

// 🔄 Accesso diretto al file system (modalità locale)
export const saveServers = async (servers: Server[]) => {
  try {
    const dir = await appDataDir();
    const filePath = `${dir}${FILE_NAME}`;
    console.log("💾 Percorso salvataggio:", filePath);

    const dirExists = await fs.exists(dir);
    if (!dirExists) {
      console.log("📁 Cartella non trovata, la creo:", dir);
      await fs.createDir(dir, { recursive: true });
    }

    await fs.writeTextFile(filePath, JSON.stringify(servers, null, 2));
    console.log("✅ Server salvati nel file:", servers);
  } catch (err) {
    console.error("❌ Errore nel salvataggio su file:", err);
  }
};

// 🔄 Caricamento server dal file JSON
export const loadServers = async (): Promise<Server[]> => {
  try {
    const dir = await appDataDir();
    const filePath = `${dir}${FILE_NAME}`;
    console.log("📂 Percorso caricamento:", filePath);

    const content = await fs.readTextFile(filePath);
    const parsed = JSON.parse(content) as Server[];
    console.log("📦 Server caricati da JSON:", parsed);
    return parsed;
  } catch (err) {
    console.warn("⚠️ Nessun file trovato o errore di parsing:", err);
    return [];
  }
};

// 🧩 Variante via backend Rust (solo se usi invoke("save_server"))
export const saveServerTauri = async (server: Server) => {
  try {
    await invoke("save_server", { server });
    console.log("✅ Server salvato via backend Tauri (Rust):", server);
  } catch (error) {
    console.error("❌ Errore Tauri (Rust) nel salvataggio:", error);
  }
};