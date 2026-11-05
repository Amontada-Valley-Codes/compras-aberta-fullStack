"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  normalizeText,
  type EnrichedMeBid,
  type MeBidDocument,
  type MeBidItem,
} from "./cnae-match";
import { useMeBidDetailQuery } from "./use-me-licitacoes";
import {
  formatCleanTitle,
  formatCurrencyBr,
  formatDateBr,
  formatOrgName,
} from "./bid-formatters";
import { formatCnpj } from "@/lib/format-br";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  links?: Array<{ label: string; url: string; kind: "doc" | "external" }>;
}

const QUICK_QUESTIONS = [
  "Quais são os itens e valores?",
  "Tem benefício para ME/EPP?",
  "Como e onde participar?",
  "Quais são os prazos?",
  "Arquivos do edital",
];

function buildAnswer(
  question: string,
  bid: EnrichedMeBid,
  items: MeBidItem[],
  documents: MeBidDocument[],
  totalItems: number,
): {
  text: string;
  links?: Array<{ label: string; url: string; kind: "doc" | "external" }>;
} {
  const q = normalizeText(question);
  const editalDoc =
    documents.find((d) =>
      `${d.typeName} ${d.title}`.toLowerCase().includes("edital"),
    ) ?? documents[0];

  const mpeItems = items.filter((i) => {
    const b = (i.benefitName ?? "").toLowerCase();
    return (
      b.includes("exclusiv") ||
      b.includes("me/epp") ||
      b.includes("cota") ||
      b.includes("microempresa")
    );
  });

  // 1. Pergunta sobre ME / EPP / Exclusividade / Benefício
  if (
    q.includes("me epp") ||
    q.includes("microempresa") ||
    q.includes("beneficio") ||
    q.includes("exclusiv") ||
    q.includes("cota") ||
    q.includes("mei")
  ) {
    if (items.length === 0) {
      return {
        text: `A API do PNCP ainda não detalhou os itens individualmente para confirmar o tipo de benefício por item. Pela Lei Complementar nº 123/2006, itens de até R$ 80.000,00 costumam ter participação exclusiva para ME/EPP. Recomendo abrir o Edital oficial para conferir o quadro de itens e cotas.`,
        links: editalDoc
          ? [{ label: `Abrir ${editalDoc.title}`, url: editalDoc.url, kind: "doc" }]
          : [{ label: "Ver publicação no PNCP", url: bid.pncpGovUrl, kind: "external" }],
      };
    }

    if (mpeItems.length > 0) {
      const sample = mpeItems
        .slice(0, 4)
        .map(
          (it) =>
            `• Item ${it.number}: ${formatCleanTitle(it.description).slice(0, 80)} (${it.benefitName})`,
        )
        .join("\n");
      return {
        text: `Sim! Identificamos **${mpeItems.length} de ${items.length} itens carregados** com benefício expresso para ME/EPP/MEI:\n\n${sample}${mpeItems.length > 4 ? `\n…e mais ${mpeItems.length - 4} itens com benefício.` : ""}`,
      };
    }

    return {
      text: `Nos ${items.length} itens retornados pelo PNCP, não consta marcação automática de exclusividade ME/EPP (ou estão em ampla concorrência, onde sua ME/EPP ainda conta com preferência em empate ficto de até 5% no Pregão / 10% nas demais modalidades). Confira o Edital para regras específicas.`,
      links: editalDoc
        ? [{ label: `Conferir ${editalDoc.title}`, url: editalDoc.url, kind: "doc" }]
        : undefined,
    };
  }

  // 2. Pergunta sobre Prazos / Datas / Abertura / Encerramento
  if (
    q.includes("prazo") ||
    q.includes("data") ||
    q.includes("quando") ||
    q.includes("abertura") ||
    q.includes("encerra") ||
    q.includes("horario")
  ) {
    return {
      text:
        `📅 **Cronograma oficial desta contratação:**\n` +
        `• **Publicação no PNCP:** ${formatDateBr(bid.publishedAt, false)}\n` +
        `• **Abertura das propostas:** ${formatDateBr(bid.openingAt)}\n` +
        `• **Encerramento das propostas:** ${formatDateBr(bid.closingAt)}\n` +
        `• **Situação atual:** ${bid.isOpen ? "Aberta para envio de propostas" : "Prazo encerrado"} (${bid.situation}).`,
    };
  }

  // 3. Pergunta sobre Como / Onde participar / Portal
  if (
    q.includes("participar") ||
    q.includes("onde") ||
    q.includes("portal") ||
    q.includes("plataforma") ||
    q.includes("proposta") ||
    q.includes("disputa")
  ) {
    const portalDesc = bid.portalName
      ? `A disputa eletrônica ocorre na plataforma **${bid.portalName}**.`
      : `O PNCP não informou link direto de sala eletrônica externa — verifique no Edital oficial o portal ou endereço de protocolo.`;

    const links: Array<{
      label: string;
      url: string;
      kind: "doc" | "external";
    }> = [];
    if (bid.portalUrl) {
      links.push({
        label: `Acessar ${bid.portalName ?? "Portal de Disputa"}`,
        url: bid.portalUrl,
        kind: "external",
      });
    }
    if (editalDoc) {
      links.push({
        label: `Ler ${editalDoc.title}`,
        url: editalDoc.url,
        kind: "doc",
      });
    }
    links.push({
      label: "Página oficial no PNCP",
      url: bid.pncpGovUrl,
      kind: "external",
    });

    return {
      text:
        `${portalDesc}\n\n` +
        `**Dados para localizar rapidamente no portal:**\n` +
        `• **Compra nº:** ${bid.purchaseNumber}\n` +
        `• **Modalidade / Disputa:** ${bid.modality}${bid.disputeMode ? ` (${bid.disputeMode})` : ""}\n` +
        `• **CNPJ do órgão:** ${formatCnpj(bid.agencyCnpj)}${bid.uasgCode ? ` • **UASG:** ${bid.uasgCode}` : ""}\n` +
        `• **Registro de Preços (SRP):** ${bid.srp ? "Sim" : "Não"}`,
      links,
    };
  }

  // 4. Pergunta sobre Arquivos / Edital / Termo de Referência / Anexos
  if (
    q.includes("arquivo") ||
    q.includes("documento") ||
    q.includes("anexo") ||
    q.includes("edital") ||
    q.includes("termo de referencia") ||
    q.includes("pdf")
  ) {
    if (documents.length === 0) {
      return {
        text: `Nenhum arquivo avulso foi retornado pela consulta de anexos neste momento. Você pode consultar os documentos diretamente na página oficial do processo no PNCP:`,
        links: [
          {
            label: "Abrir processo no PNCP",
            url: bid.pncpGovUrl,
            kind: "external",
          },
        ],
      };
    }

    return {
      text: `Foram publicados **${documents.length} ${documents.length === 1 ? "arquivo oficial" : "arquivos oficiais"}** pelo órgão comprador. Clique abaixo para abrir ou baixar:`,
      links: documents.slice(0, 6).map((d) => ({
        label: `${d.title} (${d.typeName})`,
        url: d.url,
        kind: "doc" as const,
      })),
    };
  }

  // 5. Pergunta sobre Habilitação / Certidões / Exigências
  if (
    q.includes("habilitacao") ||
    q.includes("certidao") ||
    q.includes("certidoes") ||
    q.includes("atestado") ||
    q.includes("exigencia")
  ) {
    return {
      text:
        `O **Amparo Legal** informado no PNCP é: **${bid.legalBasis || "Lei nº 14.133/2021"}**${bid.legalBasisDescription ? ` (${bid.legalBasisDescription})` : ""}.\n\n` +
        `Em contratações públicas, normalmente são exigidos Cartão CNPJ, Contrato Social/MEI, Certidões Negativas (Federal, Estadual, Municipal, FGTS e Trabalhista) e eventuais atestados técnicos previstos no Termo de Referência. Abra o Edital abaixo para conferir a cláusula exata de habilitação:`,
      links: editalDoc
        ? [{ label: `Abrir ${editalDoc.title}`, url: editalDoc.url, kind: "doc" }]
        : [{ label: "Ver no PNCP", url: bid.pncpGovUrl, kind: "external" }],
    };
  }

  // 6. Pergunta sobre Score / Compatibilidade / CNAE
  if (
    q.includes("score") ||
    q.includes("compatibilidade") ||
    q.includes("cnae") ||
    q.includes("match")
  ) {
    const kws =
      bid.match.matchedKeywords.length > 0
        ? `Termos identificados no edital: **${bid.match.matchedKeywords.join(", ")}**.`
        : "Não houve termos diretos batendo com palavras-chave, mas você pode participar caso seu objeto social atenda ao edital.";
    return {
      text:
        `📊 **Aderência ao perfil da empresa:**\n` +
        `• **Referência:** ${bid.match.matchedCnae ?? "Análise geral do perfil"}\n` +
        `• **Mesmo município da sua empresa:** ${bid.match.sameCity ? "Sim (prioridade local)" : "Não"}\n` +
        `• ${kws}`,
    };
  }

  // 7. Pergunta sobre Itens / Valores / Preços
  if (
    q.includes("iten") ||
    q.includes("item") ||
    q.includes("valor") ||
    q.includes("preco") ||
    q.includes("quanto") ||
    q.includes("orcamento")
  ) {
    const valStr = bid.confidentialBudget
      ? "Orçamento sigiloso"
      : formatCurrencyBr(bid.estimatedValue);

    if (items.length === 0) {
      return {
        text: `💰 **Valor total estimado:** ${valStr}.\nOs itens detalhados desta contratação constam diretamente na planilha do Edital / Termo de Referência anexo.`,
        links: editalDoc
          ? [{ label: `Abrir ${editalDoc.title}`, url: editalDoc.url, kind: "doc" }]
          : undefined,
      };
    }

    const preview = items
      .slice(0, 5)
      .map((it) => {
        const unitPrice = it.confidentialBudget
          ? "Sigiloso"
          : it.unitValue && it.unitValue > 0
            ? `${formatCurrencyBr(it.unitValue)}/un.`
            : "Conforme edital";
        return `• **Item ${it.number}:** ${formatCleanTitle(it.description).slice(0, 85)} — Qtd: ${it.quantity ?? "—"} ${it.unit ?? ""} (${unitPrice})`;
      })
      .join("\n");

    return {
      text:
        `💰 **Valor total estimado da compra:** ${valStr}\n` +
        `📦 **Total de itens no edital:** ${totalItems}\n\n` +
        `**Principais itens:**\n${preview}${items.length > 5 ? `\n\n…além de outros ${totalItems - 5} itens que você pode expandir em "Ver itens do edital".` : ""}`,
    };
  }

  // 8. Busca específica por palavra nos itens ou no objeto
  const tokens = q.split(" ").filter((t) => t.length >= 3);
  if (tokens.length > 0 && items.length > 0) {
    const matchingItems = items.filter((it) => {
      const desc = normalizeText(it.description);
      return tokens.some((tk) => desc.includes(tk));
    });

    if (matchingItems.length > 0) {
      const list = matchingItems
        .slice(0, 5)
        .map(
          (it) =>
            `• **Item ${it.number}:** ${formatCleanTitle(it.description)} — Qtd: ${it.quantity ?? "—"} ${it.unit ?? ""} • Est.: ${it.confidentialBudget ? "Sigiloso" : formatCurrencyBr(it.totalValue ?? it.unitValue)}`,
        )
        .join("\n");
      return {
        text: `Encontrei **${matchingItems.length} ${matchingItems.length === 1 ? "item relacionado" : "itens relacionados"}** à sua busca neste edital:\n\n${list}`,
      };
    }
  }

  // Resposta geral contextualizada com todos os dados reais disponíveis
  return {
    text:
      `Aqui está o resumo oficial confirmado para **${bid.modality} nº ${bid.purchaseNumber}** (${formatOrgName(bid.agencyName)} — ${bid.city}/${bid.uf}):\n\n` +
      `• **Objeto:** ${formatCleanTitle(bid.object)}\n` +
      `• **Valor estimado:** ${bid.confidentialBudget ? "Sigiloso" : formatCurrencyBr(bid.estimatedValue)}\n` +
      `• **Registro de Preços:** ${bid.srp ? "Sim" : "Não"}\n` +
      `• **Encerramento:** ${formatDateBr(bid.closingAt)}\n` +
      `${bid.complementaryInfo ? `• **Info complementar do órgão:** ${bid.complementaryInfo.slice(0, 220)}${bid.complementaryInfo.length > 220 ? "…" : ""}\n` : ""}\n` +
      `Você pode perguntar sobre **itens**, **benefícios ME/EPP**, **prazos**, **arquivos** ou **como participar**!`,
    links: editalDoc
      ? [{ label: `Abrir ${editalDoc.title}`, url: editalDoc.url, kind: "doc" }]
      : [{ label: "Abrir no PNCP", url: bid.pncpGovUrl, kind: "external" }],
  };
}

