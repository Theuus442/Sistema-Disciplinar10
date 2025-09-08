import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function errorMessage(e: any): string {
  if (!e) return "Erro inesperado";
  if (typeof e === "string") return e;
  if (e?.message && typeof e.message === "string") return e.message;
  if (e?.error && typeof e.error === "string") return e.error;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
