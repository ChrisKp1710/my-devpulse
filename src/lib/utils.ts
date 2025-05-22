// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ✅ Utility classi Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ Check se siamo in ambiente Tauri
export function isTauri(): boolean {
  return "__TAURI_IPC__" in window;
}