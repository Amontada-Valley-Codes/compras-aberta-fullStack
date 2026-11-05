"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, CircleCheck, Download, FileImage, FileText, Landmark, Layers, LayoutDashboard, LoaderCircle, ReceiptText, RotateCcw, Users, X } from "lucide-react";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { PageHeader } from "./GestorPublicoViews";
import { REPORT_MODELS, reportModel, type ReportModelId } from "./relatorios/report-catalog";
import type { ReportDocument } from "./relatorios/report-document";
import { REPORT_FORMATS, reportFormat, type ReportFormatId } from "./relatorios/report-formats";
import "./relatorios.css";

interface Option {
  value: string;
  label: string;
}

interface Props {
  municipalities: Option[];
  defaultMunicipality: string;
  years: readonly number[];
  defaultYear: number;
  natures: Option[];
}

const MODEL_ICONS: Record<ReportModelId, ReactNode> = {
  geral: <LayoutDashboard size={19} aria-hidden="true" />,
  natureza: <Layers size={19} aria-hidden="true" />,
  fornecedores: <Users size={19} aria-hidden="true" />,
  despesas: <ReceiptText size={19} aria-hidden="true" />,
  receitas: <Landmark size={19} aria-hidden="true" />,
};

const FORMAT_ICONS: Record<ReportFormatId, ReactNode> = {
  pdf: <FileText size={19} aria-hidden="true" />,
  png: <FileImage size={19} aria-hidden="true" />,
};

// A primeira consulta do dia pode levar quase um minuto (a API acorda e as
// listas são paginadas); depois disso, desiste com uma mensagem clara.
const REQUEST_TIMEOUT_MS = 150_000;

type Status =
  | { kind: "idle" }
  | { kind: "loading"; step: "data" | "file" }
  | { kind: "done"; fileName: string }
  | { kind: "error"; message: string };

class ReportRequestError extends Error {}

function slug(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchReport(params: URLSearchParams, signal: AbortSignal): Promise<ReportDocument> {
  const response = await fetch(`/gestor/relatorios/dados?${params}`, { signal, cache: "no-store", headers: { Accept: "application/json" } });
  // Sem sessão, o proxy redireciona para o login (HTML).
  if (response.redirected || !response.headers.get("content-type")?.includes("application/json")) {
    throw new ReportRequestError("Sua sessão expirou. Entre novamente para gerar o relatório.");
  }
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body && "error" in body && typeof body.error === "string" ? body.error : null;
    throw new ReportRequestError(message ?? "Não foi possível gerar o relatório agora. Tente novamente em instantes.");
  }
  return body as ReportDocument;
}

function saveFile(blob: Blob, fileName: string): string {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  return url;
}

