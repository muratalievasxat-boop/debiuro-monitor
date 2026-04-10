import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const STATUSES = ["Все статусы", "Исполнено", "В работе", "Не поддерживается", "Отсутствует позиция", "Не указано"];
const CYCLES = ["Все циклы", "I", "II", "III", "IV", "V", "VI", "VII"];

const STATUS_COLORS: Record<string, string> = {
  "Исполнено": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "В работе": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Не поддерживается": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Отсутствует позиция": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  "Не указано": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function RegistryPage() {
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set("search", search);
  if (cycle) params.set("cycle", cycle);
  if (status) params.set("status", status);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/recommendations", page, search, cycle, status],
    queryFn: () => apiRequest("GET", `/api/recommendations?${params}`).then(r => r.json()),
  });

  function resetFilters() {
    setSearch(""); setCycle(""); setStatus(""); setPage(1);
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Поиск по предложению, исполнителю..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
          value={cycle} onChange={e => { setCycle(e.target.value === "Все циклы" ? "" : e.target.value); setPage(1); }}>
          {CYCLES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
          value={status} onChange={e => { setStatus(e.target.value === "Все статусы" ? "" : e.target.value); setPage(1); }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || cycle || status) && (
          <button onClick={resetFilters} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted">
            Сбросить
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{data?.total ?? 0} записей</span>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-12">№</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-16">Цикл</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Сфера</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Предложение</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Исполнитель</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Статус</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Срок</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-3 py-2"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.items?.map((r: any) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-muted-foreground">{r.id}</td>
                  <td className="px-3 py-2">{r.cycle}</td>
                  <td className="px-3 py-2 text-xs">{r.sphere}</td>
                  <td className="px-3 py-2 max-w-md">
                    <p className="line-clamp-2 text-xs">{r.proposal}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.responsible}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? STATUS_COLORS["Не указано"]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.deadline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-muted-foreground">Стр. {page} из {data.pages}</span>
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}