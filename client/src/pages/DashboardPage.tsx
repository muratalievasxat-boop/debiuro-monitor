import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Chart as ChartJS, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend, Title, BubbleController
} from "chart.js";
import { Bar, Line, Bubble } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { CheckCircle2, Clock, XCircle, AlertCircle, Hash, AlertTriangle } from "lucide-react";

ChartJS.register(
  ArcElement, BarElement, LineElement, PointElement, BubbleController,
  CategoryScale, LinearScale, Tooltip, Legend, Title, ChartDataLabels
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
      className={`bg-card border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden cursor-pointer
        transition-all duration-150 select-none hover:shadow-md hover:scale-[1.02]
        ${active ? 'ring-2 ring-offset-1 shadow-md scale-[1.02]' : 'border-border hover:border-foreground'}
      `}
      style={{ borderColor: active ? color : undefined, backgroundColor: active ? `${color}10` : undefined }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <div className="flex items-center justify-between">
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-primary uppercase tracking-wide leading-tight">{label}</p>
      </div>
      <div>
        <span className="text-3xl font-bold tabular-nums leading-none">{typeof value === 'number' ? value.toLocaleString('ru') : value}</span>
        <span className="text-xs text-muted-foreground ml-2">{sub}</span>
      </div>
      {active && (
        <div className="text-[10px] text-muted-foreground">
          ● фильтр активен
        </div>
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
    let pairs: { label: string; value: number }[];
    if (!activeFilter || activeFilter === "Просроченные" || activeFilter === "__all__") {
      pairs = bySphere.map(s => ({ label: s.sphere, value: s.count }));
    } else if (activeFilter === "Исполнено") {
      pairs = bySphere.map(s => ({ label: s.sphere, value: s.done }));
    } else if (activeFilter === "В работе") {
      pairs = bySphere.map(s => ({ label: s.sphere, value: s.inWork }));
    } else if (activeFilter === "Не поддерживается") {
      pairs = bySphere.map(s => ({ label: s.sphere, value: s.rejected }));
    } else {
      pairs = bySphere.map(s => ({ label: s.sphere, value: s.count - s.done - s.inWork - s.rejected }));
    }
    pairs.sort((a, b) => b.value - a.value);
    return {
      labels: pairs.map(p => p.label),
      datasets: [{
        label: activeFilter && activeFilter !== "__all__" ? `Сфера (${activeFilter})` : "Всего",
        data: pairs.map(p => p.value),
        backgroundColor: activeFilter === "Исполнено" ? "#16a34a"
          : activeFilter === "В работе" ? "#d97706"
          : activeFilter === "Не поддерживается" ? "#dc2626"
          : "#2563eb",
      }]
    };
  }, [activeFilter, bySphere]);

  // Exec chart — filtered
  const execChartData = useMemo(() => {
    let pairs: { label: string; value: number }[];
    if (!activeFilter || activeFilter === "Просроченные" || activeFilter === "__all__") {
      pairs = [...byExec].map(e => ({ label: e.responsible, value: e.count }));
    } else if (activeFilter === "Исполнено") {
      pairs = [...byExec].map(e => ({ label: e.responsible, value: e.done }));
    } else {
      pairs = [...byExec].map(e => ({ label: e.responsible, value: e.count }));
    }
    pairs.sort((a, b) => b.value - a.value);
    pairs = pairs.slice(0, 10);
    return {
      labels: pairs.map(p => p.label),
      datasets: [{
        label: activeFilter && activeFilter !== "__all__" ? `Исполнитель (${activeFilter})` : "Всего",
        data: pairs.map(p => p.value),
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
    if (label === "__all__") { setActiveFilter(null); return; }
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
      y: { stacked, ticks: { color: textColor(), font: { size: 11 }, maxTicksLimit: 20 } }
    },
    plugins: {
      legend: { display: stacked, labels: { color: textColor(), font: { size: 11 } } },
      datalabels: {
        display: !stacked,
        anchor: "end" as const,
        align: "end" as const,
        color: textColor(),
        font: { size: 10, weight: "bold" as const },
        formatter: (v: number) => v > 0 ? v : "",
        clip: false,
      }
    },
    layout: { padding: { right: 32 } },
  });

  // Outsiders — exec with 0% completion and ≥10 recs
  const outsiders = byExec.filter(e => e.count >= 10 && e.done === 0).sort((a, b) => b.count - a.count);

  // Overdue by exec (top 8)
  const overdueExecData = overdueByExec?.slice(0, 8) ?? [];

  const kpis = 