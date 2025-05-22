// src/utils/isTauri.ts

export async function isTauri(): Promise<boolean> {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return typeof invoke === "function";
    } catch {
      return false;
    }
  }