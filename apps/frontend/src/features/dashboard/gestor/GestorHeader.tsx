"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Select from "@radix-ui/react-select";
import { CalendarDays, Check, ChevronDown, ChevronUp, Landmark, LogOut, Printer } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SideMenuToggle } from "@/components/navigation/side-menu/SideMenu";
import { useLogout, useSessionKeepAlive } from "./useGestorSession";

export interface FilterOption {
  value: string;
  label: string;
}

// Lista do seletor no visual do PublicFilterSelect (classes public-filter-*),
// com busca quando há muitas opções. Fica dentro do Select.Content, que sai
// da tela ao fechar: a busca recomeça vazia a cada abertura.
function FilterList({ label, options }: { label: string; options: FilterOption[] }) {
  const [search, setSearch] = useState("");
  const showSearch = options.length > 5;
  const visibleOptions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term ? options.filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(term)) : options;
  }, [options, search]);

  return (
    <>
      {showSearch && <div className="public-filter-search-wrap">
        <input
          className="public-filter-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDownCapture={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onKeyUp={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          autoComplete="off"
          placeholder="Buscar"
          aria-label={`Buscar em ${label.toLowerCase()}`}
        />
      </div>}
      {showSearch && <Select.ScrollUpButton className="public-filter-scroll"><ChevronUp size={16} /></Select.ScrollUpButton>}
      <Select.Viewport className="public-filter-viewport">
        {visibleOptions.map((item) => (
          <Select.Item key={item.value} className="public-filter-item" value={item.value}>
            <Select.ItemText>{item.label}</Select.ItemText>
            <Select.ItemIndicator className="public-filter-check"><Check size={15} /></Select.ItemIndicator>
          </Select.Item>
        ))}
        {!visibleOptions.length && <p className="public-filter-empty">Nenhum resultado encontrado.</p>}
      </Select.Viewport>
      {showSearch && <Select.ScrollDownButton className="public-filter-scroll"><ChevronDown size={16} /></Select.ScrollDownButton>}
    </>
  );
}

function FilterOptions({ label, options }: { label: string; options: FilterOption[] }) {
  return (
    <Select.Portal>
      <Select.Content className="public-filter-content" position="popper" sideOffset={6} collisionPadding={12}>
        <FilterList label={label} options={options} />
      </Select.Content>
    </Select.Portal>
  );
}

// Seletor de ano no visual do PublicFilterSelect, mas controlado: a troca
// navega na hora, sem botão de enviar.
function GestorFilter({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="public-filter-select gs-filter gs-filter--year">
      <Select.Root value={value} disabled={disabled} onValueChange={onChange}>
        <Select.Trigger className="public-filter-trigger" aria-label={label}>
          <CalendarDays className="public-filter-leading" aria-hidden="true" />
          <span className="public-filter-copy">
            <small>{label}</small>
            <span className="public-filter-value"><Select.Value /></span>
          </span>
          <Select.Icon asChild><ChevronDown className="public-filter-chevron" aria-hidden="true" /></Select.Icon>
        </Select.Trigger>
        <FilterOptions label={label} options={options} />
      </Select.Root>
    </div>
  );
}

// Nome da prefeitura no cabeçalho: é também o seletor de município. Os dados
// são públicos, então o gestor pode abrir qualquer prefeitura do Ceará.
function MunicipalitySelect({
  value,
  name,
  options,
  disabled,
  onChange,
}: {
  value: string;
  name: string | null;
  options: FilterOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const title = name ? `Prefeitura de ${name}/CE` : "Prefeitura não identificada";
  return (
    <Select.Root value={value} disabled={disabled} onValueChange={onChange}>
      <Select.Trigger className="gs-topbar-city" aria-label="Escolher município" title={title}>
        <Landmark aria-hidden="true" />
        <span>
          <small>Painel do gestor</small>
          <b><Select.Value>{title}</Select.Value></b>
        </span>
        <Select.Icon asChild><ChevronDown className="gs-topbar-city-chevron" aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <FilterOptions label="Município" options={options} />
    </Select.Root>
  );
}

// Seções do painel: trocar o município ou o ano dentro de uma página de
// detalhe (uma licitação, um fornecedor) volta para a lista da seção, porque
// o item aberto pode não existir no novo recorte.
function sectionRoot(pathname: string): string {
  const [, gestor, section] = pathname.split("/");
  return section ? `/${gestor}/${section}` : `/${gestor}`;
}

export function GestorHeader({
  municipalityIbge,
  municipalityName,
  year,
  years,
  municipalities,
  userName,
}: {
  municipalityIbge: string;
  municipalityName: string | null;
  year: number;
  years: readonly number[];
  municipalities: FilterOption[];
  userName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const { logout, loggingOut } = useLogout();
  useSessionKeepAlive();

  // Os filtros ficam na URL (?municipio=&ano=), como na página de análise:
  // o link pode ser compartilhado e os dados são buscados no servidor.
  const navigate = (next: { municipio?: string; ano?: string }) => {
    const params = new URLSearchParams({ ano: String(year), municipio: municipalityIbge, ...next });
    startTransition(() => router.push(`${sectionRoot(pathname)}?${params.toString()}`, { scroll: false }));
  };

  const municipalityOptions = municipalities.some((item) => item.value === municipalityIbge)
    ? municipalities
    : [{ value: municipalityIbge, label: municipalityName ?? `Município ${municipalityIbge}` }, ...municipalities];

  return (
    <header className="gs-topbar" data-pending={pending || undefined}>
      <div className="gs-topbar-inner">
        <span className="gs-topbar-brand">
          <SideMenuToggle />
          <BrandLogo />
        </span>
        <MunicipalitySelect value={municipalityIbge} name={municipalityName} options={municipalityOptions} disabled={pending} onChange={(value) => navigate({ municipio: value })} />
        <div className="gs-topbar-filters">
          <GestorFilter label="Ano" value={String(year)} options={years.map((item) => ({ value: String(item), label: String(item) }))} disabled={pending} onChange={(value) => navigate({ ano: value })} />
        </div>
        <div className="gs-topbar-actions">
          <button type="button" className="gs-print-button" onClick={() => window.print()}>
            <Printer aria-hidden="true" /> <span>Imprimir relatório</span>
          </button>
          <button type="button" className="gs-logout-button" onClick={() => void logout()} disabled={loggingOut} title={`Sair (${userName})`}>
            <LogOut aria-hidden="true" /> <span>Sair</span>
          </button>
        </div>
      </div>
      <span className="gs-topbar-progress" aria-hidden="true" />
      {pending && <span className="gs-sr-only" role="status">Atualizando o painel…</span>}
    </header>
  );
}
