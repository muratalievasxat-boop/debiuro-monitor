import { useState, useRef } from "react";
import { Download, Upload, CheckCircle2, AlertCircle } from "lucide-react";

export default function ExportPage() {
  const [cycle, setCycle] = useState("");
  const [status, setStatus] = useState("");
  const [sphere, setSphere] = useState("");
  const [meta, setMeta] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (cycle) params.set("cycle", cycle);
    if (status) params.set("status", status);
    if (sphere) params.set("sphere", sphere);
    window.location.href = "/api/export?" + params.toString();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      setImportResult(data);
    } catch {
      setImportResult({ error: "Ошибка загрузки" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Download size={18} className="text-primary" />
          <h2 className="font-semibold">Экспорт в Excel</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Выберите фильтры — система выгрузит именно ту таблицу, которую вы видите в реестре, в формате .xlsx.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Цикл</p>
            <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
              placeholder="Все циклы" value={cycle} onChange={e => setCycle(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Статус</p>
            <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
              value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Все статусы</option>
              {["Исполнено","В работе","Не поддерживается","Отсутствует позиция","Не указано"].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Сфера</p>
            <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background"
              placeholder="Все сферы" value={sphere} onChange={e => setSphere(e.target.value)} />
          </div>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Download size={14} /> Скачать Excel (.xlsx)
        </button>
        <p className="text-xs text-muted-foreground">Совместим с Microsoft Excel и LibreOffice.</p>
      </div>

      <div className="border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-primary" />
          <h2 className="font-semibold">Импорт нового файла</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Загрузите обновлённый файл постмониторинга (.xlsx). Лист должен называться <strong>перечень</strong>.
        </p>
        <div
          onClick={() => fileRef.current?.click()}
          className={"flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary transition-colors " + (importing ? "opacity-50 pointer-events-none" : "")}>
          <Upload size={24} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{importing ? "Загрузка..." : "Выберите файл .xlsx или перетащите сюда"}</span>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
        </div>
        {importResult?.ok && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 size={16} /> Импортировано {importResult.ok} записей
          </div>
        )}
        {importResult?.error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle size={16} /> {importResult.error}
          </div>
        )}
      </div>
    </div>
  );
}