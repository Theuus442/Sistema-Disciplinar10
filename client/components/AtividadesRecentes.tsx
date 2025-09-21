import { useEffect, useMemo, useState } from "react";
import { authHeaders } from "@/lib/api";

interface ActivityItem {
  id: string;
  descricao: string;
  at: string;
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

export default function AtividadesRecentes() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/activities", { headers: await authHeaders() });
        if (res.status === 401) { if (mounted) setItems([]); return; }
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as ActivityItem[];
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
    <div className="min-h-[330px] w-full max-w-[363px] rounded-[10px] bg-white p-6 shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)]">
      <div className="mb-6">
        <h3 className="font-roboto text-lg font-bold text-sis-dark-text">Atividades Recentes</h3>
      </div>

      <div className="mb-6 space-y-6">
        {list.map((a) => (
          <div key={a.id + a.at} className="space-y-1">
            <div className="font-roboto text-sm text-sis-dark-text">{a.descricao}</div>
            <div className="font-roboto text-xs text-sis-secondary-text">{formatRelativo(a.at)}</div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-sm text-sis-secondary-text">Sem atividades recentes.</div>
        )}
      </div>

      <div className="flex items-center space-x-5">
        <button className="flex items-center space-x-2 text-sis-blue hover:underline">
          <span className="font-roboto text-sm font-medium">Ver Todas</span>
          <svg className="h-4 w-4" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.69 7.33C13.0601 7.33 13.36 7.62996 13.36 8C13.36 8.37004 13.0601 8.67 12.69 8.67L3.31001 8.67C2.93999 8.67 2.64001 8.37004 2.64001 8C2.64001 7.62996 2.93999 7.33 3.31001 7.33L12.69 7.33Z" fill="currentColor"/>
            <path d="M7.51132 2.83629C7.75661 2.59099 8.14454 2.57585 8.40771 2.79049L8.45877 2.83629L13.1488 7.52631C13.4104 7.78795 13.4104 8.21206 13.1488 8.47369L8.45877 13.1637C8.19713 13.4254 7.77296 13.4254 7.51132 13.1637C7.24969 12.9021 7.24969 12.4779 7.51132 12.2163L11.7276 8L7.51132 3.78371L7.46556 3.73268C7.25089 3.46952 7.26603 3.08159 7.51132 2.83629Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
