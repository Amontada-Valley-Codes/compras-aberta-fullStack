"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { EnrichedMeBid, MePncpBid } from "./cnae-match";
import { formatCurrencyBr, formatOrgName } from "./bid-formatters";
import { useMeBidDetailQuery } from "./use-me-licitacoes";
import {
  mapPncpItemToTracked,
  type TrackedBid,
  type TrackedBidItem,
} from "./workspace-types";

export interface SelectBidItemsModalProps {
  bid: EnrichedMeBid | MePncpBid | null;
  existingTracked?: TrackedBid | null;
  companyKeywords?: string[];
  onClose: () => void;
  onConfirm: (payload: {
    bid: MePncpBid;
    nickname: string;
    items: TrackedBidItem[];
  }) => Promise<void> | void;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SelectBidItemsModal({
  bid,
  existingTracked,
  companyKeywords = [],
  onClose,
  onConfirm,
}: SelectBidItemsModalProps) {
  const [nickname, setNickname] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyKeywordMatch, setOnlyKeywordMatch] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<Set<number>>(
    () => new Set(),
  );
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [initializedBidId, setInitializedBidId] = useState<string | null>(null);

  const { data: detailData, isLoading: loadingItems } = useMeBidDetailQuery({
    agencyCnpj: bid?.agencyCnpj,
    year: bid?.year,
    sequential: bid?.sequential,
    enabled: Boolean(bid),
  });

  const pncpItems = useMemo(() => detailData?.items ?? [], [detailData?.items]);

  // Termos normalizados da empresa + palavras que deram match no card
  const normalizedKeywords = useMemo(() => {
    const matchedFromBid =
      bid && "match" in bid ? bid.match.matchedKeywords : [];
    const raw = [...companyKeywords, ...matchedFromBid]
      .map((kw) => normalizeText(kw.trim()))
      .filter((kw) => kw.length >= 3);
    return Array.from(new Set(raw));
  }, [bid, companyKeywords]);

  // Inicializa apelido e seleção quando muda de licitação ou chegam os itens
  useEffect(() => {
    if (!bid) {
      setInitializedBidId(null);
      return;
    }
    if (initializedBidId !== bid.id) {
      setNickname(existingTracked?.nickname ?? "");
      setSearchQuery("");
      setOnlyKeywordMatch(false);
      setPage(1);

      if (existingTracked && existingTracked.items.length > 0) {
        const preSelected = new Set(
          existingTracked.items
            .filter((it) => it.selected && !it.isManual)
            .map((it) => it.itemNumber),
        );
        setSelectedNumbers(preSelected);
      } else {
        setSelectedNumbers(new Set());
      }
      setInitializedBidId(bid.id);
    }
  }, [bid, existingTracked, initializedBidId]);

  // Fecha com ESC
  useEffect(() => {
    if (!bid) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bid, onClose]);

  const enrichedItems = useMemo(() => {
    return pncpItems.map((item) => {
      const normDesc = normalizeText(item.description);
      const matchedTerm =
        normalizedKeywords.find((kw) => normDesc.includes(kw)) ?? null;
      return {
        ...item,
        matchedTerm,
      };
    });
  }, [pncpItems, normalizedKeywords]);

