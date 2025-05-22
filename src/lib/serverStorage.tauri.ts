// src/lib/serverStorage.tauri.ts
import { appDataDir } from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/api/fs";
import type { Server } from "@/context/ServerContext.types";

const FILE_NAME = "servers.json";

export const saveServers = async (servers: Server[]) => {
  try {
    let dir = await appDataDir();
    dir = dir.replace(/\/+$/, ""); // 🔧 Rimuove slash finale se presente
    const filePath = `${dir}/${FILE_NAME}`;

    console.log("📁 Percorso appDataDir:", dir);
    console.log("💾 Scrivo in:", filePath);   

    const dirExists = await fs.exists(dir);
    if (!dirExists) {
      console.log("📁 Creo cartella:", dir);
      await fs.createDir(dir, { recursive: true });
    }

    await fs.writeTextFile(filePath, JSON.stringify(servers, null, 2));
    console.log("✅ Server salvati:", filePath);
  } catch (err) {
    console.error("❌ Errore nel salvataggio su file:", err);
  }
};

export const loadServers = async (): Promise<Server[]> => {
  try {
    let dir = await appDataDir();
    dir = dir.replace(/\/+$/, "");
    const filePath = `${dir}/${FILE_NAME}`;

    const exists = await fs.exists(filePath);
    if (!exists) {
      console.warn("⚠️ File JSON non trovato:", filePath);
      return [];
    }

    const content = await fs.readTextFile(filePath);
    const parsed = JSON.parse(content) as Server[];
    console.log("📦 Server caricati da JSON:", parsed);
    return parsed;
  } catch (err) {
    console.warn("⚠️ Errore durante il caricamento:", err);
    return [];
  }
};