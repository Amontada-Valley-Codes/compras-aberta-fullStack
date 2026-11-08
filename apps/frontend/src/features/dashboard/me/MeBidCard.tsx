"use client";

import { useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Heart,
  MapPin,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { formatCnpj } from "@/lib/format-br";
import type { EnrichedMeBid } from "./cnae-match";
import {
  useMeBidDetailQuery,
  usePrefetchMeBidDetail,
} from "./use-me-licitacoes";
import {
  formatCleanTitle,
  formatCurrencyBr,
  formatDateBr,
  formatDeadlineBadge,
  formatOrgName,
} from "./bid-formatters";
import { STAGE_MAP, type TrackedBid } from "./workspace-types";

type CardTab = "details" | "files" | "extra";

export interface MeBidCardProps {
  bid: EnrichedMeBid;
  isSaved: boolean;
  isHidden?: boolean;
  trackedBid?: TrackedBid | null;
  onToggleSave: (bidId: string) => void;
  onToggleAnalysis?: (bid: EnrichedMeBid) => void;
  onParticipate?: (bid: EnrichedMeBid) => void;
  onManage?: (bid: EnrichedMeBid) => void;
  onToggleHide?: (bidId: string) => void;
  onOpenDetail: (bid: EnrichedMeBid) => void;
  onOpenChat: (bid: EnrichedMeBid) => void;
}

export function MeBidCard({
  bid,
  isSaved,
  isHidden = false,
  trackedBid = null,
  onToggleSave,
  onToggleAnalysis,
  onParticipate,
  onManage,
  onToggleHide,
  onOpenDetail,
  onOpenChat,
}: MeBidCardProps) {
  const [activeTab, setActiveTab] = useState<CardTab>("details");
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const prefetchDetail = usePrefetchMeBidDetail();
  const prefetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = setTimeout(() => {
      prefetchDetail(bid.agencyCnpj, bid.year, bid.sequential);
    }, 280);
  };

  const handleMouseLeave = () => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  };

  const shouldFetchDetail = activeTab === "files" || itemsExpanded;

  const { data: detailData, isLoading: loadingDetail } = useMeBidDetailQuery({
    agencyCnpj: bid.agencyCnpj,
    year: bid.year,
    sequential: bid.sequential,
    enabled: shouldFetchDetail,
  });

  const documents = detailData?.documents ?? [];
  const items = detailData?.items ?? [];
  const totalItemsCount = detailData?.totalItems ?? items.length;

  const orgShort = useMemo(
    () => formatOrgName(bid.unitName || bid.agencyName),
    [bid.unitName, bid.agencyName],
  );

  const cardHeadline = useMemo(() => {
    const modUpper = (bid.modality || "LICITAÇÃO").toUpperCase();
    const num = bid.purchaseNumber || `${bid.sequential}/${bid.year}`;
    return `${modUpper} ${num} — ${orgShort.toUpperCase()}`;
  }, [bid.modality, bid.purchaseNumber, bid.sequential, bid.year, orgShort]);

  const cleanObjectText = useMemo(
    () => formatCleanTitle(bid.object),
    [bid.object],
  );

  const hasEstimatedValue =
    bid.estimatedValue !== null &&
    bid.estimatedValue !== undefined &&
    !Number.isNaN(bid.estimatedValue) &&
    bid.estimatedValue > 0;

  const deadline = formatDeadlineBadge(bid);

  const handleShare = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/me?oportunidade=${encodeURIComponent(bid.id)}`
        : bid.pncpGovUrl;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link da licitação copiado!", {
          description: "Pronto para enviar à sua equipe ou salvar.",
        });
      }
    } catch {
      toast.info("Código PNCP: " + bid.id);
    }
  };

  const handleCopyPncp = async () => {
    try {
      await navigator.clipboard.writeText(bid.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignora
    }
  };

  const isParticipating = Boolean(
    trackedBid &&
      trackedBid.stage !== "analise" &&
      trackedBid.stage !== "desistida",
  );
  const selectedCount = trackedBid
    ? trackedBid.items.filter((i) => i.selected).length
    : 0;
  const effectiveIsSaved = Boolean(trackedBid) || isSaved;

  const handleParticipate = () => {
    if (isParticipating && onManage) {
      onManage(bid);
      return;
    }
    if (onParticipate) {
      onParticipate(bid);
      return;
    }
    if (bid.portalUrl) {
      window.open(bid.portalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onOpenDetail(bid);
  };

  const handleSaveToggle = () => {
    if (isParticipating && onManage) {
      onManage(bid);
      return;
    }
    if (onToggleAnalysis) {
      onToggleAnalysis(bid);
      return;
    }
    onToggleSave(bid.id);
    toast.success(
      effectiveIsSaved
        ? "Removida de Minhas Licitações"
        : "Licitação salva para análise!",
      {
        description: effectiveIsSaved
          ? undefined
          : "Acompanhe na aba Minhas Licitações.",
      },
    );
  };

  const handleHideToggle = () => {
    if (!onToggleHide) return;
    onToggleHide(bid.id);
    toast.info(
      isHidden
        ? "Licitação restaurada no Radar"
        : "Licitação ocultada do Radar",
      {
        description: isHidden
          ? undefined
          : "Use o filtro de ocultas caso queira exibi-la novamente.",
      },
    );
  };

  return (
    <article
      className={`me-bid-card ${isHidden ? "is-hidden-card" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Topo: Órgão / Portal e ações rápidas */}
      <div className="me-bid-card__top">
        <div className="me-bid-card__org-group">
          <button
            type="button"
            className="me-bid-card__eye-badge"
            onClick={() => onOpenDetail(bid)}
            title="Abrir ficha completa da licitação"
            aria-label="Abrir ficha completa da licitação"
          >
            <Eye size={15} />
          </button>

          <span className="me-bid-card__org-pill" title={orgShort}>
            <Building2 size={13} />
            <span>{orgShort}</span>
          </span>

          {bid.portalName && (
            <span className="me-bid-card__portal-pill">
              {bid.portalName.replace(/\s*\([^)]*\)\s*/g, "").trim()}
            </span>
          )}

          {typeof bid.distanceKm === "number" && (
            <span className="me-bid-card__distance-pill">
              <MapPin size={12} />
              {bid.distanceKm === 0 ? "No município" : `a ${bid.distanceKm} km`}
            </span>
          )}

          {bid.isOpen &&
            bid.daysLeft !== null &&
            bid.daysLeft <= 3 && (
              <span className="me-bid-card__urgent-pill">{deadline.label}</span>
            )}
        </div>

        <div className="me-bid-card__top-actions">

          <button
            type="button"
            className={`me-bid-card__icon-btn ${effectiveIsSaved ? "is-saved" : ""}`}
            onClick={handleSaveToggle}
            title={
              effectiveIsSaved
                ? "Acompanhando em Minhas Licitações"
                : "Salvar em Minhas Licitações"
            }
            aria-label={
              effectiveIsSaved
                ? "Acompanhando em Minhas Licitações"
                : "Salvar em Minhas Licitações"
            }
          >
            <Heart size={18} fill={effectiveIsSaved ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            className="me-bid-card__icon-btn"
            onClick={handleShare}
            title="Compartilhar link desta licitação"
            aria-label="Compartilhar licitação"
          >
            <Share2 size={17} />
          </button>

          <a
            href={bid.portalUrl || bid.pncpGovUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="me-bid-card__icon-btn"
            title="Abrir publicação externa"
            aria-label="Abrir publicação externa"
          >
            <ExternalLink size={17} />
          </a>
        </div>
      </div>

      {/* Título clicável */}
      <h2 className="me-bid-card__title">
        <button type="button" onClick={() => onOpenDetail(bid)}>
          {cardHeadline}
        </button>
      </h2>

      {/* Abas internas: Detalhes | Arquivos | Dados adicionais */}
      <div className="me-bid-card__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "details"}
          className={`me-bid-card__tab ${activeTab === "details" ? "is-active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          Detalhes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "files"}
          className={`me-bid-card__tab ${activeTab === "files" ? "is-active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          Arquivos
          {detailData?.documents && detailData.documents.length > 0 && (
            <em>{detailData.documents.length}</em>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "extra"}
          className={`me-bid-card__tab ${activeTab === "extra" ? "is-active" : ""}`}
          onClick={() => setActiveTab("extra")}
        >
          Dados adicionais
        </button>
      </div>

      {/* Conteúdo da aba ativa */}
      {activeTab === "details" && (
        <div className="me-bid-card__panel">
          <p className="me-bid-card__object">{cleanObjectText}</p>

          {bid.match.matchedKeywords.length > 0 && (
            <div className="me-bid-card__matched-tags">
              {bid.match.matchedKeywords.map((kw) => (
                <span key={kw}>{kw}</span>
              ))}
            </div>
          )}

          <div className="me-bid-card__meta-grid">
            <div className="me-bid-card__meta-cell">
              <strong>Publicação</strong>{" "}
              <span>{formatDateBr(bid.publishedAt, false)}</span>
            </div>
            <div className="me-bid-card__meta-cell">
              <strong>Modo de disputa</strong>{" "}
              <span>{bid.disputeMode || bid.modality}</span>
            </div>
            <div className="me-bid-card__meta-cell">
              <strong>Valor total estimado</strong>{" "}
              <span>
                {bid.confidentialBudget
                  ? "Sigiloso"
                  : hasEstimatedValue
                    ? formatCurrencyBr(bid.estimatedValue)
                    : "Sigiloso"}
              </span>
            </div>

            <div className="me-bid-card__meta-cell">
              <strong>{bid.isOpen ? "Abertura / Fim" : "Encerramento"}</strong>{" "}
              <span>{formatDateBr(bid.closingAt || bid.openingAt, true)}</span>
            </div>
            <div className="me-bid-card__meta-cell">
              <strong>Registro de preço</strong>{" "}
              <span>{bid.srp ? "Sim" : "Não"}</span>
            </div>
            <div className="me-bid-card__meta-cell">
              <strong>Cidade</strong>{" "}
              <span>
                {bid.city}/{bid.uf}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "files" && (
        <div className="me-bid-card__panel">
          {loadingDetail ? (
            <div className="me-bid-card__inline-loading">
              <RefreshCw size={16} className="is-spinning" />
              <span>Consultando edital e anexos oficiais no PNCP…</span>
            </div>
          ) : documents.length > 0 ? (
            <div className="me-bid-card__files-list">
              {documents.map((doc) => (
                <div
                  key={`${doc.id}-${doc.url}`}
                  className="me-bid-card__file-item"
                >
                  <div className="me-bid-card__file-info">
                    <FileText size={17} />
                    <div>
                      <strong>{doc.title}</strong>
                      <small>
                        {doc.typeName}
                        {doc.publishedAt
                          ? ` • ${formatDateBr(doc.publishedAt, false)}`
                          : ""}
                      </small>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="me-bid-card__file-btn"
                  >
                    <Download size={14} />
                    Baixar
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="me-bid-card__files-empty">
              <span>
                Nenhum arquivo avulso retornado agora pela API. Acesse a página
                oficial no PNCP para visualizar os anexos:
              </span>
              <a
                href={bid.pncpGovUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="me-bid-card__file-btn"
              >
                Abrir no PNCP <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      )}

      {activeTab === "extra" && (
        <div className="me-bid-card__panel">
          <div className="me-bid-card__extra-grid">
            <div>
              <small>Órgão comprador</small>
              <strong>{formatOrgName(bid.agencyName)}</strong>
            </div>
            <div>
              <small>CNPJ do órgão</small>
              <strong>{formatCnpj(bid.agencyCnpj)}</strong>
            </div>
            <div>
              <small>Esfera / Poder</small>
              <strong>
                {bid.sphereName ?? "Pública"}
                {bid.powerName ? ` • ${bid.powerName}` : ""}
              </strong>
            </div>
            <div>
              <small>Plataforma / Portal</small>
              <strong>{bid.portalName ?? "Conforme Edital"}</strong>
            </div>
            <div>
              <small>Amparo legal</small>
              <strong>{bid.legalBasis || "Lei nº 14.133/2021"}</strong>
            </div>
            <div>
              <small>Controle oficial PNCP</small>
              <button
                type="button"
                className="me-bid-card__copy-code"
                onClick={handleCopyPncp}
              >
                <code>{bid.id}</code>
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
          {bid.complementaryInfo && (
            <p className="me-bid-card__comp-info">
              <strong>Informação complementar:</strong> {bid.complementaryInfo}
            </p>
          )}
        </div>
      )}

      {/* Linha dos 3 botões principais */}
      <div className="me-bid-card__cta-row">
        <button
          type="button"
          className={`me-bid-btn ${isParticipating ? "is-manage" : "is-participate"}`}
          onClick={handleParticipate}
        >
          {isParticipating ? "Gerenciar" : "Participar"}
        </button>

        <button
          type="button"
          className={`me-bid-btn is-save ${effectiveIsSaved ? "is-active" : ""}`}
          onClick={handleSaveToggle}
        >
          {effectiveIsSaved ? (
            <>
              <Check size={16} />
              {isParticipating ? "Em Minhas Licitações" : "Salva para análise"}
            </>
          ) : (
            "Salvar para análise"
          )}
        </button>

        <button
          type="button"
          className="me-bid-btn is-chat"
          onClick={() => onOpenChat(bid)}
        >
          <Sparkles size={16} />
          Converse com o edital
        </button>
      </div>

      {/* Tarja de acompanhamento quando a licitação está em Minhas Licitações */}
      {trackedBid && (
        <div className="me-bid-card__tracked-strip">
          <div className="me-bid-card__tracked-info">
            <FileText size={14} />
            <span>
              <strong>
                {STAGE_MAP[trackedBid.stage]?.label ?? "Em acompanhamento"}
              </strong>
              {selectedCount > 0
                ? ` • ${selectedCount} ${selectedCount === 1 ? "item selecionado" : "itens selecionados"}`
                : ""}
              {trackedBid.nickname ? ` • ${trackedBid.nickname}` : ""}
            </span>
          </div>

          {onManage && (
            <button
              type="button"
              className="me-bid-card__tracked-link"
              onClick={() => onManage(bid)}
            >
              Abrir gestão →
            </button>
          )}
        </div>
      )}

      {/* Sub-ações: Ocultar licitação + Ver detalhes */}
      <div className="me-bid-card__subactions">
        {onToggleHide ? (
          <button
            type="button"
            className="me-bid-card__hide-btn"
            onClick={handleHideToggle}
          >
            {isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
            <span>
              {isHidden ? "Restaurar licitação" : "Ocultar licitação"}
            </span>
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="me-bid-card__detail-link"
          onClick={() => onOpenDetail(bid)}
        >
          Ficha completa da licitação
        </button>
      </div>

      {/* Expansão inferior: Ver itens do edital */}
      <div className="me-bid-card__items-drawer">
        <button
          type="button"
          className="me-bid-card__items-toggle"
          aria-expanded={itemsExpanded}
          onClick={() => setItemsExpanded((prev) => !prev)}
        >
          {itemsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>
            {itemsExpanded
              ? "Ocultar itens do edital"
              : totalItemsCount > 0
                ? `Ver itens do edital (${totalItemsCount})`
                : "Ver itens do edital"}
          </span>
        </button>

        {itemsExpanded && (
          <div className="me-bid-card__items-content">
            {loadingDetail ? (
              <div className="me-bid-card__inline-loading">
                <RefreshCw size={16} className="is-spinning" />
                <span>Carregando itens oficiais desta licitação…</span>
              </div>
            ) : items.length > 0 ? (
              <div className="me-bid-card__items-table-wrap">
                <table className="me-bid-card__items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Descrição</th>
                      <th className="is-right">Qtd.</th>
                      <th className="is-right">Unitário est.</th>
                      <th className="is-right">Total est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 15).map((item) => {
                      const benefitLower = (
                        item.benefitName ?? ""
                      ).toLowerCase();
                      const isMpe =
                        benefitLower.includes("exclusiv") ||
                        benefitLower.includes("me/epp") ||
                        benefitLower.includes("cota") ||
                        benefitLower.includes("microempresa");
                      return (
                        <tr key={item.number}>
                          <td>
                            <span className="me-bid-card__item-num">
                              {String(item.number).padStart(2, "0")}
                            </span>
                          </td>
                          <td>
                            <p className="me-bid-card__item-desc">
                              {formatCleanTitle(item.description)}
                            </p>
                            {isMpe && (
                              <span className="me-bid-card__mpe-tag">
                                <ShieldCheck size={11} />
                                {item.benefitName}
                              </span>
                            )}
                          </td>
                          <td className="is-right">
                            {item.quantity !== null
                              ? `${item.quantity.toLocaleString("pt-BR")}${item.unit ? ` ${item.unit}` : ""}`
                              : "—"}
                          </td>
                          <td className="is-right">
                            {item.confidentialBudget
                              ? "Sigiloso"
                              : item.unitValue && item.unitValue > 0
                                ? formatCurrencyBr(item.unitValue)
                                : "—"}
                          </td>
                          <td className="is-right">
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
                {items.length > 15 && (
                  <button
                    type="button"
                    className="me-bid-card__more-items"
                    onClick={() => onOpenDetail(bid)}
                  >
                    Ver todos os {totalItemsCount} itens na ficha completa →
                  </button>
                )}
              </div>
            ) : (
              <p className="me-bid-card__items-empty">
                Os itens desta contratação estão detalhados diretamente no
                arquivo PDF do Edital (aba Arquivos).
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