export function GestorPublicoRelatorios({ municipalities, defaultMunicipality, years, defaultYear, natures }: Props) {
  const [municipality, setMunicipality] = useState(
    municipalities.some((item) => item.value === defaultMunicipality) ? defaultMunicipality : municipalities[0]?.value ?? "",
  );
  const [year, setYear] = useState(defaultYear);
  const [nature, setNature] = useState("");
  const [modelId, setModelId] = useState<ReportModelId>("geral");
  const [formatId, setFormatId] = useState<ReportFormatId>("pdf");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const request = useRef<AbortController | null>(null);
  const lastFile = useRef<{ url: string; name: string } | null>(null);

  useEffect(
    () => () => {
      request.current?.abort();
      if (lastFile.current) URL.revokeObjectURL(lastFile.current.url);
    },
    [],
  );

  const model = reportModel(modelId);
  const format = reportFormat(formatId);
  const municipalityName = municipalities.find((item) => item.value === municipality)?.label ?? "Município";
  const natureName = natures.find((item) => item.value === nature)?.label ?? "Todas as naturezas";
  const loading = status.kind === "loading";
  const canGenerate = Boolean(municipality) && !model.unavailableReason && !loading;

  // Mudou a configuração: o aviso do último arquivo deixa de valer.
  const configure = (apply: () => void) => {
    apply();
    if (status.kind === "done" || status.kind === "error") setStatus({ kind: "idle" });
  };

  async function generate() {
    if (!canGenerate) return;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);
    const params = new URLSearchParams({ modelo: modelId, municipio: municipality, ano: String(year) });
    if (nature) params.set("natureza", nature);
    const fileName = `relatorio-${modelId}-${slug(municipalityName)}-${year}${nature ? `-natureza-${nature}` : ""}.${format.extension}`;

    setStatus({ kind: "loading", step: "data" });
    try {
      const report = await fetchReport(params, controller.signal);
      setStatus({ kind: "loading", step: "file" });
      let blob: Blob;
      try {
        blob = await format.render(report);
      } catch (error) {
        console.error("Falha ao montar o arquivo do relatório", error);
        throw new ReportRequestError(`Não foi possível montar o arquivo ${format.label}. Tente novamente.`);
      }
      if (lastFile.current) URL.revokeObjectURL(lastFile.current.url);
      lastFile.current = { url: saveFile(blob, fileName), name: fileName };
      setStatus({ kind: "done", fileName });
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({
        kind: "error",
        message: controller.signal.aborted
          ? "A consulta demorou mais que o esperado. Tente novamente em instantes."
          : error instanceof ReportRequestError
            ? error.message
            : "Não foi possível gerar o relatório agora. Confira sua conexão e tente novamente.",
      });
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    }
  }

  function downloadAgain() {
    if (!lastFile.current) return;
    const link = document.createElement("a");
    link.href = lastFile.current.url;
    link.download = lastFile.current.name;
    link.click();
  }

  return (
    <div className="gp-main gp-rpt-main">
      <PageHeader
        eyebrow="Relatórios"
        title="Gerar relatório"
        description="Escolha o recorte, o modelo e o formato. O arquivo é montado com os dados oficiais do município e baixado direto no seu computador."
      />

      <div className="analysis-filters gp-analysis-filters gp-rpt-filters" role="group" aria-label="Recorte do relatório">
        <div className="analysis-filter-fields">
          <PublicFilterSelect
            name="relatorio-municipio"
            label="Município"
            icon="municipality"
            variant="analysis"
            value={municipality}
            options={municipalities}
            disabled={loading}
            onValueChange={(value) => configure(() => setMunicipality(value || municipality))}
          />
          <PublicFilterSelect
            name="relatorio-ano"
            label="Ano"
            icon="year"
            variant="analysis"
            value={String(year)}
            options={years.map((item) => ({ value: String(item), label: String(item) }))}
            disabled={loading}
            onValueChange={(value) => configure(() => setYear(Number(value) || defaultYear))}
          />
          <PublicFilterSelect
            name="relatorio-natureza"
            label="Natureza da despesa"
            allLabel="Todas as naturezas"
            icon="nature"
            variant="analysis"
            value={nature}
            options={natures}
            disabled={loading}
            onValueChange={(value) => configure(() => setNature(value))}
          />
        </div>
      </div>

      <div className="gp-rpt-layout">
        <div className="gp-rpt-config">
          <section className="gp-card gp-rpt-card" aria-labelledby="gp-rpt-models-title">
            <header>
              <h2 id="gp-rpt-models-title">Modelo do relatório</h2>
              <p>Cada modelo traz um conjunto de indicadores e tabelas, sempre no recorte escolhido acima.</p>
            </header>
            <div className="gp-rpt-options" role="radiogroup" aria-labelledby="gp-rpt-models-title">
              {REPORT_MODELS.map((item) => {
                const unavailable = Boolean(item.unavailableReason);
                return (
                  <label key={item.id} className="gp-rpt-option" data-unavailable={unavailable || undefined}>
                    <input
                      type="radio"
                      name="relatorio-modelo"
                      value={item.id}
                      checked={modelId === item.id}
                      disabled={unavailable || loading}
                      onChange={() => configure(() => setModelId(item.id))}
                    />
                    <span className="gp-rpt-option-icon">{MODEL_ICONS[item.id]}</span>
                    <span className="gp-rpt-option-copy">
                      <strong>{item.title}</strong>
                      <small>{item.unavailableReason ?? item.description}</small>
                    </span>
                    {unavailable ? (
                      <span className="gp-rpt-badge">Indisponível</span>
                    ) : (
                      <span className="gp-rpt-option-check" aria-hidden="true">
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="gp-card gp-rpt-card" aria-labelledby="gp-rpt-formats-title">
            <header>
              <h2 id="gp-rpt-formats-title">Formato do arquivo</h2>
              <p>Os dois formatos seguem o mesmo layout, com cabeçalho, seções e tabelas.</p>
            </header>
            <div className="gp-rpt-options gp-rpt-formats" role="radiogroup" aria-labelledby="gp-rpt-formats-title">
              {REPORT_FORMATS.map((item) => (
                <label key={item.id} className="gp-rpt-option">
                  <input
                    type="radio"
                    name="relatorio-formato"
                    value={item.id}
                    checked={formatId === item.id}
                    disabled={loading}
                    onChange={() => configure(() => setFormatId(item.id))}
                  />
                  <span className="gp-rpt-option-icon">{FORMAT_ICONS[item.id]}</span>
                  <span className="gp-rpt-option-copy">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="gp-rpt-option-check" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="gp-card gp-rpt-summary" aria-labelledby="gp-rpt-summary-title">
          <h2 id="gp-rpt-summary-title">Resumo</h2>
          <dl>
            <div>
              <dt>Modelo</dt>
              <dd>{model.title}</dd>
            </div>
            <div>
              <dt>Município</dt>
              <dd>{municipalityName}</dd>
            </div>
            <div>
              <dt>Ano</dt>
              <dd>{year}</dd>
            </div>
            <div>
              <dt>Natureza da despesa</dt>
              <dd>{natureName}</dd>
            </div>
            <div>
              <dt>Formato</dt>
              <dd>{format.label}</dd>
            </div>
          </dl>

          <button type="button" className="gp-primary-button gp-rpt-generate" onClick={generate} disabled={!canGenerate} aria-busy={loading}>
            {loading ? <LoaderCircle className="gp-rpt-spin" size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
            {loading ? "Gerando relatório…" : "Gerar relatório"}
          </button>

          <div className="gp-rpt-status" role="status" aria-live="polite">
            {status.kind === "idle" && (
              <p className="gp-rpt-hint">
                {municipalities.length ? `O arquivo ${format.label} é baixado assim que fica pronto.` : "A lista de municípios não carregou. Recarregue a página para tentar de novo."}
              </p>
            )}
            {status.kind === "loading" && (
              <div className="gp-rpt-progress">
                <p>
                  <strong>{status.step === "data" ? `Buscando os dados de ${municipalityName}…` : `Montando o ${format.label}…`}</strong>
                  {status.step === "data" && <span>A primeira consulta do dia pode levar até um minuto.</span>}
                </p>
                {status.step === "data" && (
                  <button type="button" className="gp-text-button" onClick={() => request.current?.abort()}>
                    <X size={15} aria-hidden="true" /> Cancelar
                  </button>
                )}
              </div>
            )}
            {status.kind === "done" && (
              <div className="gp-rpt-message is-success">
                <CircleCheck size={18} aria-hidden="true" />
                <p>
                  <strong>Relatório baixado</strong>
                  <span>{status.fileName}</span>
                  <button type="button" className="gp-text-button" onClick={downloadAgain}>
                    <Download size={14} aria-hidden="true" /> Baixar de novo
                  </button>
                </p>
              </div>
            )}
            {status.kind === "error" && (
              <div className="gp-rpt-message is-error">
                <CircleAlert size={18} aria-hidden="true" />
                <p>
                  <strong>Não foi possível gerar</strong>
                  <span>{status.message}</span>
                  <button type="button" className="gp-text-button" onClick={generate}>
                    <RotateCcw size={14} aria-hidden="true" /> Tentar novamente
                  </button>
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
