"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  MoreHorizontal,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { CompanyCnae } from "@/hooks/useUserProfile";
import type {
  CompanyMatchProfile,
  EnrichedMeBid,
  MeBidSortBy,
  MePaginatedBidsRequest,
} from "./cnae-match";
import {
  useMeOpenBidsQuery,
  useMePaginatedBidsQuery,
} from "./use-me-licitacoes";
import {
  BRAZIL_STATES,
  RADAR_SECTORS,
  RADAR_SPHERES,
  countRadarKeywords,
  createDefaultRadarConfig,
  type RadarFilterConfig,
  type SavedRadarFilter,
} from "./radar-types";
import { RadarFilterSidebar } from "./RadarFilterSidebar";
import { MeBidCard } from "./MeBidCard";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import type { TrackedBid } from "./workspace-types";

const PAGE_SIZES = [10, 20, 30] as const;

function buildPageList(current: number, total: number): Array<number | "gap"> {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  return pages.flatMap((p, idx) =>
    idx > 0 && p - pages[idx - 1] > 1 ? (["gap", p] as const) : [p],
  );
}

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface MeRadarViewProps {
  companyMatchProfile: CompanyMatchProfile;
  companyCnaes: CompanyCnae[];
  extraKeywords: string[];
  companyCity: string | null;
  savedFilters: SavedRadarFilter[];
  savingFilter: boolean;
  onCreateFilter: (payload: {
    name: string;
    isDefault?: boolean;
    config: RadarFilterConfig;
  }) => Promise<SavedRadarFilter>;
  onUpdateFilter: (
    id: string,
    payload: {
      name: string;
      isDefault?: boolean;
      config: RadarFilterConfig;
    },
  ) => Promise<SavedRadarFilter>;
  onDeleteFilter: (id: string) => Promise<void>;
  savedBidIds: Set<string>;
  trackedBidsMap?: Map<string, TrackedBid>;
  hiddenBidIds: Set<string>;
  hiddenBidIdsList: string[];
  onToggleSaveBid: (bidId: string) => void;
  onToggleAnalysisBid?: (bid: EnrichedMeBid) => void;
  onParticipateBid?: (bid: EnrichedMeBid) => void;
  onManageBid?: (bid: EnrichedMeBid) => void;
  onToggleHideBid: (bidId: string) => void;
  onOpenBidDetail: (bid: EnrichedMeBid) => void;
  onOpenBidChat: (bid: EnrichedMeBid) => void;
}

