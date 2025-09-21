import { useEffect, useMemo, useState } from "react";
import { authHeaders } from "@/lib/api";

interface LoginItem {
  id: string;
  nome: string;
  email: string;
  lastSignInAt: string | null;
}

function formatRelativo(dateIso: string | null) {
  if (!dateIso) return "–";
  const d = new Date(dateIso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (sec < 60) return `Há ${sec}s`;
  if (min < 60) return `Há ${min} min`;
  if (hrs < 24) return `Há ${hrs} h`;
  return `Há ${days} d`;
}

export default function UltimosLogins() {
  const [items, setItems] = useState<LoginItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/logins", { headers: await authHeaders() });
        if (res.status === 401) { window.location.assign('/'); return; }
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as LoginItem[];
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const list = useMemo(() => items.slice(0, 5), [items]);

  return (
    <div className="min-h-[298px] w-full max-w-[363px] rounded-[10px] bg-white p-6 shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
      <div className="mb-6">
        <h3 className="font-roboto text-lg font-bold text-sis-dark-text">Últimos Logins</h3>
      </div>

      <div className="mb-6 space-y-4">
        {list.map((login) => (
          <div key={login.id + String(login.lastSignInAt)} className="flex items-center justify-between gap-3">
            <span className="font-roboto text-base text-sis-dark-text truncate" title={login.email || login.nome}>
              {login.nome || login.email || login.id}
            </span>
            <span className="font-roboto text-sm text-sis-secondary-text whitespace-nowrap">
              {formatRelativo(login.lastSignInAt)}
            </span>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-sm text-sis-secondary-text">Sem logins recentes.</div>
        )}
      </div>

      <div className="flex items-center space-x-5">
        <button className="flex items-center space-x-2 text-sis-blue hover:underline">
          <span className="font-roboto text-sm font-medium">Ver Todos</span>
          <svg className="h-4 w-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.69 7.33002C13.0601 7.33002 13.36 7.62998 13.36 8.00002C13.36 8.37006 13.0601 8.67002 12.69 8.67002L3.31001 8.67002C2.93999 8.67002 2.64001 8.37006 2.64001 8.00002C2.64001 7.62998 2.93999 7.33002 3.31001 7.33002L12.69 7.33002Z" fill="currentColor"/>
            <path d="M7.51129 2.8363C7.75658 2.591 8.14451 2.57586 8.40768 2.7905L8.45874 2.8363L13.1487 7.52632C13.4104 7.78796 13.4104 8.21207 13.1487 8.4737L8.45874 13.1637C8.1971 13.4254 7.77292 13.4254 7.51129 13.1637C7.24965 12.9021 7.24965 12.478 7.51129 12.2163L11.7276 8.00001L7.51129 3.78372L7.46553 3.73269C7.25086 3.46953 7.266 3.0816 7.51129 2.8363Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