function renderFormattedContent(text: string) {
  return text.split("\n").map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={lineIdx} className="edital-chat-line">
        {parts.map((part, idx) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={idx}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={idx}>{part}</span>
          ),
        )}
      </p>
    );
  });
}

export function EditalAssistantModal({
  bid,
  onClose,
}: {
  bid: EnrichedMeBid | null;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { data: detailData, isLoading } = useMeBidDetailQuery({
    agencyCnpj: bid?.agencyCnpj,
    year: bid?.year,
    sequential: bid?.sequential,
    enabled: Boolean(bid),
  });

  const documents = useMemo(
    () => detailData?.documents ?? [],
    [detailData?.documents],
  );
  const items = useMemo(() => detailData?.items ?? [], [detailData?.items]);
  const totalItems = detailData?.totalItems ?? items.length;

  useEffect(() => {
    if (!bid) {
      setMessages([]);
      return;
    }

    const valLabel = bid.confidentialBudget
      ? "Sigiloso"
      : formatCurrencyBr(bid.estimatedValue);

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          `Olá! Analisei os dados oficiais do **${bid.modality} nº ${bid.purchaseNumber}** de **${formatOrgName(bid.unitName || bid.agencyName)}** (${bid.city}/${bid.uf}).\n\n` +
          `• **Objeto:** ${formatCleanTitle(bid.object)}\n` +
          `• **Valor total estimado:** ${valLabel}\n` +
          `• **Prazo final:** ${formatDateBr(bid.closingAt)}\n\n` +
          `O que você gostaria de verificar neste edital?`,
      },
    ]);
    setInput("");
  }, [bid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!bid) return null;

  const askQuestion = (questionText: string) => {
    const clean = questionText.trim();
    if (!clean) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: clean,
    };

    const reply = buildAnswer(clean, bid, items, documents, totalItems);
    const botMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: "assistant",
      content: reply.text,
      links: reply.links,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <div
      className="edital-assistant-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Converse com o edital"
      onClick={onClose}
    >
      <aside
        className="edital-assistant-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="edital-assistant-header">
          <div className="edital-assistant-title">
            <span className="edital-assistant-badge">
              <Sparkles size={16} />
            </span>
            <div>
              <strong>Converse com o edital</strong>
              <small>
                {bid.modality} {bid.purchaseNumber} • {bid.city}/{bid.uf}
              </small>
            </div>
          </div>
          <button
            type="button"
            className="edital-assistant-close"
            onClick={onClose}
            aria-label="Fechar assistente"
          >
            <X size={18} />
          </button>
        </header>

        {isLoading && (
          <div className="edital-assistant-syncing">
            Sincronizando anexos e relação de itens no PNCP…
          </div>
        )}

        <div ref={scrollRef} className="edital-assistant-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`edital-chat-bubble is-${msg.role}`}
            >
              <div className="edital-chat-text">
                {renderFormattedContent(msg.content)}
              </div>
              {msg.links && msg.links.length > 0 && (
                <div className="edital-chat-links">
                  {msg.links.map((lnk) => (
                    <a
                      key={`${lnk.url}-${lnk.label}`}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="edital-chat-link-btn"
                    >
                      {lnk.kind === "doc" ? (
                        <Download size={13} />
                      ) : (
                        <ExternalLink size={13} />
                      )}
                      <span>{lnk.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="edital-assistant-quick">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => askQuestion(q)}
              className="edital-quick-chip"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          className="edital-assistant-form"
          onSubmit={(e) => {
            e.preventDefault();
            askQuestion(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre itens, valores, ME/EPP, prazos ou busque um produto…"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Enviar pergunta"
          >
            <Send size={16} />
          </button>
        </form>
      </aside>
    </div>
  );
}
