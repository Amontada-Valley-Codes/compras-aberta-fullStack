"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import "./side-menu.css";

/*
 * Menu lateral reutilizável, com vidro líquido (liquid glass).
 *
 *   <SideMenuProvider defaultCollapsed>
 *     <header><SideMenuToggle /> <BrandLogo /></header>
 *     <div style={{ display: "flex" }}>
 *       <SideMenu items={itens} activeId="inicio" />
 *       <main>…</main>
 *     </div>
 *   </SideMenuProvider>
 *
 * - O botão de três barras recolhe o menu, que passa a mostrar só os ícones.
 *   Por padrão a escolha vale até recarregar a página; com storageKey ela
 *   fica salva no navegador.
 * - Recolhido, o menu se expande enquanto o mouse está sobre ele (ou o foco
 *   do teclado está dentro dele), mostrando os títulos e empurrando o
 *   conteúdo ao lado.
 * - O menu acompanha a rolagem da página (fica fixo abaixo do cabeçalho).
 * - Em telas até 900px o menu vira uma gaveta aberta pelo mesmo botão.
 * - --sm-top (CSS) define a distância do topo, para ficar abaixo de um
 *   cabeçalho fixo.
 */

export interface SideMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  // Com href vira link (next/link); sem href, botão que chama onSelect.
  href?: string;
  onSelect?: () => void;
  badge?: string;
}

const MOBILE_QUERY = "(max-width: 900px)";

interface SideMenuState {
  collapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  ready: boolean;
  menuId: string;
  toggle: () => void;
  closeMobile: () => void;
}

const SideMenuContext = createContext<SideMenuState | null>(null);

export function useSideMenu(): SideMenuState {
  const context = useContext(SideMenuContext);
  if (!context) throw new Error("useSideMenu precisa estar dentro de <SideMenuProvider>.");
  return context;
}

export function SideMenuProvider({
  children,
  storageKey,
  defaultCollapsed = false,
}: {
  children: ReactNode;
  // Sem storageKey o menu sempre abre no estado padrão (defaultCollapsed).
  storageKey?: string;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // As transições só ligam depois de ler a preferência salva, para o menu
  // não "animar" o ajuste inicial ao carregar a página.
  const [ready, setReady] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (storageKey) {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved !== null) setCollapsed(saved === "1");
      } catch {
        // Navegação anônima ou armazenamento bloqueado: usa o padrão.
      }
    }
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileOpen(false);
    };
    sync();
    media.addEventListener("change", sync);
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => {
      media.removeEventListener("change", sync);
      window.cancelAnimationFrame(frame);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggle = useCallback(() => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      setMobileOpen((open) => !open);
      return;
    }
    setCollapsed((current) => {
      const next = !current;
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, next ? "1" : "0");
        } catch {
          // Sem armazenamento, a escolha vale só até recarregar a página.
        }
      }
      return next;
    });
  }, [storageKey]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SideMenuContext.Provider value={{ collapsed, mobileOpen, isMobile, ready, menuId, toggle, closeMobile }}>
      {children}
    </SideMenuContext.Provider>
  );
}

export function SideMenuToggle({ className = "" }: { className?: string }) {
  const { collapsed, mobileOpen, isMobile, menuId, toggle } = useSideMenu();
  const expanded = isMobile ? mobileOpen : !collapsed;
  const label = isMobile
    ? mobileOpen ? "Fechar menu" : "Abrir menu"
    : collapsed ? "Expandir menu" : "Recolher menu";

  return (
    <button
      type="button"
      className={`sm-toggle ${className}`}
      aria-controls={menuId}
      aria-expanded={expanded}
      aria-label={label}
      title={label}
      data-collapsed={collapsed}
      data-open={mobileOpen}
      onClick={toggle}
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>
  );
}

function MenuEntry({ item, active, onNavigate }: { item: SideMenuItem; active: boolean; onNavigate: () => void }) {
  const content = (
    <>
      <span className="sm-icon" aria-hidden="true">{item.icon}</span>
      <span className="sm-label">{item.label}</span>
      {item.badge && <em className="sm-badge">{item.badge}</em>}
    </>
  );

  if (item.href) {
    return (
      <Link
        className="sm-link"
        href={item.href}
        aria-current={active ? "page" : undefined}
        data-active={active}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="sm-link"
      data-active={active}
      onClick={() => {
        item.onSelect?.();
        onNavigate();
      }}
    >
      {content}
    </button>
  );
}

export function SideMenu({
  items,
  activeId,
  footerItems = [],
  label = "Menu principal",
  className = "",
}: {
  items: SideMenuItem[];
  activeId?: string;
  footerItems?: SideMenuItem[];
  label?: string;
  className?: string;
}) {
  const { collapsed, mobileOpen, ready, menuId, closeMobile } = useSideMenu();

  const renderList = (list: SideMenuItem[], offset: number, extraClass = "") => (
    <ul className={`sm-list ${extraClass}`}>
      {list.map((item, index) => (
        <li key={item.id} style={{ "--sm-i": index + offset } as CSSProperties}>
          <MenuEntry item={item} active={item.id === activeId} onNavigate={closeMobile} />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <aside
        className={`sm-root ${className}`}
        data-collapsed={collapsed}
        data-open={mobileOpen}
        data-ready={ready}
      >
        <div className="sm-panel" id={menuId}>
          <nav className="sm-nav" aria-label={label}>
            {renderList(items, 0)}
          </nav>
          {footerItems.length > 0 && renderList(footerItems, items.length, "sm-footer")}
        </div>
      </aside>
      {mobileOpen && <button type="button" className="sm-backdrop" aria-label="Fechar menu" onClick={closeMobile} />}
    </>
  );
}
