import { useEffect, useState } from "react";

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  bySphere: Record<string, number>;
  byCycle: Record<string, number>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid grid-cols-2 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-blue-50 dark:bg-gray-800 animate-pulse" />)}</div>;
  if (!stats) return <div className="text-red-500">Ошибка загрузки данных</div>;

  const cards = [
    { label: "Всего записей", value: stats.total, color: "bg-blue-600" },
    ...Object.entries(stats.byStatus).map(([k, v]) => ({ label: k, value: v, color: "bg-indigo-500" })),
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <div className={`inline-block w-2 h-8 rounded mr-3 ${c.color}`} />
            <span className="text-2xl font-bold">{c.value}</span>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionTable title="По сфере" data={stats.bySphere} />
        <SectionTable title="По циклу" data={stats.byCycle} />
      </div>
    </div>
  );
}

function SectionTable({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(data).map(([k, v]) => (
            <tr key={k} className="border-t border-gray-100 dark:border-gray-700">
              <td className="py-1 text-gray-600 dark:text-gray-400">{k}</td>
              <td className="py-1 text-right font-medium">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
