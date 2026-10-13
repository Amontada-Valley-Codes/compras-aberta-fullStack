"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Search, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { toast } from "@/components/ui/sonner";

import { useUserProfile } from "@/hooks/useUserProfile";

function getInitials(name?: string, fallback = "ME"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Renova o token de acesso (validade de 15 min) um pouco antes de expirar,
// enquanto o painel estiver aberto, para a sessão não cair no meio do uso.
// Se o refresh falhar (ex.: sessão revogada), a próxima navegação já esbarra
// no proxy.ts e volta para o login.
const SESSION_REFRESH_INTERVAL_MS = 12 * 60 * 1000;

function useSessionKeepAlive() {
  useEffect(() => {
    const id = window.setInterval(() => {
      fetch("/api/auth/refresh", { method: "POST" }).catch(() => undefined);
    }, SESSION_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}

export type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string;
};

type AppShellProps = {
  role: "me" | "admin";
  active: string;
  onNavigate: (id: string) => void;
  items: NavItem[];
  children: ReactNode;
};

export function AppShell({
  role,
  active,
  onNavigate,
  items,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = role === "admin";
  const router = useRouter();
  const { profile } = useUserProfile();

  const companyName = profile?.business?.nome_empresa || (isAdmin ? "Administração" : "Minha Empresa");
  const userName = profile?.name || (isAdmin ? "Administrador" : "Responsável Legal");
  const companyAvatar = isAdmin ? "CA" : getInitials(profile?.business?.nome_empresa, "ME");
  const userAvatar = isAdmin ? "CM" : getInitials(profile?.name, "US");

  useSessionKeepAlive();

  const navigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const logout = async () => {
    setLoggingOut(true);
    const toastId = toast.loading("Encerrando sua sessão…");

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(`Logout falhou (${response.status})`);
    } catch {
      // Sem resposta do servidor os cookies não foram apagados; mandar para o
      // login faria o proxy.ts devolver a pessoa ao painel.
      toast.error("Não foi possível sair", {
        id: toastId,
        description: "Verifique sua conexão e tente novamente.",
      });
      setLoggingOut(false);
      return;
    }

    toast.info("Você saiu da sua conta", {
      id: toastId,
      description: "Até logo! Sua sessão foi encerrada com segurança.",
      icon: <LogOut size={18} strokeWidth={2.25} />,
    });
    router.push("/auth/login");
  };

  return (
    <div className={`app-shell is-${role}`}>
      <aside className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="sidebar-head">
          <BrandLogo href="/" />
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">{companyAvatar}</span>
          <span>
            <small>{isAdmin ? "AMBIENTE" : "MINHA EMPRESA"}</small>
            <strong>{companyName}</strong>
          </span>
          <ChevronDown size={16} />
        </div>

        <nav className="sidebar-nav" aria-label="Navegação do painel">
          <small className="nav-group-label">MENU PRINCIPAL</small>
          {items.map((item) => (
            <button
              className={active === item.id ? "active" : ""}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && <em>{item.badge}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-help">
          <span>?</span>
          <div>
            <strong>Precisa de ajuda?</strong>
            <small>Acesse a central de suporte</small>
          </div>
        </div>

        <div className="sidebar-user">
          <span className="user-avatar">{userAvatar}</span>
          <span>
            <strong>{userName}</strong>
            <small>{isAdmin ? "Administrador" : "Responsável legal"}</small>
          </span>
          <ChevronDown size={16} />
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <div className="app-main">
        <header className="app-topbar">
          <button
            className="icon-button mobile-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={21} />
          </button>
          <label className="topbar-search">
            <Search size={18} />
            <input
              placeholder={
                isAdmin
                  ? "Buscar empresa, CNPJ ou município"
                  : "Buscar oportunidade ou município"
              }
              aria-label="Buscar"
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notificações"
              >
                <Bell size={19} />
                <i />
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div>
                    <strong>Notificações</strong>
                    <span>2 novas</span>
                  </div>
                  <button>
                    <b>
                      {isAdmin
                        ? "3 cadastros aguardam análise"
                        : "Nova oportunidade compatível"}
                    </b>
                    <small>
                      {isAdmin
                        ? "Fila atualizada há 12 min"
                        : "Pregão em Amontada • há 18 min"}
                    </small>
                  </button>
                  <button>
                    <b>
                      {isAdmin
                        ? "Integração concluída"
                        : "Prazo termina em 3 dias"}
                    </b>
                    <small>
                      {isAdmin
                        ? "2.763 registros importados"
                        : "Alimentação escolar • hoje"}
                    </small>
                  </button>
                </div>
              )}
            </div>
            <Link className="portal-link" href="/">
              Portal público
            </Link>
            <button
              className="icon-button logout-button"
              onClick={logout}
              disabled={loggingOut}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={19} />
            </button>
            <span className="topbar-avatar">{userAvatar}</span>
          </div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
