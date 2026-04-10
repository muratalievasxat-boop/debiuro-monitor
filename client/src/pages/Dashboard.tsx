import { useEffect, useState } from "react";

interface CycleStat {
  cycle: string;
  total: number;
  done: number;
  inWork: number;
  rejected: number;
  noStatus: number;
}

interface SphereStat {
  sphere: string;
  count: number;
  done: number;
  inWork: number;
  rejected: number;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byCycle: CycleStat[];
  bySphere: SphereStat[];
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

  if (loading) return (
    <div className="grid grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-blue-50 dark:bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
  if (!stats) return <div className="text-red-500">Ошибка загрузки данных</div>;

  const statusCards = Object.entries(stats.byStatus);

  return (
    <div className="space-y-6">
      {/* Top cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-4 border border-gray-100 dark:border-gray-700 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Всего записей</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        {statusCards.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* By Cycle */}
      <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-sm mb-3">По циклам</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 pr-4">Цикл</th>
                <th className="pb-2 pr-4">Всего</th>
                <th className="pb-2 pr-4">Исполнено</th>
                <th className="pb-2 pr-4">В работе</th>
                <th className="pb-2">Откл.</th>
              </tr>
            </thead>
            <tbody>
              {stats.byCycle.map(c => (
                <tr key={c.cycle} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-1.5 pr-4 font-medium">{c.cycle}</td>
                  <td className="py-1.5 pr-4">{c.total}</td>
                  <td className="py-1.5 pr-4 text-green-600">{c.done}</td>
                  <td className="py-1.5 pr-4 text-blue-600">{c.inWork}</td>
                  <td className="py-1.5 text-red-500">{c.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By Sphere */}
      <div className="rounded-xl bg-white dark:bg-gray-800 shadow-sm p-4 border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-sm mb-3">По сферам</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 pr-4">Сфера</th>
                <th className="pb-2 pr-4">Всего</th>
                <th className="pb-2 pr-4">Исполнено</th>
                <th className="pb-2 pr-4">В работе</th>
                <th className="pb-2">Откл.</th>
              </tr>
            </thead>
            <tbody>
              {stats.bySphere.map(s => (
                <tr key={s.sphere} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-1.5 pr-4">{s.sphere}</td>
                  <td className="py-1.5 pr-4">{s.count}</td>
                  <td className="py-1.5 pr-4 text-green-600">{s.done}</td>
                  <td className="py-1.5 pr-4 text-blue-600">{s.inWork}</td>
                  <td className="py-1.5 text-red-500">{s.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
