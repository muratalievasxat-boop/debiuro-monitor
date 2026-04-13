import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, ChevronLeft, ChevronRight, X, ChevronUp, ChevronDown, RotateCcw, CheckCircle2 } from "lucide-react";

const STATUSES = ["Все статусы", "Исполнено", "В работе", "Не поддерживается", "Отсутствует позиция", "Не указано"];
const CYCLES = ["Все циклы", "I", "II", "III", "IV", "V", "VI", "VII"];
const TYPES = ["Тип: все", "Анализ", "Мониторинг"];
const UPDATE_STATUSES = ["Исполнено", "В работе", "Не поддерживается", "Отсутствует позиция", "Не указано"];

const STATUS_COLORS: Record<string, string> = {
  "Исполнено": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "В работе": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Не поддерживается": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Отсутствует позиция": "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  "Не указано": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

type SortKey = "id" | "cycle" | "sphere" | "deadline" | "status";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="opacity-30 text-xs">↕</span>;
  return dir === "asc" ? <ChevronUp size={13} className="inline" /> : <ChevronDown size={13} className="inline" />;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-1">{label}</p>
      <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{value}</div>
    </div>
  );
}

export default function RegistryPage() {
  const [search, setSearch] = useState("");
  const [cycle, setCycle] = useState("");
  const [status, setStatus] = useState("");
  const [sphere, setSphere] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState({ status: "", deadline: "", position2026: "", adgsPosition: "", comment: "", changedBy: "" });
  const [success, setSuccess] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const pageSize = 50;
  const qc = useQueryClient();

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set("search", search);
  if (cycle) params.set("cycle", cycle);
  if (status) params.set("status", status);
  if (sphere) params.set("sphere", sphere);
  if (type) params.set("type", type);
  params.set("sortKey", sortKey);
  params.set("sortDir", sortDir);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/recommendations", page, search, cycle, status, sphere, type, sortKey, sortDir],
    queryFn: () => apiRequest("GET", `/api/recommendations?${params}`).then(r => r.json()),
  });

  const { data: metaData } = useQuery({
    queryKey: ["/api/recommendations/meta"],
    queryFn: () => apiRequest("GET", "/api/recommendations/meta").then(r => r.json()),
  });

  const spheres: string[] = metaData?.spheres ?? [];

  const mutation = useMutation({
    mutationFn: (payload: any) => apiRequest("PATCH", `/api/recommendations/${modal.id}/status`, payload).then(r => r.json()),
    onSuccess: (updated) => {
      setSuccess(true);
      setModal((prev: any) => ({ ...prev, ...updated }));
      qc.invalidateQueries({ queryKey: ["/api/recommendations"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      setTimeout(() => { setSuccess(false); setEditMode(false); }, 2500);
    },
  });

  function openModal(r: any) {
    setModal(r);
    setForm({ status: r.status ?? "", deadline: r.deadline ?? "", position2026: r.position2026 ?? "", adgsPosition: r.adgsPosition ?? "", comment: "", changedBy: "" });
    setSuccess(false);
    setEditMode(false);
  }

  function closeModal() { setModal(null); setSuccess(false); setEditMode(false); }
  function submit(e: React.FormEvent) { e.preventDefault(); mutation.mutate(form); }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  function resetFilters() { setSearch(""); setCycle(""); setStatus(""); setSphere(""); setType(""); setPage(1); }
  const hasFilters = search || cycle || status || sphere || type;
  const thClass = "px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground whitespace-nowrap";

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Поиск по тексту, ГО, сфере..."
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
        <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background min-w-32"
          value={sphere} onChange={e => { setSphere(e.target.value === "Все сферы" ? "" : e.target.value); setPage(1); }}>
          <option value="">Все сферы</option>
          {spheres.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
          value={type} onChange={e => { setType(e.target.value === "Тип: все" ? "" : e.target.value); setPage(1); }}>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        {hasFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted">
            <RotateCcw size={12} /> Сбросить
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">Найдено: {data?.total ?? 0} записей</span>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className={thClass} onClick={() => toggleSort("id")}>№ <SortIcon active={sortKey==="id"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => toggleSort("cycle")}>Цикл <SortIcon active={sortKey==="cycle"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => toggleSort("sphere")}>Сфера <SortIcon active={sortKey==="sphere"} dir={sortDir} /></th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Предложение</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Отв.</th>
                <th className={thClass} onClick={() => toggleSort("deadline")}>Срок <SortIcon active={sortKey==="deadline"} dir={sortDir} /></th>
                <th className={thClass} onClick={() => toggleSort("status")}>Статус ГО <SortIcon active={sortKey==="status"} dir={sortDir} /></th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j} className="px-3 py-2"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.items?.map((r: any) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-muted-foreground">{r.id}</td>
                  <td className="px-3 py-2 text-xs font-medium text-primary">Цикл {r.cycle}</td>
                  <td className="px-3 py-2 text-xs">{r.sphere}</td>
                  <td className="px-3 py-2 max-w-sm"><p className="line-clamp-2 text-xs">{r.proposal}</p></td>
                  <td className="px-3 py-2 text-xs font-medium">{r.responsible}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.deadline}</td>
                  <td className="px-3 py-2">
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (STATUS_COLORS[r.status] ?? STATUS_COLORS["Не указано"])}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => openModal(r)}
                      className="text-xs px-3 py-1 rounded-lg border border-border hover:bg-muted transition-colors whitespace-nowrap">
                      Подробнее
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <button onClick={() => setPage(1)} disabled={page === 1}
            className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 text-xs">1«</button>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
            const p = Math.max(1, Math.min(data.pages - 4, page - 2)) + i;
            return (
              <button key={p} onClick={() => setPage(p)}
                className={"px-3 py-1 rounded border text-xs transition-colors " + (p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                {p}
              </button>
            );
          })}
          {data.pages > 5 && <span className="text-muted-foreground text-xs px-1">...</span>}
          <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setPage(data.pages)} disabled={page === data.pages}
            className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-40 text-xs">»{data.pages}</button>
          <span className="text-xs text-muted-foreground ml-2">Стр. {page} из {data.pages}</span>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-base">Рекомендация № {modal.id}</h2>
              <button onClick={closeModal} className="p-1.5 rounded hover:bg-muted"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Тип</p><p>{modal.type}</p></div>
                <div><p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Цикл</p><p>{modal.cycle}</p></div>
                <div><p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Сфера</p><p>{modal.sphere}</p></div>
                <div><p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Ответственный</p><p>{modal.responsible}</p></div>
                <div><p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Срок</p><p>{modal.deadline}</p></div>
                <div>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-0.5">Статус ГО</p>
                  <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (STATUS_COLORS[modal.status] ?? STATUS_COLORS["Не указано"])}>
                    {modal.status}
                  </span>
                </div>
              </div>
              <Field label="Предложение" value={modal.proposal} />
              <Field label="Заинтересованные ГО" value={modal.stakeholders} />
              <Field label="Форма завершения" value={modal.completionForm} />
              <Field label="Позиция ГО 2024–2025" value={modal.position2024} />
              <Field label="Позиция ГО на 2026" value={modal.position2026} />
              <Field label="Позиция АДГС" value={modal.adgsPosition} />
              {modal.caseNote && <Field label="Примечание" value={modal.caseNote} />}
              <div className="border-t border-border pt-4">
                {!editMode ? (
                  <button onClick={() => setEditMode(true)}
                    className="w-full py-2 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
                    Обновить статус
                  </button>
                ) : (
                  <form onSubmit={submit} className="space-y-3">
                    <p className="text-sm font-semibold">Обновить статус</p>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Статус</p>
                      <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                        value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {UPDATE_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Срок исполнения</p>
                      <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                        value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Позиция ГО на 2026</p>
                      <textarea className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background h-20 resize-none"
                        value={form.position2026} onChange={e => setForm(f => ({ ...f, position2026: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Позиция АДГС</p>
                      <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                        value={form.adgsPosition} onChange={e => setForm(f => ({ ...f, adgsPosition: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Комментарий</p>
                      <textarea className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background h-16 resize-none"
                        value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Изменил</p>
                      <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                        placeholder="Ваше имя" value={form.changedBy}
                        onChange={e => setForm(f => ({ ...f, changedBy: e.target.value }))} />
                    </div>
                    {success && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle2 size={16} /> Статус обновлён
                      </div>
                    )}
                    {mutation.isError && <p className="text-red-600 text-sm">Ошибка при сохранении</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditMode(false)}
                        className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-muted">
                        Отмена
                      </button>
                      <button type="submit" disabled={mutation.isPending}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                        {mutation.isPending ? "Сохранение..." : "Сохранить"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}