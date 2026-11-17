"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FocusEvent, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { toast } from "@/components/ui/sonner";

import { useUserProfile } from "@/hooks/useUserProfile";
import { SubscriptionBanner } from "./SubscriptionBanner";

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

// Mesma chave usada no login para o "Lembrar-me" (app/components/auth/login.tsx).
const REMEMBERED_EMAIL_KEY = "compras-abertas:login-email";

// Expansão por hover da sidebar recolhida: pequenos atrasos evitam que ela
// abra só por passar o mouse de raspão ou feche ao sair por um instante.
const SIDEBAR_PEEK_OPEN_DELAY_MS = 120;
const SIDEBAR_PEEK_CLOSE_DELAY_MS = 220;
// Só em telas largas com mouse; no celular a sidebar é a gaveta do menu.
const SIDEBAR_PEEK_MEDIA = "(hover: hover) and (pointer: fine) and (min-width: 901px)";

function useSidebarPeek(enabled: boolean) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const schedule = (next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    if (next && (!enabled || !window.matchMedia(SIDEBAR_PEEK_MEDIA).matches)) return;
    timer.current = window.setTimeout(() => setOpen(next), delay);
  };

  // Mantém aberta agora (mouse já está sobre a sidebar); fecha no mouseleave.
  const hold = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(true);
  }, []);

  return {
    open: enabled && open,
    hold,
    reset: () => {
      window.clearTimeout(timer.current);
      setOpen(false);
    },
    handlers: {
      onMouseEnter: () => schedule(true, SIDEBAR_PEEK_OPEN_DELAY_MS),
      onMouseLeave: () => schedule(false, SIDEBAR_PEEK_CLOSE_DELAY_MS),
      // Teclado: ao focar um item da sidebar recolhida ela também se expande.
      onFocus: () => schedule(true, 0),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) schedule(false, 0);
      },
    },
  };
}

// Apresentação ao entrar/recarregar: a sidebar aparece aberta e recolhe
// sozinha depois desse tempo, mostrando que ela existe e abre no hover.
const SIDEBAR_INTRO_DELAY_MS = 1200;

function useSidebarIntro({ enabled, asideRef, holdPeek, collapse }: {
  enabled: boolean;
  asideRef: RefObject<HTMLElement | null>;
  holdPeek: () => void;
  collapse: () => void;
}) {
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !window.matchMedia(SIDEBAR_PEEK_MEDIA).matches) return;
    timer.current = window.setTimeout(() => {
      // Se o mouse estiver sobre a sidebar nesse momento, ela continua aberta
      // até ele sair, em vez de fechar debaixo do cursor.
      if (asideRef.current?.matches(":hover")) holdPeek();
      collapse();
    }, SIDEBAR_INTRO_DELAY_MS);
    return () => window.clearTimeout(timer.current);
  }, [enabled, asideRef, holdPeek, collapse]);

  // Se o usuário mexer no botão do topo antes, a escolha dele prevalece.
  return () => window.clearTimeout(timer.current);
}

export type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string;
};

type AppShellProps = {
  role: "me" | "admin" | "gestor-publico";
  active: string;
  onNavigate: (id: string) => void;
  items: NavItem[];
  portalHref?: string;
  userName?: string;
  children: ReactNode;
};

