import { Link, useLocation } from "react-router-dom";
import { Home, User } from "lucide-react";

const BottomNav = () => {
  const location = useLocation();

  const tabs = [
    { to: "/", icon: Home, label: "Inicio" },
    { to: "/perfil", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              {label}
              {active && <div className="absolute bottom-0 h-0.5 w-8 rounded-t-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
