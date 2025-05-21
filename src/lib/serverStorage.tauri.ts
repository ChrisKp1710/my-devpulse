// src/lib/serverStorage.tauri.ts
import { appDataDir } from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api/core"; // ✅ v2.x
import type { Server } from "@/context/ServerContext.types";

const FILE_NAME = "servers.json";

// 🔄 Accesso diretto al file system
export const saveServers = async (servers: Server[]) => {
  const dir = await appDataDir();
  const filePath = `${dir}${FILE_NAME}`;

  const dirExists = await fs.exists(dir);
  if (!dirExists) {
    await fs.createDir(dir, { recursive: true });
  }

  await fs.writeTextFile(filePath, JSON.stringify(servers, null, 2));
};

export const loadServers = async (): Promise<Server[]> => {
  const dir = await appDataDir();
  const filePath = `${dir}${FILE_NAME}`;

  try {
    const content = await fs.readTextFile(filePath);
    return JSON.parse(content) as Server[];
  } catch {
    return [];
  }
};

// 🧩 Variante: salva via backend Rust (command "save_server")
export const saveServerTauri = async (server: Server) => {
  try {
    await invoke("save_server", { server });
    console.log("✅ Server salvato via Tauri backend");
  } catch (error) {
    console.error("❌ Errore Tauri (Rust) nel salvataggio:", error);
  }
};