import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Moon, Sun, LayoutDashboard, Table2, FileDown, ClipboardEdit } from "lucide-react";

const navItems = [
  { to: "/", label: "Дашборд", icon: LayoutDashboard },
  { to: "/registry", label: "Реестр", icon: Table2 },
  { to: "/update", label: "История статусов", icon: ClipboardEdit },
  { to: "/export", label: "Экспорт в Excel", icon: FileDown },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() =>
    localStorage.getItem("theme") === "dark" ||
    (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
  const [location] = useLocation();

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const currentLabel = navItems.find(n =>
    n.to === "/" ? location === "/" : location.startsWith(n.to)
  )?.label ?? "Дашборд";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-4 h-12 bg-card border-b border-border">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded hover:bg-muted transition-colors">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="font-semibold text-sm">{currentLabel}</span>
        <button onClick={() => setDark(d => !d)}
          className="p-1.5 rounded hover:bg-muted transition-colors">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <div className="flex">
        {sidebarOpen && (
          <aside className="w-56 min-h-[calc(100vh-3rem)] bg-card border-r border-border p-3 shrink-0">
            <nav className="flex flex-col gap-1">
              {navItems.map(item => {
                const isActive = item.to === "/" ? location === "/" : location.startsWith(item.to);
                return (
                  <Link key={item.to} href={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={"flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors " +
                      (isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}>
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