  const filteredItems = useMemo(() => {
    const q = normalizeText(searchQuery.trim());
    return enrichedItems.filter((item) => {
      if (onlyKeywordMatch && !item.matchedTerm) return false;
      if (q) {
        const hay = `${item.number} ${normalizeText(item.description)}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedItems, onlyKeywordMatch, searchQuery]);

  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageItems = filteredItems.slice(startIdx, startIdx + pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, onlyKeywordMatch, pageSize]);

  if (!bid) return null;

  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedNumbers.has(item.number));

  const toggleItem = (num: number) => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredItems.forEach((it) => next.delete(it.number));
      } else {
        filteredItems.forEach((it) => next.add(it.number));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existingByNumber = new Map<number, TrackedBidItem>();
      const manualItems: TrackedBidItem[] = [];

      for (const prevItem of existingTracked?.items ?? []) {
        if (prevItem.isManual) {
          manualItems.push(prevItem);
        } else {
          existingByNumber.set(prevItem.itemNumber, prevItem);
        }
      }

      // Se houver itens no PNCP e o fornecedor não marcou nenhum, seleciona todos caso haja apenas 1 item,
      // ou salva todos na ficha marcando selected conforme escolha (para que possa ativar depois na tabela).
      const shouldAutoSelectSingle =
        pncpItems.length === 1 && selectedNumbers.size === 0;

      const mappedItems: TrackedBidItem[] = pncpItems.map((item) =>
        mapPncpItemToTracked(
          item,
          shouldAutoSelectSingle || selectedNumbers.has(item.number),
          existingByNumber.get(item.number),
        ),
      );

      await onConfirm({
        bid,
        nickname,
        items: [...mappedItems, ...manualItems],
      });
    } finally {
      setSaving(false);
    }
  };

  const orgShort = formatOrgName(bid.unitName || bid.agencyName);
  const processHeader = `${bid.modality} ${bid.purchaseNumber || `${bid.sequential}/${bid.year}`} — ${orgShort}`;

  return (
    <div
      className="ws-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-items-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ws-select-modal">
        {/* Cabeçalho */}
        <div className="ws-select-modal__header">
          <div>
            <h2 id="select-items-title">Selecione os itens</h2>
            <p>{processHeader}</p>
          </div>
          <button
            type="button"
            className="ws-modal-close"
            onClick={onClose}
            aria-label="Fechar janela"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controles superiores */}
        <div className="ws-select-modal__controls">
          <div className="ws-field">
            <label htmlFor="ws-bid-nickname">Apelido (opcional)</label>
            <input
              id="ws-bid-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Apelido da licitação (ex: Materiais de Limpeza — Semestral)"
            />
          </div>

          <div className="ws-select-modal__filter-bar">
            <label className="ws-search-input">
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar item por descrição ou número…"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Limpar pesquisa"
                >
                  <X size={14} />
                </button>
              )}
            </label>

            {normalizedKeywords.length > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={onlyKeywordMatch}
                className={`ws-toggle-switch ${onlyKeywordMatch ? "is-on" : ""}`}
                onClick={() => setOnlyKeywordMatch((prev) => !prev)}
              >
                <span className="ws-toggle-switch__track">
                  <span className="ws-toggle-switch__thumb" />
                </span>
                <span>Somente com palavras-chave</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="ws-select-modal__body">
          {loadingItems ? (
            <div className="ws-select-modal__empty">
              <RefreshCw size={20} className="is-spinning" />
              <span>Consultando itens do edital no PNCP…</span>
            </div>
          ) : pncpItems.length === 0 ? (
            <div className="ws-select-modal__empty">
              <strong>Itens detalhados no arquivo PDF do Edital</strong>
              <p>
                Este órgão não cadastrou os itens separadamente na API do PNCP.
                Salve a participação abaixo para acompanhar prazos e adicionar os
                itens diretamente na planilha de proposta.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="ws-select-modal__empty">
              <strong>Nenhum item encontrado para este filtro</strong>
              <p>
                Ajuste o termo pesquisado ou desative o filtro de palavras-chave
                para ver todos os {pncpItems.length} itens do edital.
              </p>
            </div>
          ) : (
            <div className="ws-items-table-box">
              <div className="ws-items-table-scroll">
                <table className="ws-items-table">
                  <thead>
                    <tr>
                      <th className="col-check">
                        <button
                          type="button"
                          className={`ws-checkbox ${allFilteredSelected ? "is-checked" : ""}`}
                          onClick={toggleAllFiltered}
                          aria-label="Selecionar todos os itens visíveis"
                        >
                          {allFilteredSelected && <Check size={12} />}
                        </button>
                      </th>
                      <th className="col-num">Item</th>
                      <th>Descrição do item</th>
                      <th className="col-right">Quant.</th>
                      <th>Unidade</th>
                      <th className="col-right">Valor unitário</th>
                      <th className="col-right">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item) => {
                      const isChecked = selectedNumbers.has(item.number);
                      const isMpe =
                        item.benefitName &&
                        /me\/epp|exclusiv|cota/i.test(item.benefitName);

                      return (
                        <tr
                          key={item.number}
                          className={isChecked ? "is-selected" : ""}
                          onClick={() => toggleItem(item.number)}
                        >
                          <td className="col-check">
                            <span
                              className={`ws-checkbox ${isChecked ? "is-checked" : ""}`}
                            >
                              {isChecked && <Check size={12} />}
                            </span>
                          </td>
                          <td className="col-num">
                            <strong>{item.number}</strong>
                          </td>
                          <td>
                            <div className="ws-item-desc-cell">
                              <span className="ws-item-desc-text">
                                {item.description}
                              </span>
                              {(isMpe || item.matchedTerm) && (
                                <div className="ws-item-pills">
                                  {item.matchedTerm && (
                                    <span className="ws-item-pill is-match">
                                      Compatível: {item.matchedTerm}
                                    </span>
                                  )}
                                  {isMpe && (
                                    <span className="ws-item-pill is-mpe">
                                      <ShieldCheck size={11} />
                                      {item.benefitName}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="col-right">
                            {item.quantity !== null
                              ? item.quantity.toLocaleString("pt-BR")
                              : "—"}
                          </td>
                          <td className="col-muted">{item.unit || "UN"}</td>
                          <td className="col-right">
                            {item.confidentialBudget
                              ? "Sigiloso"
                              : item.unitValue && item.unitValue > 0
                                ? formatCurrencyBr(item.unitValue)
                                : "—"}
                          </td>
                          <td className="col-right">
                            {item.confidentialBudget
                              ? "Sigiloso"
                              : item.totalValue && item.totalValue > 0
                                ? formatCurrencyBr(item.totalValue)
                                : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação da tabela */}
              <div className="ws-items-pagination">
                <div className="ws-items-pagination__size">
                  <span>Itens por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <span className="ws-items-pagination__range">
                  {startIdx + 1} até{" "}
                  {Math.min(startIdx + pageSize, totalFiltered)} de{" "}
                  {totalFiltered}
                </span>

                <div className="ws-items-pagination__nav">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(1)}
                    aria-label="Primeira página"
                  >
                    <ChevronsLeft size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>
                    Página {safePage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(totalPages)}
                    aria-label="Última página"
                  >
                    <ChevronsRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="ws-select-modal__footer">
          <span className="ws-select-modal__counter">
            {pncpItems.length > 0
              ? `${selectedNumbers.size} de ${pncpItems.length} ${pncpItems.length === 1 ? "item selecionado" : "itens selecionados"}`
              : "Pronto para acompanhar esta licitação"}
          </span>

          <div className="ws-select-modal__actions">
            <button
              type="button"
              className="ws-btn is-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="ws-btn is-primary"
              onClick={handleSave}
              disabled={saving || loadingItems}
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