export function MeRadarView({
  companyMatchProfile,
  companyCnaes,
  extraKeywords,
  companyCity,
  savedFilters,
  savingFilter,
  onCreateFilter,
  onUpdateFilter,
  onDeleteFilter,
  savedBidIds,
  trackedBidsMap,
  hiddenBidIds,
  hiddenBidIdsList,
  onToggleSaveBid,
  onToggleAnalysisBid,
  onParticipateBid,
  onManageBid,
  onToggleHideBid,
  onOpenBidDetail,
  onOpenBidChat,
}: MeRadarViewProps) {
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [radarConfig, setRadarConfig] = useState<RadarFilterConfig>(() =>
    createDefaultRadarConfig({
      radiusBaseCity: companyCity ?? "",
    }),
  );
  const initializedDefaultRef = useRef(false);

  useEffect(() => {
    if (initializedDefaultRef.current || savedFilters.length === 0) return;
    initializedDefaultRef.current = true;
    const def = savedFilters.find((f) => f.isDefault) ?? savedFilters[0];
    if (def) {
      setActiveFilterId(def.id);
      setRadarConfig(createDefaultRadarConfig(def.config));
    }
  }, [savedFilters]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<MeBidSortBy>("match");
  const [onlyHidden, setOnlyHidden] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQuery("");
      return;
    }
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, radarConfig, sortBy, onlyHidden]);

  const { refreshPncp, isRefreshingPncp } = useMeOpenBidsQuery(
    "",
    radarConfig.uf || "CE",
  );

  const requestParams: MePaginatedBidsRequest = useMemo(
    () => ({
      uf: radarConfig.uf || "CE",
      page,
      pageSize,
      query: debouncedQuery || undefined,
      sortBy,
      hiddenBidIds: hiddenBidIdsList,
      onlyHidden: onlyHidden || undefined,
      radarConfig,
      companyProfile: companyMatchProfile,
    }),
    [
      radarConfig,
      page,
      pageSize,
      debouncedQuery,
      sortBy,
      hiddenBidIdsList,
      onlyHidden,
      companyMatchProfile,
    ],
  );

  const {
    data: pageData,
    isLoading: pageLoading,
    isFetching: pageFetching,
    isPlaceholderData,
    error: pageError,
    prefetchPage,
  } = useMePaginatedBidsQuery(requestParams);

  const items = pageData?.items ?? [];
  const totalItems = pageData?.totalItems ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const currentPage = pageData?.page ?? page;
  const firstIndex = (currentPage - 1) * pageSize;
  const meta = pageData?.meta ?? null;
  const errorMessage = pageError instanceof Error ? pageError.message : null;

  const currentStateName = useMemo(
    () =>
      BRAZIL_STATES.find((s) => s.uf === (radarConfig.uf || "CE"))?.name ??
      radarConfig.uf,
    [radarConfig.uf],
  );

  // Chips visíveis dos filtros aplicados para remoção rápida em 1 clique
  const activeFilterChips: ActiveChip[] = useMemo(() => {
    const chips: ActiveChip[] = [];

    const totalWords = countRadarKeywords(radarConfig.keywordGroups);
    if (totalWords > 0) {
      chips.push({
        key: "keywords",
        label:
          totalWords === 1
            ? "1 palavra filtrada"
            : `${totalWords} palavras filtradas`,
        onRemove: () =>
          setRadarConfig((prev) => ({
            ...prev,
            keywordGroups: [
              {
                id: "grupo-1",
                name: "Grupo 1",
                keywords: [],
                desiredWords: [],
                excludedWords: [],
              },
            ],
          })),
      });
    }

    if (radarConfig.modality) {
      chips.push({
        key: "modality",
        label: radarConfig.modality,
        onRemove: () => setRadarConfig((prev) => ({ ...prev, modality: "" })),
      });
    }

    if (radarConfig.sector) {
      const secLabel =
        RADAR_SECTORS.find((s) => s.id === radarConfig.sector)?.label ??
        radarConfig.sector;
      chips.push({
        key: "sector",
        label: `Setor: ${secLabel}`,
        onRemove: () => setRadarConfig((prev) => ({ ...prev, sector: "" })),
      });
    }

    if (radarConfig.locationMode === "radius") {
      const base =
        radarConfig.radiusBaseCity || companyCity || radarConfig.uf || "CE";
      chips.push({
        key: "radius",
        label: `Até ${radarConfig.radiusKm ?? 100} km de ${base}`,
        onRemove: () =>
          setRadarConfig((prev) => ({ ...prev, locationMode: "state_city" })),
      });
    } else if (radarConfig.city) {
      chips.push({
        key: "city",
        label: `${radarConfig.city}/${radarConfig.uf}`,
        onRemove: () => setRadarConfig((prev) => ({ ...prev, city: "" })),
      });
    }

    if (radarConfig.portal) {
      chips.push({
        key: "portal",
        label: `Portal: ${radarConfig.portal}`,
        onRemove: () => setRadarConfig((prev) => ({ ...prev, portal: "" })),
      });
    }

    if (radarConfig.sphere) {
      const spLabel =
        RADAR_SPHERES.find((s) => s.value === radarConfig.sphere)?.label ??
        radarConfig.sphere;
      chips.push({
        key: "sphere",
        label: `Esfera: ${spLabel}`,
        onRemove: () => setRadarConfig((prev) => ({ ...prev, sphere: "" })),
      });
    }

    if (radarConfig.srp.length === 1) {
      chips.push({
        key: "srp",
        label:
          radarConfig.srp[0] === "yes"
            ? "Com Registro de Preço"
            : "Sem Registro de Preço",
        onRemove: () => setRadarConfig((prev) => ({ ...prev, srp: [] })),
      });
    }

    if (radarConfig.kind.length === 1) {
      chips.push({
        key: "kind",
        label: radarConfig.kind[0] === "material" ? "Material" : "Serviço",
        onRemove: () => setRadarConfig((prev) => ({ ...prev, kind: [] })),
      });
    }

    if (
      radarConfig.minTotalValue !== null ||
      radarConfig.maxTotalValue !== null
    ) {
      const min =
        radarConfig.minTotalValue != null
          ? `R$ ${radarConfig.minTotalValue.toLocaleString("pt-BR")}`
          : "R$ 0";
      const max =
        radarConfig.maxTotalValue != null
          ? `R$ ${radarConfig.maxTotalValue.toLocaleString("pt-BR")}`
          : "sem teto";
      chips.push({
        key: "totalVal",
        label: `Total: ${min} – ${max}`,
        onRemove: () =>
          setRadarConfig((prev) => ({
            ...prev,
            minTotalValue: null,
            maxTotalValue: null,
          })),
      });
    }

    if (
      radarConfig.minItemValue !== null ||
      radarConfig.maxItemValue !== null
    ) {
      const min =
        radarConfig.minItemValue != null
          ? `R$ ${radarConfig.minItemValue.toLocaleString("pt-BR")}`
          : "R$ 0";
      const max =
        radarConfig.maxItemValue != null
          ? `R$ ${radarConfig.maxItemValue.toLocaleString("pt-BR")}`
          : "sem teto";
      chips.push({
        key: "itemVal",
        label: `Item: ${min} – ${max}`,
        onRemove: () =>
          setRadarConfig((prev) => ({
            ...prev,
            minItemValue: null,
            maxItemValue: null,
          })),
      });
    }

    return chips;
  }, [radarConfig, companyCity]);

  const hasAnyCustomFilter = Boolean(
    query.trim() || activeFilterChips.length > 0 || onlyHidden,
  );

  const handleSelectSavedFilter = (saved: SavedRadarFilter | null) => {
    if (!saved) {
      setActiveFilterId(null);
      return;
    }
    setActiveFilterId(saved.id);
    setRadarConfig(createDefaultRadarConfig(saved.config));
  };

  const handleSaveFilter = async (payload: {
    id?: string | null;
    name: string;
    isDefault?: boolean;
    config: RadarFilterConfig;
  }) => {
    if (payload.id) {
      const updated = await onUpdateFilter(payload.id, {
        name: payload.name,
        isDefault: payload.isDefault,
        config: payload.config,
      });
      setActiveFilterId(updated.id);
    } else {
      const created = await onCreateFilter({
        name: payload.name,
        isDefault: payload.isDefault,
        config: payload.config,
      });
      setActiveFilterId(created.id);
    }
  };

  const handleDeleteFilter = async (id: string) => {
    await onDeleteFilter(id);
    if (activeFilterId === id) {
      setActiveFilterId(null);
      setRadarConfig(
        createDefaultRadarConfig({
          radiusBaseCity: companyCity ?? "",
        }),
      );
    }
  };

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    setPage(clamped);
    const el = resultsTopRef.current;
    if (el && el.getBoundingClientRect().top < 84) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="dashboard-page radar-page">
      <header className="radar-page__header">
        <div>
          <span className="radar-page__eyebrow">
            <Radio size={14} />
            CONSULTA PNCP EM TEMPO REAL
          </span>
          <h1>Radar de Licitações</h1>
          <p>
            Filtre editais abertos por palavras-chave, setor, localização,
            portal de disputa e faixa de valor, e salve suas buscas frequentes.
          </p>
        </div>

        <button
          type="button"
          className="radar-mobile-filter-btn"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
        >
          <SlidersHorizontal size={16} />
          <span>
            {mobileFiltersOpen
              ? "Ocultar filtros"
              : activeFilterChips.length > 0
                ? `Filtros (${activeFilterChips.length})`
                : "Filtros"}
          </span>
        </button>
      </header>

      <div className="radar-workspace">
        {/* Coluna Esquerda: Painel de Filtros do Radar */}
        <div
          className={`radar-workspace__sidebar ${mobileFiltersOpen ? "is-open" : ""}`}
        >
          <RadarFilterSidebar
            config={radarConfig}
            onChange={setRadarConfig}
            savedFilters={savedFilters}
            activeFilterId={activeFilterId}
            onSelectSavedFilter={handleSelectSavedFilter}
            onSaveFilter={handleSaveFilter}
            onDeleteFilter={handleDeleteFilter}
            savingFilter={savingFilter}
            companyCnaes={companyCnaes}
            extraKeywords={extraKeywords}
            companyCity={companyCity}
            facets={{
              cities: pageData?.facets.cities ?? [],
              modalities: pageData?.facets.modalities ?? [],
              portals: pageData?.facets.portals ?? [],
            }}
          />
        </div>

        {/* Coluna Direita: Barra de controle + Cards de Licitação */}
        <div className="radar-workspace__feed" ref={resultsTopRef}>
          <div className="radar-feed-toolbar">
            <label className="radar-feed-search">
              <Search size={17} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no objeto, nº do edital ou órgão comprador…"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            <div className="radar-feed-controls">
              <PublicFilterSelect
                name="radar-ordenar"
                label="Ordenar por"
                icon="sort"
                variant="dashboard"
                value={sortBy}
                options={[
                  { value: "match", label: "Maior aderência" },
                  { value: "deadline", label: "Prazo mais próximo" },
                  { value: "value", label: "Maior valor" },
                  { value: "recent", label: "Mais recentes" },
                ]}
                onValueChange={(val) =>
                  setSortBy((val as MeBidSortBy) || "match")
                }
              />

              {hiddenBidIds.size > 0 && (
                <button
                  type="button"
                  className={`radar-hidden-toggle ${onlyHidden ? "is-active" : ""}`}
                  onClick={() => setOnlyHidden((prev) => !prev)}
                  title="Visualizar licitações ocultadas"
                >
                  <EyeOff size={14} />
                  <span>Ocultas ({hiddenBidIds.size})</span>
                </button>
              )}

              <button
                type="button"
                className="opp-refresh-btn"
                onClick={() => refreshPncp()}
                disabled={isRefreshingPncp || pageLoading}
                title="Sincronizar novamente com o PNCP"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshingPncp ? "is-spinning" : ""}
                />
                <span>{isRefreshingPncp ? "Sincronizando…" : "Atualizar"}</span>
              </button>
            </div>
          </div>

          {/* Chips de filtros ativos */}
          {activeFilterChips.length > 0 && (
            <div className="radar-active-chips">
              {activeFilterChips.map((chip) => (
                <span key={chip.key} className="radar-active-chip">
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remover filtro ${chip.label}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              <button
                type="button"
                className="radar-active-chips__clear"
                onClick={() => {
                  setQuery("");
                  setOnlyHidden(false);
                  setActiveFilterId(null);
                  setRadarConfig(
                    createDefaultRadarConfig({
                      uf: radarConfig.uf,
                      radiusBaseCity: companyCity ?? "",
                    }),
                  );
                }}
              >
                Limpar todos
              </button>
            </div>
          )}

          {/* Limpar busca se ativa sem chips */}
          {hasAnyCustomFilter && activeFilterChips.length === 0 && (
            <div className="radar-feed-meta">
              <button
                type="button"
                className="opp-clear-filters"
                onClick={() => {
                  setQuery("");
                  setOnlyHidden(false);
                }}
              >
                Limpar busca
              </button>
            </div>
          )}

          {errorMessage && (
            <section className="dashboard-card empty-state">
              <AlertTriangle />
              <h2>Erro ao consultar o PNCP</h2>
              <p>{errorMessage}</p>
            </section>
          )}

          {pageLoading ? (
            <section className="dashboard-card empty-state">
              <RefreshCw className="is-spinning" />
              <h2>Consultando editais abertos em {currentStateName}…</h2>
              <p>Carregando licitações com propostas abertas no PNCP.</p>
            </section>
          ) : items.length === 0 && !errorMessage ? (
            <section className="dashboard-card empty-state">
              <Radio size={28} />
              <h2>
                {onlyHidden
                  ? "Nenhuma licitação oculta neste estado"
                  : "Nenhuma licitação aberta encontrada com esses filtros"}
              </h2>
              <p>
                {onlyHidden
                  ? "Desative a visualização de ocultas para voltar à lista principal."
                  : "Experimente remover algum filtro ativo acima, ampliar o raio de distância ou ajustar as palavras-chave."}
              </p>
            </section>
          ) : (
            <>
              <div
                className={`me-bid-cards-stack ${isPlaceholderData ? "is-placeholder" : ""}`}
              >
                {items.map((bid) => (
                  <MeBidCard
                    key={bid.id}
                    bid={bid}
                    isSaved={savedBidIds.has(bid.id)}
                    trackedBid={trackedBidsMap?.get(bid.id) ?? null}
                    isHidden={hiddenBidIds.has(bid.id)}
                    onToggleSave={onToggleSaveBid}
                    onToggleAnalysis={onToggleAnalysisBid}
                    onParticipate={onParticipateBid}
                    onManage={onManageBid}
                    onToggleHide={onToggleHideBid}
                    onOpenDetail={onOpenBidDetail}
                    onOpenChat={onOpenBidChat}
                  />
                ))}
              </div>

              {totalItems > PAGE_SIZES[0] && (
                <div className="opp-pagination">
                  <p className="opp-pagination-count">
                    Mostrando <b>{firstIndex + 1}</b> a{" "}
                    <b>{firstIndex + items.length}</b> de <b>{totalItems}</b>
                  </p>

                  <div
                    className="opp-page-size"
                    role="group"
                    aria-label="Licitações por página"
                  >
                    <span>Por página</span>
                    <div className="opp-page-size-options">
                      {PAGE_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`opp-page-size-btn ${pageSize === size ? "is-active" : ""}`}
                          onClick={() => {
                            setPageSize(size);
                            setPage(1);
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <nav
                      className="opp-pagination-nav"
                      aria-label="Paginação do Radar"
                    >
                      <ul className="opp-pagination-list">
                        <li>
                          <button
                            type="button"
                            className="opp-page-control"
                            disabled={currentPage === 1}
                            onMouseEnter={() => prefetchPage(currentPage - 1)}
                            onClick={() => goToPage(currentPage - 1)}
                          >
                            <ChevronLeft size={17} />
                            <span>Anterior</span>
                          </button>
                        </li>

                        {buildPageList(currentPage, totalPages).map(
                          (entry, idx) =>
                            entry === "gap" ? (
                              <li key={`gap-${idx}`}>
                                <span className="opp-page-ellipsis">
                                  <MoreHorizontal size={16} />
                                </span>
                              </li>
                            ) : (
                              <li key={entry}>
                                <button
                                  type="button"
                                  className={`opp-page-btn ${entry === currentPage ? "is-active" : ""}`}
                                  onMouseEnter={() => prefetchPage(entry)}
                                  onClick={() => goToPage(entry)}
                                >
                                  {entry}
                                </button>
                              </li>
                            ),
                        )}

                        <li>
                          <button
                            type="button"
                            className="opp-page-control"
                            disabled={currentPage === totalPages}
                            onMouseEnter={() => prefetchPage(currentPage + 1)}
                            onClick={() => goToPage(currentPage + 1)}
                          >
                            <span>Próxima</span>
                            <ChevronRight size={17} />
                          </button>
                        </li>
                      </ul>
                    </nav>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
