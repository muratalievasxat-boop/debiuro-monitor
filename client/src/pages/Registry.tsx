import { useEffect, useState, useRef } from "react";

interface Item {
  id: number;
  cycle: string;
  sphere: string;
  indicator: string;
  status: string;
  responsible: string;
  [key: string]: unknown;
}

interface Meta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function Registry() {
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [filters, setFilters] = useState({ cycle: "", status: "", sphere: "", search: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = (f = filters, p = page) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("pageSize", "20");
    if (f.cycle) params.set("cycle", f.cycle);
    if (f.status) params.set("status", f.status);
    if (f.sphere) params.set("sphere", f.sphere);
    if (f.search) params.set("search", f.search);
    fetch(`/api/items?${params}`)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setMeta(d.meta ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(filters, 1), 300);
    setPage(1);
  }, [filters]);

  useEffect(() => { load(filters, page); }, [page]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          className="border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 flex-1 min-w-[200px]"
          placeholder="Поиск..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        {(["cycle", "status", "sphere"] as const).map(key => (
          <input
            key={key}
            className="border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5 text-sm bg-white dark:bg-gray-800 w-36"
            placeholder={key === "cycle" ? "Цикл" : key === "status" ? "Статус" : "Сфера"}
            value={filters[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
          />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {["#", "Цикл", "Сфера", "Показатель", "Статус", "Ответственный"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Загрузка...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Ничего не найдено</td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2 text-gray-400">{(meta.page - 1) * meta.pageSize + i + 1}</td>
                <td className="px-3 py-2">{item.cycle}</td>
                <td className="px-3 py-2">{item.sphere}</td>
                <td className="px-3 py-2 max-w-xs truncate">{item.indicator}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {item.status}
                  </span>
                </td>
                <td className="px-3 py-2">{item.responsible}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Всего: {meta.total}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
            ←
          </button>
          <span className="px-2 py-1">{page} / {meta.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
