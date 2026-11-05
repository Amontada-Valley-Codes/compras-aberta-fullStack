"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import type { CompanyCnae } from "@/hooks/useUserProfile";
import {
  BRAZIL_STATES,
  MAX_RADAR_KEYWORDS,
  RADAR_RADIUS_OPTIONS,
  RADAR_SECTORS,
  RADAR_SPHERES,
  countRadarKeywords,
  createDefaultRadarConfig,
  createEmptyKeywordGroup,
  type KeywordGroup,
  type RadarFilterConfig,
  type SavedRadarFilter,
} from "./radar-types";

/* ---------- Campo de Select Customizado (sem cara de select nativo do SO) ---------- */

interface SelectOption {
  value: string;
  label: string;
}

interface RadarSelectProps {
  label: string;
  value: string;
  placeholder: string;
  options: SelectOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  onChange: (nextValue: string) => void;
}

function RadarSelect({
  label,
  value,
  placeholder,
  options,
  searchable,
  searchPlaceholder = "Pesquisar…",
  clearable = true,
  onChange,
}: RadarSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const enableSearch = searchable ?? options.length > 7;

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return options.find((o) => o.value === value)?.label ?? value;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const hasValue = Boolean(value);

  return (
    <div className="radar-field" ref={wrapRef}>
      <span className="radar-field__label">{label}</span>

      <div className="radar-dropdown">
        <div
          className={`radar-dropdown__control ${open ? "is-open" : ""} ${hasValue ? "has-value" : ""}`}
        >
          <button
            type="button"
            className="radar-dropdown__trigger"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className={hasValue ? "" : "is-placeholder"}>
              {selectedLabel || placeholder}
            </span>
          </button>

          <div className="radar-dropdown__icons">
            {clearable && hasValue && (
              <button
                type="button"
                className="radar-dropdown__clear"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }}
                aria-label={`Limpar ${label}`}
                title="Limpar seleção"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="button"
              className="radar-dropdown__chevron"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setOpen((prev) => !prev)}
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </div>

        {open && (
          <div className="radar-dropdown__popover" role="listbox">
            {enableSearch && (
              <div className="radar-dropdown__search">
                <Search size={14} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Limpar busca"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            <div className="radar-dropdown__list">
              {clearable && (
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={`radar-dropdown__option ${!value ? "is-selected" : ""}`}
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span>{placeholder}</span>
                  {!value && <Check size={14} />}
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <p className="radar-dropdown__empty">Nenhum resultado</p>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`radar-dropdown__option ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check size={14} />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Campo de Tags de Palavras-Chave com botão [+] separado ---------- */

interface KeywordFieldProps {
  label: string;
  hint?: string;
  placeholder: string;
  tone: "primary" | "desired" | "excluded";
  words: string[];
  disabledAdd: boolean;
  onAdd: (word: string) => void;
  onRemove: (word: string) => void;
}

function KeywordTagInput({
  label,
  hint,
  placeholder,
  tone,
  words,
  disabledAdd,
  onAdd,
  onRemove,
}: KeywordFieldProps) {
  const [draft, setDraft] = useState("");

  const commitDraft = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    for (const p of parts) {
      onAdd(p);
    }
    setDraft("");
  };

  return (
    <div className="radar-kw-field">
      <div className="radar-kw-field__top">
        <label className="radar-kw-label">{label}</label>
        {hint && <span className={`radar-kw-hint is-${tone}`}>{hint}</span>}
      </div>

      <div className="radar-kw-entry">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          placeholder={placeholder}
          disabled={disabledAdd}
        />
        <button
          type="button"
          className="radar-kw-plus-btn"
          onClick={commitDraft}
          disabled={disabledAdd || !draft.trim()}
          aria-label={`Adicionar em ${label}`}
          title="Adicionar termo"
        >
          <Plus size={16} />
        </button>
      </div>

      {words.length > 0 && (
        <div className="radar-kw-chips">
          {words.map((w) => (
            <span key={w} className={`radar-kw-chip is-${tone}`}>
              <span>{w}</span>
              <button
                type="button"
                onClick={() => onRemove(w)}
                aria-label={`Remover ${w}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Painel Principal de Filtros do Radar ---------- */

export interface RadarFilterSidebarProps {
  config: RadarFilterConfig;
  onChange: (next: RadarFilterConfig) => void;
  savedFilters: SavedRadarFilter[];
  activeFilterId: string | null;
  onSelectSavedFilter: (filter: SavedRadarFilter | null) => void;
  onSaveFilter: (payload: {
    id?: string | null;
    name: string;
    isDefault?: boolean;
    config: RadarFilterConfig;
  }) => Promise<void>;
  onDeleteFilter: (id: string) => Promise<void>;
  savingFilter: boolean;
  companyCnaes: CompanyCnae[];
  extraKeywords: string[];
  companyCity: string | null;
  facets: {
    cities: string[];
    modalities: string[];
    portals: string[];
  };
}

export function RadarFilterSidebar({
  config,
  onChange,
  savedFilters,
  activeFilterId,
  onSelectSavedFilter,
  onSaveFilter,
  onDeleteFilter,
  savingFilter,
  companyCnaes,
  extraKeywords,
  companyCity,
  facets,
}: RadarFilterSidebarProps) {
  const activeSaved = useMemo(
    () => savedFilters.find((f) => f.id === activeFilterId) ?? null,
    [savedFilters, activeFilterId],
  );

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterNameInput, setFilterNameInput] = useState("");
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  const [minTotalStr, setMinTotalStr] = useState(
    config.minTotalValue != null ? String(config.minTotalValue) : "",
  );
  const [maxTotalStr, setMaxTotalStr] = useState(
    config.maxTotalValue != null ? String(config.maxTotalValue) : "",
  );
  const [minItemStr, setMinItemStr] = useState(
    config.minItemValue != null ? String(config.minItemValue) : "",
  );
  const [maxItemStr, setMaxItemStr] = useState(
    config.maxItemValue != null ? String(config.maxItemValue) : "",
  );

  useEffect(() => {
    setMinTotalStr(
      config.minTotalValue != null ? String(config.minTotalValue) : "",
    );
    setMaxTotalStr(
      config.maxTotalValue != null ? String(config.maxTotalValue) : "",
    );
    setMinItemStr(
      config.minItemValue != null ? String(config.minItemValue) : "",
    );
    setMaxItemStr(
      config.maxItemValue != null ? String(config.maxItemValue) : "",
    );
  }, [
    config.minTotalValue,
    config.maxTotalValue,
    config.minItemValue,
    config.maxItemValue,
  ]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        menuWrapRef.current &&
        !menuWrapRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const totalWordsCount = useMemo(
    () => countRadarKeywords(config.keywordGroups),
    [config.keywordGroups],
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (totalWordsCount > 0) count += 1;
    if (config.modality) count += 1;
    if (config.sector) count += 1;
    if (config.locationMode === "radius") count += 1;
    else if (config.city) count += 1;
    if (config.uf && config.uf !== "CE") count += 1;
    if (config.portal) count += 1;
    if (config.sphere) count += 1;
    if (config.srp.length > 0) count += 1;
    if (config.kind.length > 0) count += 1;
    if (config.minTotalValue !== null || config.maxTotalValue !== null)
      count += 1;
    if (config.minItemValue !== null || config.maxItemValue !== null)
      count += 1;
    return count;
  }, [config, totalWordsCount]);

  const patchConfig = (patch: Partial<RadarFilterConfig>) => {
    onChange({ ...config, ...patch });
  };

  // Debounce dos campos de faixa de valor
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parseNum = (s: string): number | null => {
        const cleaned = s.replace(/\./g, "").replace(/[^\d,]/g, "").replace(",", ".");
        if (!cleaned) return null;
        const n = Number.parseFloat(cleaned);
        return Number.isFinite(n) && n >= 0 ? n : null;
      };
      const nextMinT = parseNum(minTotalStr);
      const nextMaxT = parseNum(maxTotalStr);
      const nextMinI = parseNum(minItemStr);
      const nextMaxI = parseNum(maxItemStr);

      if (
        nextMinT !== config.minTotalValue ||
        nextMaxT !== config.maxTotalValue ||
        nextMinI !== config.minItemValue ||
        nextMaxI !== config.maxItemValue
      ) {
        onChange({
          ...config,
          minTotalValue: nextMinT,
          maxTotalValue: nextMaxT,
          minItemValue: nextMinI,
          maxItemValue: nextMaxI,
        });
      }
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minTotalStr, maxTotalStr, minItemStr, maxItemStr]);

  const updateGroup = (
    groupId: string,
    updater: (group: KeywordGroup) => KeywordGroup,
  ) => {
    const nextGroups = config.keywordGroups.map((g) =>
      g.id === groupId ? updater(g) : g,
    );
    patchConfig({ keywordGroups: nextGroups });
  };

  const addWordToGroup = (
    groupId: string,
    field: "keywords" | "desiredWords" | "excludedWords",
    word: string,
  ) => {
    if (totalWordsCount >= MAX_RADAR_KEYWORDS) {
      toast.error(`Limite de ${MAX_RADAR_KEYWORDS} palavras atingido.`);
      return;
    }
    const clean = word.trim();
    if (!clean) return;
    updateGroup(groupId, (grp) => {
      const exists = grp[field].some(
        (item) => item.toLowerCase() === clean.toLowerCase(),
      );
      if (exists) return grp;
      return { ...grp, [field]: [...grp[field], clean] };
    });
  };

  const removeWordFromGroup = (
    groupId: string,
    field: "keywords" | "desiredWords" | "excludedWords",
    word: string,
  ) => {
    updateGroup(groupId, (grp) => ({
      ...grp,
      [field]: grp[field].filter((item) => item !== word),
    }));
  };

  const handleAddGroup = () => {
    if (config.keywordGroups.length >= 15) return;
    const nextIdx = config.keywordGroups.length + 1;
    patchConfig({
      keywordGroups: [
        ...config.keywordGroups,
        createEmptyKeywordGroup(nextIdx),
      ],
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    if (config.keywordGroups.length <= 1) {
      patchConfig({
        keywordGroups: [
          {
            ...config.keywordGroups[0],
            keywords: [],
            desiredWords: [],
            excludedWords: [],
          },
        ],
      });
      return;
    }
    patchConfig({
      keywordGroups: config.keywordGroups.filter((g) => g.id !== groupId),
    });
  };

  const handleImportFromCnae = () => {
    const suggestions = new Set<string>();
    for (const kw of extraKeywords) {
      if (kw.trim()) suggestions.add(kw.trim().toLowerCase());
    }
    for (const cnae of companyCnaes) {
      const words = cnae.descricao
        .split(/[,;/-]+|\s+de\s+|\s+e\s+/i)
        .map((s) => s.trim().toLowerCase())
        .filter(
          (s) =>
            s.length >= 4 &&
            !s.startsWith("comércio") &&
            !s.startsWith("comercio") &&
            !s.startsWith("serviços") &&
            !s.startsWith("atividades"),
        );
      for (const w of words.slice(0, 4)) {
        if (w.length <= 36) suggestions.add(w);
      }
    }

    const list = Array.from(suggestions).slice(0, 8);
    if (list.length === 0) {
      toast.info(
        "Cadastre seu CNAE ou palavras extras na aba Perfil e CNAE para importar termos.",
      );
      return;
    }

    const firstGroup = config.keywordGroups[0] ?? createEmptyKeywordGroup(1);
    const merged = Array.from(new Set([...firstGroup.keywords, ...list]));
    patchConfig({
      keywordGroups: [
        { ...firstGroup, keywords: merged },
        ...config.keywordGroups.slice(1),
      ],
    });
    toast.success("Termos do seu CNAE adicionados ao Grupo 1.");
  };

  const handleResetAll = () => {
    onSelectSavedFilter(null);
    onChange(
      createDefaultRadarConfig({
        uf: config.uf || "CE",
        radiusBaseCity: companyCity ?? "",
      }),
    );
    setMenuOpen(false);
  };

  const openSaveModal = () => {
    setFilterNameInput(activeSaved?.name ?? "");
    setSaveDialogOpen((prev) => !prev);
    setMenuOpen(false);
  };

  const handleConfirmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = filterNameInput.trim() || "Meu filtro";
    await onSaveFilter({
      id: activeSaved?.id ?? null,
      name: cleanName,
      isDefault: activeSaved?.isDefault ?? savedFilters.length === 0,
      config,
    });
    setSaveDialogOpen(false);
    toast.success(`Filtro "${cleanName}" salvo na sua conta.`);
  };

  const toggleCheckboxItem = <T extends string>(list: T[], item: T): T[] => {
    return list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item];
  };

  const modalityOptions = useMemo(
    () => facets.modalities.map((m) => ({ value: m, label: m })),
    [facets.modalities],
  );

  const sectorOptions = useMemo(
    () => RADAR_SECTORS.map((s) => ({ value: s.id, label: s.label })),
    [],
  );

  const stateOptions = useMemo(
    () =>
      BRAZIL_STATES.map((st) => ({
        value: st.uf,
        label: `${st.name} (${st.uf})`,
      })),
    [],
  );

  const cityOptions = useMemo(
    () => facets.cities.map((c) => ({ value: c, label: c })),
    [facets.cities],
  );

  const portalOptions = useMemo(
    () => facets.portals.map((p) => ({ value: p, label: p })),
    [facets.portals],
  );

  const hasCnaeData = companyCnaes.length > 0 || extraKeywords.length > 0;

  return (
    <aside className="radar-sidebar">
      {/* Cabeçalho limpo e direto */}
      <div className="radar-sidebar__top">
        <div className="radar-sidebar__title-row">
          <div className="radar-sidebar__title-group">
            <h2 className="radar-sidebar__heading">
              {activeSaved ? activeSaved.name : "Filtros"}
            </h2>
            {activeFiltersCount > 0 && (
              <span className="radar-sidebar__count-badge">
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div className="radar-sidebar__header-actions" ref={menuWrapRef}>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="radar-sidebar__text-btn"
                onClick={handleResetAll}
                title="Limpar todos os filtros aplicados"
              >
                <RotateCcw size={13} />
                <span>Limpar</span>
              </button>
            )}

            <button
              type="button"
              className={`radar-sidebar__save-btn ${saveDialogOpen ? "is-open" : ""}`}
              onClick={openSaveModal}
              disabled={savingFilter}
            >
              <Bookmark size={13} />
              <span>{activeSaved ? "Atualizar" : "Salvar"}</span>
            </button>

            {activeSaved && (
              <button
                type="button"
                className="radar-sidebar__icon-btn"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Mais opções deste filtro"
              >
                <MoreHorizontal size={16} />
              </button>
            )}

            {menuOpen && activeSaved && (
              <div className="radar-sidebar__menu">
                <button
                  type="button"
                  onClick={() => {
                    onSelectSavedFilter(null);
                    setFilterNameInput(`${activeSaved.name} (cópia)`);
                    setSaveDialogOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Salvar como cópia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectSavedFilter(null);
                    onChange(
                      createDefaultRadarConfig({
                        uf: config.uf || "CE",
                        radiusBaseCity: companyCity ?? "",
                      }),
                    );
                    setMenuOpen(false);
                  }}
                >
                  Criar novo em branco
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={async () => {
                    const name = activeSaved.name;
                    await onDeleteFilter(activeSaved.id);
                    setMenuOpen(false);
                    toast.info(`Filtro "${name}" excluído.`);
                  }}
                >
                  Excluir filtro salvo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barra rápida de filtros salvos (só aparece quando existem filtros salvos) */}
        {savedFilters.length > 0 && (
          <div className="radar-saved-pills" role="tablist" aria-label="Filtros salvos">
            <button
              type="button"
              className={`radar-saved-pill ${!activeFilterId ? "is-active" : ""}`}
              onClick={() => {
                onSelectSavedFilter(null);
                onChange(
                  createDefaultRadarConfig({
                    uf: config.uf || "CE",
                    radiusBaseCity: companyCity ?? "",
                  }),
                );
              }}
            >
              Livre
            </button>
            {savedFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`radar-saved-pill ${activeFilterId === f.id ? "is-active" : ""}`}
                onClick={() => onSelectSavedFilter(f)}
                title={f.name}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* Formulário compacto para dar nome ao filtro ao salvar */}
        {saveDialogOpen && (
          <form className="radar-save-box" onSubmit={handleConfirmSave}>
            <label className="radar-save-box__label">
              {activeSaved ? "Renomear / atualizar filtro" : "Salvar filtro atual como"}
            </label>
            <div className="radar-save-box__row">
              <input
                type="text"
                value={filterNameInput}
                onChange={(e) => setFilterNameInput(e.target.value)}
                placeholder="Ex: Saúde Ceará, Merenda escolar…"
                autoFocus
                required
              />
              <button
                type="submit"
                className="is-confirm"
                disabled={savingFilter}
              >
                {savingFilter ? "…" : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="radar-sidebar__body">
        {/* 1. Conjunto de palavras-chave */}
        <section className="radar-section">
          <div className="radar-section__head">
            <strong>Conjunto de palavras-chave</strong>
            <small>
              {totalWordsCount} / {MAX_RADAR_KEYWORDS} palavras
            </small>
          </div>

          <div className="radar-groups-list">
            {config.keywordGroups.map((group, idx) => {
              const isCollapsed = Boolean(collapsedGroups[group.id]);
              const groupCount =
                group.keywords.length +
                group.desiredWords.length +
                group.excludedWords.length;
              const canRemoveOrClear =
                config.keywordGroups.length > 1 || groupCount > 0;

              return (
                <div key={group.id} className="radar-group-card">
                  <div className="radar-group-card__head">
                    <button
                      type="button"
                      className="radar-group-card__toggle"
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                          [group.id]: !prev[group.id],
                        }))
                      }
                    >
                      {isCollapsed ? (
                        <ChevronDown size={15} />
                      ) : (
                        <ChevronUp size={15} />
                      )}
                      <span>{group.name || `Grupo ${idx + 1}`}</span>
                      {groupCount > 0 && <em>{groupCount}</em>}
                    </button>

                    {canRemoveOrClear && (
                      <button
                        type="button"
                        className="radar-group-card__trash"
                        onClick={() => handleDeleteGroup(group.id)}
                        title={
                          config.keywordGroups.length > 1
                            ? "Remover este grupo"
                            : "Limpar palavras do grupo"
                        }
                        aria-label="Remover ou limpar grupo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="radar-group-card__fields">
                      <KeywordTagInput
                        label="Palavras-chave"
                        hint="obrigatórias"
                        placeholder="Ex: medicamento, seringa"
                        tone="primary"
                        words={group.keywords}
                        disabledAdd={totalWordsCount >= MAX_RADAR_KEYWORDS}
                        onAdd={(w) => addWordToGroup(group.id, "keywords", w)}
                        onRemove={(w) =>
                          removeWordFromGroup(group.id, "keywords", w)
                        }
                      />

                      <KeywordTagInput
                        label="Palavras desejadas"
                        hint="opcional"
                        placeholder="Prioriza no topo (ex: hospitalar)"
                        tone="desired"
                        words={group.desiredWords}
                        disabledAdd={totalWordsCount >= MAX_RADAR_KEYWORDS}
                        onAdd={(w) =>
                          addWordToGroup(group.id, "desiredWords", w)
                        }
                        onRemove={(w) =>
                          removeWordFromGroup(group.id, "desiredWords", w)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="radar-kw-footer-actions">
            <button
              type="button"
              className="radar-add-group-link"
              onClick={handleAddGroup}
            >
              <Plus size={14} />
              <span>Adicionar grupo de palavras</span>
            </button>

            {hasCnaeData && totalWordsCount === 0 && (
              <button
                type="button"
                className="radar-cnae-import-link"
                onClick={handleImportFromCnae}
              >
                Importar do meu CNAE
              </button>
            )}
          </div>

          <label className="radar-check-row is-compact">
            <input
              type="checkbox"
              checked={config.useCompanyCnae}
              onChange={(e) =>
                patchConfig({ useCompanyCnae: e.target.checked })
              }
            />
            <span>Priorizar editais compatíveis com meu CNAE</span>
          </label>
        </section>

        <hr className="radar-divider" />

        {/* 2. Modalidade */}
        <RadarSelect
          label="Modalidade"
          value={config.modality}
          placeholder="Todas as modalidades"
          options={modalityOptions}
          onChange={(val) => patchConfig({ modality: val })}
        />

        {/* 3. Setores */}
        <RadarSelect
          label="Setores"
          value={config.sector}
          placeholder="Todos os setores"
          options={sectorOptions}
          searchable
          searchPlaceholder="Buscar setor…"
          onChange={(val) => patchConfig({ sector: val })}
        />

        <hr className="radar-divider" />

        {/* 4. Localização: Estados/Cidades | Raio de distância */}
        <section className="radar-section">
          <span className="radar-field__label">Localização</span>

          <div className="radar-loc-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={config.locationMode === "state_city"}
              className={config.locationMode === "state_city" ? "is-active" : ""}
              onClick={() => patchConfig({ locationMode: "state_city" })}
            >
              Estados/Cidades
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={config.locationMode === "radius"}
              className={config.locationMode === "radius" ? "is-active" : ""}
              onClick={() =>
                patchConfig({
                  locationMode: "radius",
                  radiusBaseCity:
                    config.radiusBaseCity ||
                    companyCity ||
                    facets.cities[0] ||
                    "",
                  radiusKm: config.radiusKm ?? 100,
                })
              }
            >
              Raio de distância
            </button>
          </div>

          <RadarSelect
            label="Estado"
            value={config.uf}
            placeholder="Ceará (CE)"
            options={stateOptions}
            searchable
            searchPlaceholder="Buscar estado ou UF…"
            clearable={false}
            onChange={(val) =>
              patchConfig({
                uf: val || "CE",
                city: "",
                radiusBaseCity: "",
              })
            }
          />

          {config.locationMode === "state_city" ? (
            <RadarSelect
              label="Cidade"
              value={config.city}
              placeholder={`Todas as cidades (${config.uf || "CE"})`}
              options={cityOptions}
              searchable
              searchPlaceholder="Digite o município…"
              onChange={(val) => patchConfig({ city: val })}
            />
          ) : (
            <>
              <RadarSelect
                label="Cidade de referência"
                value={config.radiusBaseCity}
                placeholder={
                  companyCity
                    ? `${companyCity} (sede da empresa)`
                    : "Escolher município base"
                }
                options={cityOptions}
                searchable
                searchPlaceholder="Digite o município base…"
                clearable={false}
                onChange={(val) => patchConfig({ radiusBaseCity: val })}
              />

              <div className="radar-field">
                <span className="radar-field__label">Distância máxima</span>
                <div className="radar-radius-pills" role="group" aria-label="Raio em quilômetros">
                  {RADAR_RADIUS_OPTIONS.map((km) => {
                    const active = (config.radiusKm ?? 100) === km;
                    return (
                      <button
                        key={km}
                        type="button"
                        className={`radar-radius-pill ${active ? "is-active" : ""}`}
                        aria-pressed={active}
                        onClick={() => patchConfig({ radiusKm: km })}
                      >
                        {km} km
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <hr className="radar-divider" />

        {/* 5. Portal */}
        <RadarSelect
          label="Portal"
          value={config.portal}
          placeholder="Todos os portais"
          options={portalOptions}
          searchable
          searchPlaceholder="Pesquisar portal de compras…"
          onChange={(val) => patchConfig({ portal: val })}
        />

        {/* 6. Esfera */}
        <RadarSelect
          label="Esfera"
          value={config.sphere}
          placeholder="Todas as esferas"
          options={RADAR_SPHERES}
          searchable={false}
          onChange={(val) => patchConfig({ sphere: val })}
        />

        <hr className="radar-divider" />

        {/* 7. Registro de Preço & Tipo (lado a lado) */}
        <section className="radar-dual-checks">
          <div>
            <span className="radar-field__label">Registro de Preço</span>
            <label className="radar-check-row">
              <input
                type="checkbox"
                checked={config.srp.includes("yes")}
                onChange={() =>
                  patchConfig({ srp: toggleCheckboxItem(config.srp, "yes") })
                }
              />
              <span>Sim</span>
            </label>
            <label className="radar-check-row">
              <input
                type="checkbox"
                checked={config.srp.includes("no")}
                onChange={() =>
                  patchConfig({ srp: toggleCheckboxItem(config.srp, "no") })
                }
              />
              <span>Não</span>
            </label>
          </div>

          <div>
            <span className="radar-field__label">Tipo</span>
            <label className="radar-check-row">
              <input
                type="checkbox"
                checked={config.kind.includes("material")}
                onChange={() =>
                  patchConfig({
                    kind: toggleCheckboxItem(config.kind, "material"),
                  })
                }
              />
              <span>Material</span>
            </label>
            <label className="radar-check-row">
              <input
                type="checkbox"
                checked={config.kind.includes("service")}
                onChange={() =>
                  patchConfig({
                    kind: toggleCheckboxItem(config.kind, "service"),
                  })
                }
              />
              <span>Serviço</span>
            </label>
          </div>
        </section>

        <hr className="radar-divider" />

        {/* 8. Valor da compra total (estimado) */}
        <section className="radar-field">
          <span className="radar-field__label">
            Valor da compra total (estimado)
          </span>
          <div className="radar-range-row">
            <div className="radar-money-input">
              <small>R$</small>
              <input
                type="text"
                inputMode="decimal"
                value={minTotalStr}
                onChange={(e) => setMinTotalStr(e.target.value)}
                placeholder="Mín"
                aria-label="Valor total mínimo"
              />
            </div>
            <span className="radar-range-sep">–</span>
            <div className="radar-money-input">
              <small>R$</small>
              <input
                type="text"
                inputMode="decimal"
                value={maxTotalStr}
                onChange={(e) => setMaxTotalStr(e.target.value)}
                placeholder="Máx"
                aria-label="Valor total máximo"
              />
            </div>
          </div>
        </section>

        {/* 9. Valor do item (estimado) */}
        <section className="radar-field">
          <span className="radar-field__label">Valor do item (estimado)</span>
          <div className="radar-range-row">
            <div className="radar-money-input">
              <small>R$</small>
              <input
                type="text"
                inputMode="decimal"
                value={minItemStr}
                onChange={(e) => setMinItemStr(e.target.value)}
                placeholder="Mín"
                aria-label="Valor do item mínimo"
              />
            </div>
            <span className="radar-range-sep">–</span>
            <div className="radar-money-input">
              <small>R$</small>
              <input
                type="text"
                inputMode="decimal"
                value={maxItemStr}
                onChange={(e) => setMaxItemStr(e.target.value)}
                placeholder="Máx"
                aria-label="Valor do item máximo"
              />
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
