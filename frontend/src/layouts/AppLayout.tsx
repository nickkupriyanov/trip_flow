import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  to: string;
};

const navigationItems: NavigationItem[] = [
  { label: "Дашборд", to: "/dashboard" },
  { label: "Pipeline", to: "/pipeline" },
  { label: "Напоминания", to: "/reminders" },
  { label: "Клиенты", to: "/clients" }
];

export function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-5 py-6 lg:block">
        <div className="mb-10">
          <p className="text-xl font-semibold tracking-normal text-foreground">
            TripFlow
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Рабочее пространство турагента
          </p>
        </div>

        <nav className="space-y-1" aria-label="Основная навигация">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "block rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Card className="absolute inset-x-5 bottom-6 bg-background p-4">
          <p className="text-sm font-medium text-foreground">{user?.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {user?.email}
          </p>
          <Button
            className="mt-3 w-full"
            variant="outline"
            type="button"
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </Card>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                TripFlow MVP
              </p>
              <h1 className="text-2xl font-semibold tracking-normal">
                Рабочее место для заявок на путешествия
              </h1>
            </div>

            <nav
              className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
              aria-label="Мобильная навигация"
            >
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "shrink-0 rounded-md border px-3 py-2 text-sm font-medium",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Button
                className="shrink-0"
                variant="outline"
                type="button"
                onClick={handleLogout}
              >
                Выйти
              </Button>
            </nav>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
