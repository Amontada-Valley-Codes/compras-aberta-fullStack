"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CircleAlert, Info, Printer, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { formatCurrencyBr } from "./bid-formatters";
import {
  analyzeProposal,
  currencyToWordsBr,
  type ProposalMode,
} from "./pricing";
import {
  openPrintableProposalWindow,
  type ProposalCompanyInfo,
} from "./proposal-generator";
import type { TrackedBid, TrackedBidItem } from "./workspace-types";

interface GenerateProposalModalProps {
  tracked: TrackedBid;
  items: TrackedBidItem[];
  company: ProposalCompanyInfo;
  isServiceBid: boolean;
  initialMode: ProposalMode;
  onClose: () => void;
}

const MODE_OPTIONS: Array<{
  id: ProposalMode;
  title: string;
  description: string;
}> = [
  {
    id: "inicial",
    title: "Proposta inicial",
    description:
      "Antes da disputa. Usa a coluna Valor Inicial — é o que você cadastra no portal até a abertura.",
  },
  {
    id: "ajustada",
    title: "Proposta ajustada",
    description:
      "Depois de arrematar. Usa a coluna Valor Final — é o documento que o pregoeiro pede com o preço do último lance.",
  },
];

export function GenerateProposalModal({
  tracked,
  items,
  company,
  isServiceBid,
  initialMode,
  onClose,
}: GenerateProposalModalProps) {
  const [mode, setMode] = useState<ProposalMode>(initialMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const analysis = useMemo(
    () =>
      analyzeProposal({
        items,
        mode,
        metadata: tracked.metadata,
        isServiceBid,
        company: { cnpj: company.cnpj, cityState: company.cityState },
      }),
    [company.cityState, company.cnpj, isServiceBid, items, mode, tracked.metadata],
  );

  const errors = analysis.issues.filter((i) => i.level === "error");
  const warnings = analysis.issues.filter((i) => i.level === "warning");
  const infos = analysis.issues.filter((i) => i.level === "info");

  const handleGenerate = () => {
    if (!analysis.canGenerate) return;
    const opened = openPrintableProposalWindow(tracked, company, {
      mode,
      items: analysis.items,
      total: analysis.total,
      isServiceBid,
    });
    if (!opened) {
      toast.error(
        "O navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo.",
      );
      return;
    }
    onClose();
  };

  return (
    <div
      className="ws-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ws-select-modal ws-proposal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ws-proposal-modal-title"
      >
        <div className="ws-select-modal__header">
          <div>
            <h2 id="ws-proposal-modal-title">Gerar proposta</h2>
            <p>Confira os pontos abaixo antes de imprimir ou salvar em PDF.</p>
          </div>
          <button
            type="button"
            className="ws-modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="ws-proposal-modal__body">
          <div className="ws-proposal-mode-grid" role="radiogroup">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={mode === opt.id}
                className={`ws-proposal-mode ${mode === opt.id ? "is-active" : ""}`}
                onClick={() => setMode(opt.id)}
              >
                <span className="ws-proposal-mode__radio" />
                <span>
                  <strong>{opt.title}</strong>
                  <small>{opt.description}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="ws-proposal-summary">
            <div>
              <small>Itens na proposta</small>
              <strong>{analysis.items.length}</strong>
            </div>
            <div>
              <small>Valor global</small>
              <strong>
                {analysis.total > 0 ? formatCurrencyBr(analysis.total) : "—"}
              </strong>
              {analysis.total > 0 && (
                <span className="ws-proposal-summary__words">
                  {currencyToWordsBr(analysis.total)}
                </span>
              )}
            </div>
          </div>

          {analysis.issues.length === 0 ? (
            <p className="ws-proposal-ok">
              Tudo certo: todos os itens têm preço, marca e estão dentro do
              estimado.
            </p>
          ) : (
            <ul className="ws-proposal-issues">
              {errors.map((issue) => (
                <li key={issue.message} className="is-error">
                  <CircleAlert size={15} />
                  <span>{issue.message}</span>
                </li>
              ))}
              {warnings.map((issue) => (
                <li key={issue.message} className="is-warning">
                  <AlertTriangle size={15} />
                  <span>{issue.message}</span>
                </li>
              ))}
              {infos.map((issue) => (
                <li key={issue.message} className="is-info">
                  <Info size={15} />
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ws-proposal-modal__footer">
          <span className="ws-muted-msg">
            {errors.length > 0
              ? "Corrija os itens em vermelho para liberar a geração."
              : warnings.length > 0
                ? "Os avisos em amarelo não impedem a geração, mas revise antes de enviar."
                : "O documento abre em nova aba, pronto para imprimir ou salvar em PDF."}
          </span>
          <div className="ws-inline-actions">
            <button type="button" className="ws-btn is-ghost is-sm" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="ws-btn is-primary is-sm"
              disabled={!analysis.canGenerate}
              onClick={handleGenerate}
            >
              <Printer size={14} />
              <span>Gerar documento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
