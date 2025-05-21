// src/lib/serverStorage.tauri.ts
import { appDataDir } from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/api/fs";
import type { Server } from "@/context/ServerContext.types";

const FILE_NAME = "servers.json";

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