import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, CheckCircle2 } from "lucide-react";

const STATUSES = ["Исполнено", "В работе", "Не поддерживается", "Отсутствует позиция", "Не указано"];

const STATUS_COLORS: Record<string, string> = {
  "Исполнено": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "В работе": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Не поддерживается": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "Отсутствует позиция": "bg-gray-100 text-gray-800",
  "Не указано": "bg-gray-100 text-gray-600",
};

export default function UpdatePage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ status: "", deadline: "", position2026: "", adgsPosition: "", comment: "", changedBy: "" });
  const [success, setSuccess] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/recommendations/search", search],
    queryFn: () => apiRequest("GET", `/api/recommendations?search=${encodeURIComponent(search)}&pageSize=20`).then(r => r.json()),
    enabled: search.length > 2,
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => apiRequest("PATCH", `/api/recommendations/${selected.id}/status`, payload).then(r => r.json()),
    onSuccess: () => {
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  function selectRec(r: any) {
    setSelected(r);
    setForm({ status: r.status ?? "", deadline: r.deadline ?? "", position2026: r.position2026 ?? "", adgsPosition: r.adgsPosition ?? "", comment: "", changedBy: "" });
    setSuccess(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Найдите рекомендацию (мин. 3 символа)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="border border-border rounded-xl overflow-hidden">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Поиск...</div>}
          {!isLoading && search.length > 2 && data?.items?.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Ничего не найдено</div>
          )}
          {data?.items?.map((r: any) => (
            <div key={r.id} onClick={() => selectRec(r)}
              className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selected?.id === r.id ? "bg-muted" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-muted-foreground">#{r.id} · {r.cycle} · {r.sphere}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[r.status] ?? ""}`}>{r.status}</span>
              </div>
              <p className="text-sm mt-1 line-clamp-2">{r.proposal}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.responsible}</p>
            </div>
          ))}
          {search.length <= 2 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Введите минимум 3 символа для поиска
            </div>
          )}
        </div>
      </div>

      <div>
        {!selected ? (
          <div className="border border-border rounded-xl p-6 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
            Выберите рекомендацию слева
          </div>
        ) : (
          <form onSubmit={submit} className="border border-border rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">#{selected.id} · {selected.cycle} · {selected.sphere}</p>
              <p className="text-sm font-medium mt-1 line-clamp-3">{selected.proposal}</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Статус</p>
                <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                  value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Срок исполнения</p>
                <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                  value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Позиция ГО на 2026</p>
                <textarea className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background h-20 resize-none"
                  value={form.position2026} onChange={e => setForm(f => ({ ...f, position2026: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Позиция АДГС</p>
                <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                  value={form.adgsPosition} onChange={e => setForm(f => ({ ...f, adgsPosition: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Комментарий</p>
                <textarea className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background h-16 resize-none"
                  value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Изменил</p>
                <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
                  placeholder="Ваше имя"
                  value={form.changedBy} onChange={e => setForm(f => ({ ...f, changedBy: e.target.value }))} />
              </div>
            </div>
            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 size={16} /> Статус обновлён
              </div>
            )}
            {mutation.isError && (
              <div className="text-red-600 text-sm">Ошибка при сохранении</div>
            )}
            <button type="submit" disabled={mutation.isPending || !form.status}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {mutation.isPending ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}