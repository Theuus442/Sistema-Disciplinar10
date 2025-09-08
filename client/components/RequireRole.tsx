import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { PerfilUsuario } from "@/lib/api";

function roleHomePath(role?: string) {
  const r = role?.toLowerCase?.();
  if (r === "administrador") return "/administrador";
  if (r === "gestor") return "/gestor";
  if (r === "juridico") return "/juridico";
  return "/";
}

async function resolveCurrentRole(): Promise<PerfilUsuario | undefined> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return undefined;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, perfil")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.perfil) return profile.perfil as PerfilUsuario;
  const meta = (user as any)?.user_metadata;
  const metaRole = (meta?.perfil || meta?.role) as string | undefined;
  return (metaRole as PerfilUsuario) || undefined;
}

export default function RequireRole({ allowed, children }: { allowed: PerfilUsuario[]; children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "allow" | "deny">("loading");
  const [redirectTo, setRedirectTo] = useState<string>("/");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const role = await resolveCurrentRole();
      const ok = !!role && allowed.map((r) => r.toLowerCase()).includes(role.toLowerCase());
      if (!mounted) return;
      if (ok) {
        setStatus("allow");
      } else {
        setRedirectTo(roleHomePath(role));
        setStatus("deny");
      }
    })();
    return () => { mounted = false; };
  }, [allowed]);

  if (status === "loading") return null;
  if (status === "deny") return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}
