import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Menu, X, Moon, Sun, LayoutDashboard, Table2, FileDown } from "lucide-react";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);

  const toggle = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  const navItems = [
    { to: "/", label: "Дашборд", icon: <LayoutDashboard size={18} /> },
    { to: "/registry", label: "Реестр", icon: <Table2 size={18} /> },
    { to: "/export", label: "Экспорт в Excel", icon: <FileDown size={18} /> },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="font-semibold text-sm">
          {navItems.find(n => location.pathname === n.to || (n.to !== "/" && location.pathname.startsWith(n.to)))?.label ?? "Дашборд"}
        </span>
        <button onClick={toggle} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-56 min-h-[calc(100vh-3rem)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-3">
            <nav className="flex flex-col gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
