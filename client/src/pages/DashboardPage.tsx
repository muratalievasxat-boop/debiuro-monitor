import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title, BubbleController
} from "chart.js";
import { Bar, Line, Bubble } from "react-chartjs-2";
import { CheckCircle2, Clock, XCircle, AlertCircle, Hash, AlertTriangle } from "lucide-react";

ChartJS.register(
  ArcElement, BarElement, LineElement, PointElement, BubbleController,
  CategoryScale, LinearScale, Tooltip, Legend, Title
);

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byCycle: { cycle: string; total: number; done: number; inWork: number; rejected: number; noStatus: number; doneAnalysis: number; doneMonitoring: number; totalAnalysis: number; totalMonitoring: number }[];
  bySphere: { sphere: string; count: number; done: number; inWork: number; rejected: number }[];
  byExec: { responsible: string; count: number; done: number }[];
  byType: Record<string, number>;
  byForm: { form: string; total: number; done: number }[];
  overdue: number;
  overdueByExec: { responsible: string; count: number }[];
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}
function textColor() { return isDark() ? "#94a3b8" : "#64748b"; }

function KpiCard({ label, value, sub, color, icon: Icon, active, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-card border rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden cursor-pointer
        transition-all duration-150 select-none
        ${active ? "ring-2 ring-offset-1 shadow-md scale-[1.02]" : "hover:shadow-md hover:scale-[1.01]"}
      `}
      style={{ borderColor: active ? color : undefined }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
        <Icon size={15} style={{ color }} />
      </div>
      <span className="text-3xl font-bold tabular-nums leading-none">{typeof value === 'number' ? value.toLocaleString('ru') : value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
      {active && (
        <span className="absolute bottom-1.5 right-2 text-[10px] font-semibold" style={{ color }}>● фильтр активен</span>
      )}
    </div>
  );
}

function pct(done: number, total: number) {
  return total ? Math.round(done / total * 100) : 0;
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [formView, setFormView] = useState<"bar" | "bubble">("bar");

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  // ---- All hooks MUST be before any early return ----
  const bySphere = stats?.bySphere ?? [];
  const byExec = stats?.byExec ?? [];
  const byCycle = stats?.byCycle ?? [];
  const byForm = stats?.byForm ?? [];

  // Sphere chart — filtered by active KPI
  const sphereChartData = useMemo(() => {
    const labels = bySphere.map(s => s.sphere);
    let values: number[];
    if (!activeFilter || activeFilter === "Просроченные") {
      values = bySphere.map(s => s.count);
    } else if (activeFilter === "Исполнено") {
      values = bySphere.map(s => s.done);
    } else if (activeFilter === "В работе") {
      values = bySphere.map(s => s.inWork);
    } else if (activeFilter === "Не поддерживается") {
      values = bySphere.map(s => s.rejected);
    } else {
      values = bySphere.map(s => s.count - s.done - s.inWork - s.rejected);
    }
    return {
      labels,
      datasets: [{
        label: activeFilter ? `Сфера (${activeFilter})` : "Всего",
        data: values,
        backgroundColor: activeFilter === "Исполнено" ? "#16a34a"
          : activeFilter === "В работе" ? "#d97706"
          : activeFilter === "Не поддерживается" ? "#dc2626"
          : "#2563eb",
      }]
    };
  }, [activeFilter, bySphere]);

  // Exec chart — filtered
  const execChartData = useMemo(() => {
    const sorted = [...byExec].slice(0, 10);
    let values: number[];
    if (!activeFilter || activeFilter === "Просроченные") {
      values = sorted.map(e => e.count);
    } else if (activeFilter === "Исполнено") {
      values = sorted.map(e => e.done);
    } else {
      values = sorted.map(e => e.count);
    }
    return {
      labels: sorted.map(e => e.responsible),
      datasets: [{
        label: activeFilter ? `Исполнитель (${activeFilter})` : "Всего",
        data: values,
        backgroundColor: activeFilter === "Исполнено" ? "#16a34a"
          : activeFilter === "В работе" ? "#d97706"
          : activeFilter === "Не поддерживается" ? "#dc2626"
          : "#7c3aed",
      }]
    };
  }, [activeFilter, byExec]);

  // Cycle line chart — 2 lines: Анализ vs Мониторинг
  const cycleLineData = useMemo(() => ({
    labels: byCycle.map(c => `Цикл ${c.cycle}`),
    datasets: [
      {
        label: "Анализ (% исполнено)",
        data: byCycle.map(c => pct(c.doneAnalysis ?? 0, c.totalAnalysis ?? 1)),
        borderColor: "#2563eb",
        backgroundColor: "#2563eb33",
        tension: 0.3,
        pointRadius: 5,
        fill: false,
      },
      {
        label: "Мониторинг (% исполнено)",
        data: byCycle.map(c => pct(c.doneMonitoring ?? 0, c.totalMonitoring ?? 1)),
        borderColor: "#16a34a",
        backgroundColor: "#16a34a33",
        tension: 0.3,
        pointRadius: 5,
        fill: false,
      },
    ]
  }), [byCycle]);

  // Form completion — BAR version
  const formBarData = useMemo(() => ({
    labels: byForm.map(f => f.form),
    datasets: [
      {
        label: "Исполнено",
        data: byForm.map(f => f.done),
        backgroundColor: "#16a34a",
      },
      {
        label: "Не исполнено",
        data: byForm.map(f => f.total - f.done),
        backgroundColor: "#e2e8f0",
      },
    ]
  }), [byForm]);

  // Form completion — BUBBLE version
  const bubbleData = useMemo(() => ({
    datasets: [{
      label: "Форма завершения",
      data: byForm.map(f => ({
        x: f.total,
        y: pct(f.done, f.total),
        r: Math.max(6, Math.sqrt(f.total) * 2.5),
        _label: f.form,
      })),
      backgroundColor: byForm.map(f => {
        const p = pct(f.done, f.total);
        if (p >= 50) return "#16a34a99";
        if (p >= 30) return "#d9780699";
        return "#dc262699";
      }),
      borderColor: byForm.map(f => {
        const p = pct(f.done, f.total);
        if (p >= 50) return "#16a34a";
        if (p >= 30) return "#d97706";
        return "#dc2626";
      }),
    }]
  }), [byForm]);

  // ---- End of hooks ----

  if (isLoading || !stats) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { total, byStatus, overdue, overdueByExec } = stats;
  const done = byStatus["Исполнено"] ?? 0;
  const inWork = byStatus["В работе"] ?? 0;
  const rejected = byStatus["Не поддерживается"] ?? 0;
  const noStatus = total - done - inWork - rejected;

  function handleKpi(label: string) {
    setActiveFilter(prev => prev === label ? null : label);
  }

  const lineOpts: any = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: textColor(), font: { size: 11 } }, grid: { display: false } },
      y: {
        min: 0, max: 100,
        ticks: { color: textColor(), font: { size: 11 }, callback: (v: any) => v + "%" },
        grid: { color: isDark() ? "#1e293b" : "#f1f5f9" }
      }
    },
    plugins: {
      legend: { labels: { color: textColor(), font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } }
    }
  };

  const bubbleOpts: any = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: {
        title: { display: true, text: "Количество рекомендаций", color: textColor(), font: { size: 11 } },
        ticks: { color: textColor(), font: { size: 11 } }
      },
      y: {
        min: 0, max: 100,
        title: { display: true, text: "% исполнения", color: textColor(), font: { size: 11 } },
        ticks: { color: textColor(), font: { size: 11 }, callback: (v: any) => v + "%" }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const d = ctx.raw as any;
            return [`${d._label}`, `Рекомендаций: ${d.x}`, `Исполнено: ${d.y}%`];
          }
        }
      }
    }
  };

  const hbarOpts = (stacked = false): any => ({
    indexAxis: 'y' as const,
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { stacked, ticks: { color: textColor(), font: { size: 11 } } },
      y: { stacked, ticks: { color: textColor(), font: { size: 11 } } }
    },
    plugins: { legend: { display: stacked, labels: { color: textColor(), font: { size: 11 } } } }
  });

  // Outsiders — exec with 0% completion and ≥10 recs
  const outsiders = byExec.filter(e => e.count >= 10 && e.done === 0).sort((a, b) => b.count - a.count);

  // Overdue by exec (top 8)
  const overdueExecData = overdueByExec?.slice(0, 8) ?? [];

  const kpis = [
    { label: "Всего",              value: total,    sub: "7 циклов",               color: "#2563eb", icon: Hash,          key: null },
    { label: "Исполнено",          value: done,     sub: `${pct(done,total)}%`,    color: "#16a34a", icon: CheckCircle2,  key: "Исполнено" },
    { label: "В работе",           value: inWork,   sub: `${pct(inWork,total)}%`,  color: "#d97706", icon: Clock,         key: "В работе" },
    { label: "Не поддерживается",  value: rejected, sub: `${pct(rejected,total)}%`,color: "#dc2626", icon: XCircle,       key: "Не поддерживается" },
    { label: "Без статуса",        value: noStatus, sub: `${pct(noStatus,total)}%`,color: "#9ca3af", icon: AlertCircle,   key: "Без статуса" },
    { label: "Просроченные",       value: overdue ?? 0, sub: "срок прошёл, не исп.", color: "#7c3aed", icon: AlertTriangle, key: "Просроченные" },
  ];

  return (
    <div className="p-5 space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <KpiCard
            key={k.label}
            label={k.label} value={k.value} sub={k.sub}
            color={k.color} icon={k.icon}
            active={activeFilter === k.key && k.key !== null}
            onClick={() => k.key && handleKpi(k.key)}
          />
        ))}
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Фильтр активен: <strong className="text-foreground">{activeFilter}</strong></span>
          <button onClick={() => setActiveFilter(null)}
            className="text-xs px-2 py-0.5 rounded border border-border hover:bg-muted">✕ Сбросить</button>
        </div>
      )}

      {/* Row 1: Динамика по циклам + Топ сфер */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">% исполнения по циклам</p>
          <p className="text-xs text-muted-foreground mb-3">Анализ vs Мониторинг — динамика от цикла к циклу</p>
          <div className="h-56"><Line data={cycleLineData} options={lineOpts} /></div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">
            Топ-15 сфер
            {activeFilter && <span className="ml-2 text-xs font-normal text-muted-foreground">→ {activeFilter}</span>}
          </p>
          <div className="h-56">
            <Bar data={sphereChartData} options={hbarOpts(false)} />
          </div>
        </div>
      </div>

      {/* Row 2: Форма завершения — переключатель бар/пузыри */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sm font-semibold">Эффективность по форме завершения</p>
            <p className="text-xs text-muted-foreground">Как уровень адресата влияет на % исполнения</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFormView("bar")}
              className={`text-xs px-3 py-1 rounded border transition-colors ${formView === "bar" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >Бар</button>
            <button
              onClick={() => setFormView("bubble")}
              className={`text-xs px-3 py-1 rounded border transition-colors ${formView === "bubble" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >Пузыри</button>
          </div>
        </div>
        <div className="h-64">
          {formView === "bar"
            ? <Bar data={formBarData} options={hbarOpts(true)} />
            : <Bubble data={bubbleData} options={bubbleOpts} />
          }
        </div>
        {formView === "bubble" && (
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-green-600" /> ≥50% исполнено</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-amber-500" /> 30–49%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-red-600" /> &lt;30%</span>
          </div>
        )}
      </div>

      {/* Row 3: Топ исполнителей + Просроченные */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">
            Топ-10 исполнителей
            {activeFilter && <span className="ml-2 text-xs font-normal text-muted-foreground">→ {activeFilter}</span>}
          </p>
          <div className="h-52"><Bar data={execChartData} options={hbarOpts(false)} /></div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-1">Просроченные по исполнителям</p>
          <p className="text-xs text-muted-foreground mb-3">Срок истёк в 2024–2025, статус — «В работе»</p>
          {overdueExecData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных</p>
          ) : (
            <div className="space-y-2">
              {overdueExecData.map(e => (
                <div key={e.responsible} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-20 truncate flex-shrink-0">{e.responsible}</span>
                  <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                    <div className="h-full bg-red-500 rounded-sm transition-all"
                      style={{ width: `${Math.min(100, (e.count / overdueExecData[0].count) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-red-600 w-6 text-right">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Аутсайдеры (0% исполнения) */}
      {outsiders.length > 0 && (
        <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-xl p-4">
          <p className="text-sm font-semibold mb-1 text-red-700 dark:text-red-400">
            Аутсайдеры — 0% исполнения (≥10 рекомендаций)
          </p>
          <p className="text-xs text-muted-foreground mb-3">Исполнители у которых ни одна рекомендация не выполнена</p>
          <div className="flex flex-wrap gap-2">
            {outsiders.map(e => (
              <div key={e.responsible}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">{e.responsible}</span>
                <span className="text-xs text-red-500">{e.count} рек.</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