export function AppShell({
  role,
  active,
  onNavigate,
  items,
  portalHref = "/",
  userName: userNameOverride,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isAdmin = role === "admin";
  const isPublicManager = role === "gestor-publico";
  const hasCollapsibleSidebar = true;
  const router = useRouter();
  const { profile } = useUserProfile({ skip: isPublicManager });
  const sidebarPeek = useSidebarPeek(hasCollapsibleSidebar && sidebarCollapsed);
  // Recolhida de verdade só quando o usuário escolheu recolher e o mouse
  // (ou o foco) não está sobre ela; ao expandir, o conteúdo é empurrado.
  const collapsed = hasCollapsibleSidebar && sidebarCollapsed && !sidebarPeek.open;
  const asideRef = useRef<HTMLElement>(null);
  const collapseSidebar = useCallback(() => setSidebarCollapsed(true), []);
  const cancelSidebarIntro = useSidebarIntro({
    enabled: hasCollapsibleSidebar,
    asideRef,
    holdPeek: sidebarPeek.hold,
    collapse: collapseSidebar,
  });

  const companyName = profile?.business?.nome_empresa || "Minha Empresa";
  const companyAvatar = getInitials(profile?.business?.nome_empresa, "ME");
  const userName = userNameOverride || profile?.name || (isAdmin ? "Administrador" : isPublicManager ? "Gestor público" : "Responsável Legal");
  const userAvatar = isAdmin ? "CM" : isPublicManager ? "GP" : getInitials(profile?.name, "US");

  useSessionKeepAlive();

  const navigate = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const logout = async () => {
    setLoggingOut(true);
    const toastId = toast.loading("Encerrando sua sessão…");

    try {
      try {
        // Preserva só o e-mail do "Lembrar-me" (login.tsx); o resto é limpo.
        const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
        localStorage.clear();
        sessionStorage.clear();
        if (rememberedEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, rememberedEmail);
      } catch {
        // ignore
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      await fetch("/api/auth/logout", {
        method: "POST",
        signal: controller.signal,
        keepalive: true,
      }).catch(() => undefined);

      clearTimeout(timeoutId);
    } finally {
      toast.info("Você saiu da sua conta", {
        id: toastId,
        description: "Até logo! Sua sessão foi encerrada com segurança.",
        icon: <LogOut size={18} strokeWidth={2.25} />,
      });
      window.location.assign("/auth/login");
    }
  };

  return (
    <div className={`app-shell is-${role} ${hasCollapsibleSidebar ? "has-collapsible-sidebar" : ""} ${collapsed ? "is-sidebar-collapsed" : ""} ${sidebarPeek.open ? "is-sidebar-peek" : ""}`}>
      <aside
        ref={asideRef}
        className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}
        {...sidebarPeek.handlers}
      >
        <div className="sidebar-head">
          <BrandLogo href="/" compact={collapsed} />
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>


        <nav className="sidebar-nav" aria-label="Navegação do painel">
          <small className="nav-group-label">MENU PRINCIPAL</small>
          {items.map((item) => (
            <button
              className={active === item.id ? "active" : ""}
              key={item.id}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              onClick={() => navigate(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && <em>{item.badge}</em>}
            </button>
          ))}
        </nav>

        {/* Empresa do usuário (só no painel da ME), logo acima do responsável. */}
        {role === "me" && (
          <div className="workspace-switcher is-footer">
            <span className="workspace-avatar">{companyAvatar}</span>
            <span>
              <small>MINHA EMPRESA</small>
              <strong>{companyName}</strong>
            </span>
          </div>
        )}

        <div className="sidebar-user">
          <span className="user-avatar">{userAvatar}</span>
          <span>
            <strong>{userName}</strong>
            <small>{isAdmin ? "Administrador" : isPublicManager ? "Gestor público" : "Responsável legal"}</small>
          </span>
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
          {hasCollapsibleSidebar && (
            <button
              className="icon-button topbar-sidebar-toggle"
              onClick={() => {
                cancelSidebarIntro();
                sidebarPeek.reset();
                setSidebarCollapsed((current) => !current);
              }}
              aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-expanded={!sidebarCollapsed}
              title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
            </button>
          )}
          <div className="topbar-actions">
            {!isPublicManager && <div className="notification-wrap">
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
                  <button onClick={() => { setNotificationsOpen(false); navigate(isAdmin ? "requests" : "opportunities"); }}>
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
                  <button onClick={() => { setNotificationsOpen(false); navigate(isAdmin ? "overview" : "radar"); }}>
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
            </div>}
            <Link className="portal-link" href={portalHref}>
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
        <main className="dashboard-content">
          {!isAdmin && (
            <SubscriptionBanner
              hideVisual={active === "subscription" || active === "assinatura"}
            />
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
