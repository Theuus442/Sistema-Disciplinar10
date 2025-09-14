import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function errorMessage(e: any): string {
  if (!e) return "Erro inesperado";
  if (typeof e === "string") return e;
  // Native Error
  if (e instanceof Error && typeof e.message === "string") return e.message;
  // Supabase/Postgrest error shapes
  if (e?.message && typeof e.message === "string") {
    const details = typeof e.details === "string" ? ` — ${e.details}` : "";
    const hint = typeof e.hint === "string" ? ` — ${e.hint}` : "";
    return `${e.message}${details}${hint}`.trim();
  }
  if (typeof e?.error === "string") return e.error;
  if (typeof e?.error_description === "string") return e.error_description;
  if (typeof e?.data?.message === "string") return e.data.message;
  // Fetch Response-like
  if (typeof e?.status === "number" && typeof e?.statusText === "string") return `${e.status} ${e.statusText}`;
  try {
    const s = JSON.stringify(e);
    // Fallback to toString only if JSON is useless
    return s && s !== "{}" ? s : String(e);
  } catch {
    return String(e);
  }
}
