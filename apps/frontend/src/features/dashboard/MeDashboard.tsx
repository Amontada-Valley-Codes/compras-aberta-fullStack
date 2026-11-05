"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Gavel,
  Globe,
  Heart,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { AppShell, type NavItem } from "./AppShell";
import { OpportunityDonut, SpendingAreaChart } from "./DashboardCharts";
import {
  evaluateBidMatch,
  type CompanyMatchProfile,
  type EnrichedMeBid,
  type MeBidDocument,
  type MeBidItem,
  type MeBidSortBy,
  type MePaginatedBidsRequest,
  type MePncpBid,
  type MePncpSyncMeta,
} from "./me/cnae-match";
import {
  useMeBidDetailQuery,
  useMeOpenBidsQuery,
  useMePaginatedBidsQuery,
  usePrefetchMeBidDetail,
} from "./me/use-me-licitacoes";
import { parsePncpControlNumber } from "./me/pncp-mapper";
import { useRadarState } from "./me/use-radar-state";
import { useBidWorkspace } from "./me/use-bid-workspace";
import type { TrackedBid } from "./me/workspace-types";
import { MeBidCard } from "./me/MeBidCard";
import { MeRadarView } from "./me/MeRadarView";
import { EditalAssistantModal } from "./me/EditalAssistantModal";
import { SelectBidItemsModal } from "./me/SelectBidItemsModal";
import {
  MeBidWorkspace,
  type WorkspaceSubTab,
} from "./me/MeBidWorkspace";
import { MeMyBidsView } from "./me/MeMyBidsView";
import { MeAgendaView } from "./me/MeAgendaView";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { useUserProfile, type CompanyCnae } from "@/hooks/useUserProfile";
import { formatCnpj } from "@/lib/format-br";
import { openDocumentInNewTab } from "@/utils/openInNewTab";

const UPPERCASE_ACRONYMS = new Set([
  "ce",
  "me",
  "epp",
  "mei",
  "srp",
  "pncp",
  "ti",
  "ubs",
  "upa",
  "samu",
  "caps",
  "fms",
  "fmas",
  "sme",
  "sesa",
  "seinfra",
  "seduc",
  "saae",
  "cagece",
  "cnpj",
  "cpf",
  "ltda",
  "sus",
  "fnde",
  "pnae",
  "fundeb",
  "cras",
  "creas",
  "uti",
  "led",
  "pvc",
  "epi",
  "epis",
  "glp",
  "km",
  "br",
  "uf",
  "rh",
  "cnh",
  "inss",
  "fgts",
  "icms",
  "iss",
]);

const LOWERCASE_PARTICLES = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "para",
  "por",
  "com",
  "sem",
  "sob",
  "sobre",
  "a",
  "o",
  "as",
  "os",
  "ao",
  "aos",
  "à",
  "às",
  "pela",
  "pelo",
  "pelas",
  "pelos",
]);

const ACCENT_RESTORE_MAP: Record<string, string> = {
  contratacao: "contratação",
  contratacoes: "contratações",
  aquisicao: "aquisição",
  aquisicoes: "aquisições",
  servico: "serviço",
  servicos: "serviços",
  manutencao: "manutenção",
  manutencoes: "manutenções",
  locacao: "locação",
  locacoes: "locações",
  confeccao: "confecção",
  confeccoes: "confecções",
  construcao: "construção",
  construcoes: "construções",
  ampliacao: "ampliação",
  adequacao: "adequação",
  implantacao: "implantação",
  execucao: "execução",
  prestacao: "prestação",
  genero: "gênero",
  generos: "gêneros",
  alimenticio: "alimentício",
  alimenticios: "alimentícios",
  educacao: "educação",
  saude: "saúde",
  administracao: "administração",
  assistencia: "assistência",
  municipio: "município",
  municipios: "municípios",
  publica: "pública",
  publico: "público",
  publicas: "públicas",
  publicos: "públicos",
  eletronico: "eletrônico",
  eletronica: "eletrônica",
  pregao: "pregão",
  licitacao: "licitação",
  licitacoes: "licitações",
  preco: "preço",
  precos: "preços",
  camara: "câmara",
  agua: "água",
  aguas: "águas",
  veiculo: "veículo",
  veiculos: "veículos",
  peca: "peça",
  pecas: "peças",
  combustivel: "combustível",
  combustiveis: "combustíveis",
  medico: "médico",
  medicos: "médicos",
  medica: "médica",
  medicas: "médicas",
  odontologico: "odontológico",
  odontologicos: "odontológicos",
  farmaceutico: "farmacêutico",
  farmaceuticos: "farmacêuticos",
  tecnico: "técnico",
  tecnicos: "técnicos",
  tecnica: "técnica",
  tecnicas: "técnicas",
  informatica: "informática",
  mobiliario: "mobiliário",
  pedagogico: "pedagógico",
  pedagogicos: "pedagógicos",
  didatico: "didático",
  didaticos: "didáticos",
  basica: "básica",
  basico: "básico",
  basicas: "básicas",
  basicos: "básicos",
  atencao: "atenção",
  protecao: "proteção",
  gestao: "gestão",
  operacao: "operação",
  conservacao: "conservação",
  pavimentacao: "pavimentação",
  iluminacao: "iluminação",
  urbanizacao: "urbanização",
  sanitario: "sanitário",
  sanitarios: "sanitários",
  hidraulico: "hidráulico",
  hidraulicos: "hidráulicos",
  eletrico: "elétrico",
  eletricos: "elétricos",
  eletrica: "elétrica",
  eletricas: "elétricas",
  orgao: "órgão",
  orgaos: "órgãos",
  referencia: "referência",
  especificacao: "especificação",
  especificacoes: "especificações",
  necessario: "necessário",
  necessarios: "necessários",
   vigilancia: "vigilância",
  emergencia: "emergência",
  dispensacao: "dispensação",
  refeicao: "refeição",
  refeicoes: "refeições",
};

function restoreWordFormat(word: string, titleCase = false, isFirstWord = false): string {
  const match = word.match(/^([^a-zA-ZÀ-ÿ0-9]*)([a-zA-ZÀ-ÿ0-9]+(?:\/[a-zA-ZÀ-ÿ0-9]+)?)([^a-zA-ZÀ-ÿ0-9]*)$/);
  if (!match) return word;
  const [, prefix, core, suffix] = match;

  if (core.includes("/")) {
    const parts = core
      .split("/")
      .map((part, idx) => restoreWordFormat(part, titleCase, isFirstWord && idx === 0));
    return `${prefix}${parts.join("/")}${suffix}`;
  }

  const lower = core.toLowerCase();
  if (UPPERCASE_ACRONYMS.has(lower)) {
    return `${prefix}${lower.toUpperCase()}${suffix}`;
  }

  const accented = ACCENT_RESTORE_MAP[lower] ?? lower;

  if (titleCase) {
    if (!isFirstWord && LOWERCASE_PARTICLES.has(accented)) {
      return `${prefix}${accented}${suffix}`;
    }
    return `${prefix}${accented.charAt(0).toUpperCase()}${accented.slice(1)}${suffix}`;
  }

  if (isFirstWord) {
    return `${prefix}${accented.charAt(0).toUpperCase()}${accented.slice(1)}${suffix}`;
  }

  return `${prefix}${accented}${suffix}`;
}

function formatCurrencyBr(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
    return "Ver no edital";
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

function formatCleanTitle(raw: string): string {
  if (!raw) return "Objeto não informado";
  let cleaned = raw
    .trim()
    // Remove tags entre colchetes no início ex: [ Licitação Concorrência ]
    .replace(/^\s*(?:\[[^\]]+\]\s*[-–—:•]*\s*)+/g, "")
    // Remove prefixo "OBJETO:" ou numeração inicial "1.1 -"
    .replace(/^\s*(?:objeto\s*(?:da\s+(?:licita[çc][ãa]o|contrata[çc][ãa]o|compra))?\s*[:\-–—]\s*)/i, "")
    .replace(/^\s*\d+(?:\.\d+)*\s*[)\-–—:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Objeto não informado";

  const letters = cleaned.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  const upperCount = letters.replace(/[^A-ZÀ-Ý]/g, "").length;
  const isMostlyUpper = letters.length > 0 && upperCount / letters.length > 0.55;

  const words = cleaned.split(" ");
  let capitalizeNext = true;

  const formattedWords = words.map((w, idx) => {
    const token = isMostlyUpper ? w.toLowerCase() : w;
    const result = restoreWordFormat(token, false, idx === 0 || capitalizeNext);
    capitalizeNext = /[.!?;:]$/.test(w);
    return result;
  });

  cleaned = formattedWords.join(" ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function extractBidTitleAndSummary(raw: string): {
  title: string;
  summary: string;
} {
  const full = formatCleanTitle(raw);
  let headline = full;

  // Remove aberturas jurídicas repetitivas para deixar o título do card direto e padronizado
  const verbosePrefixes = [
    /^registro de preços para (?:a )?(?:futura e eventual |eventual e futura |futura |eventual )?(?:contratação de empresa (?:especializada )?(?:para (?:a )?|na )?)?/i,
    /^formação de registro de preços para (?:a )?(?:futura e eventual )?/i,
    /^seleção de (?:melhor )?proposta (?:mais vantajosa )?(?:visando|para) (?:a )?(?:futura e eventual )?(?:contratação de empresa (?:especializada )?para )?/i,
    /^escolha da proposta mais vantajosa (?:visando|para) (?:a )?(?:futura e eventual )?(?:contratação de empresa (?:especializada )?para )?/i,
    /^contratação de (?:empresa|pessoa jurídica) (?:especializada )?(?:para (?:a )?(?:futura e eventual )?|na prestação de |no fornecimento de )?/i,
    /^credenciamento de pessoa(?:s)? jurídica(?:s)? (?:especializada(?:s)? )?(?:para (?:a )?|visando (?:a )?)?/i,
    /^pré-qualificação [^,.;]{0,45}?(?:destinada à |visando a |para (?:a )?)(?:contratação de )?/i,
    /^futura e eventual contratação de empresa (?:especializada )?para (?:a )?/i,
    /^futura e eventual /i,
  ];

  for (const regex of verbosePrefixes) {
    const next = headline.replace(regex, "").trim();
    if (next.length >= 18 && next.length < headline.length) {
      headline = next;
      break;
    }
  }

  // Remove sufixos burocráticos longos do título principal (eles continuam visíveis no resumo/ficha)
  headline = headline
    .replace(
      /[.,;]\s*(?:conforme|de acordo com|segundo|nos termos d[oa]|em conformidade com)\s+(?:as\s+|os\s+|a\s+|o\s+)?(?:especificações|condições|quantidades|exigências|termo de referência|edital|anexo|lei|decreto).*$/i,
      "",
    )
    .trim();

  if (!headline) headline = full;
  headline = headline.charAt(0).toUpperCase() + headline.slice(1);

  return {
    title: headline,
    summary: full,
  };
}

function formatOrgName(raw: string | null | undefined): string {
  if (!raw) return "Órgão público";
  const cleaned = raw
    .trim()
    .replace(/^\s*(?:\[[^\]]+\]\s*)+/g, "")
    .replace(/\s*[-–—/]\s*[A-Z]{2}\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Órgão público";

  const words = cleaned.split(" ");
  return words
    .map((w, idx) => restoreWordFormat(w.toLowerCase(), true, idx === 0))
    .join(" ");
}

function formatBuyerLocation(
  city: string | null | undefined,
  uf: string | null | undefined,
  unitName: string | null | undefined,
): string {
  const cityLabel = `${city || "Ceará"}${uf ? `/${uf}` : ""}`;
  if (!unitName) return cityLabel;

  const org = formatOrgName(unitName);
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const normCity = norm(city || "");
  const normOrg = norm(org);

  // Evita redundâncias sujas como "Aquiraz/CE • Prefeitura municipal de aquiraz" ou "Município de jaguaribara"
  if (
    !normOrg ||
    normOrg === normCity ||
    normOrg === `municipio de ${normCity}` ||
    normOrg === `prefeitura de ${normCity}` ||
    normOrg === `prefeitura municipal de ${normCity}` ||
    normOrg === "prefeitura municipal" ||
    normOrg === "governo municipal"
  ) {
    return `${cityLabel} • Prefeitura`;
  }

  // Remove sufixo redundante "de <Cidade>" em secretarias (ex: "Secretaria de Saúde de Paracuru" -> "Secretaria de Saúde")
  const strippedCityOrg = normCity
    ? org.replace(
        new RegExp(`\\s+(?:de|do|da|dos|das)\\s+${city?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        "",
      )
    : org;

  return `${cityLabel} • ${strippedCityOrg.trim()}`;
}

function formatCompactMoney(value: number): string {
  if (value >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  }
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBr(iso: string | null | undefined, withTime = true): string {
  if (!iso) return "Não informada";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Não informada";
  if (!withTime) {
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeadlineBadge(bid: Pick<MePncpBid, "isOpen" | "daysLeft">): {
  label: string;
  tone: "urgent" | "warning" | "open" | "closed";
} {
  if (!bid.isOpen) {
    return { label: "Prazo encerrado", tone: "closed" };
  }
  if (bid.daysLeft === null) {
    return { label: "Recebendo propostas", tone: "open" };
  }
  if (bid.daysLeft <= 0) {
    return { label: "Encerra hoje!", tone: "urgent" };
  }
  if (bid.daysLeft === 1) {
    return { label: "Encerra amanhã", tone: "urgent" };
  }
  if (bid.daysLeft <= 3) {
    return { label: `Faltam ${bid.daysLeft} dias`, tone: "urgent" };
  }
  if (bid.daysLeft <= 7) {
    return { label: `Faltam ${bid.daysLeft} dias`, tone: "warning" };
  }
  return { label: `Faltam ${bid.daysLeft} dias`, tone: "open" };
}

export function MeDashboard({
  initialOpportunityId,
}: {
  initialOpportunityId?: string;
}) {
  const { profile, preferences, savePreferences } = useUserProfile();
  const {
    data: openSummaryData,
    isLoading: loadingBids,
    error: openBidsQueryError,
    refreshPncp,
    isRefreshingPncp,
  } = useMeOpenBidsQuery();

  const [active, setActive] = useState(
    initialOpportunityId ? "opportunities" : "overview",
  );
  const [selectedBid, setSelectedBid] = useState<EnrichedMeBid | null>(null);
  const [chatBid, setChatBid] = useState<EnrichedMeBid | null>(null);
  const [selectItemsModalBid, setSelectItemsModalBid] =
    useState<EnrichedMeBid | null>(null);
  const [managingBidId, setManagingBidId] = useState<string | null>(null);
  const [managingInitialTab, setManagingInitialTab] =
    useState<WorkspaceSubTab>("overview");
  const [pendingDeepLinkId, setPendingDeepLinkId] = useState<string | null>(
    initialOpportunityId ?? null,
  );

  const cnpj = profile?.business?.cnpj ?? profile?.cnpj ?? null;
  const {
    filters: savedRadarFilters,
    savedBidIds: favorites,
    hiddenBidIds,
    hiddenBidIdsList,
    savingFilter,
    toggleSavedBid,
    toggleHiddenBid,
    createFilter,
    updateFilter,
    deleteFilter,
  } = useRadarState(cnpj);

  const {
    trackedBids,
    trackedBidsMap,
    allTrackedBidIds,
    activeTrackedCount,
    reminders,
    calendarEvents,
    upcoming7DaysCount,
    upsertTrackedBid,
    removeTrackedBid,
    toggleAnalysisBid,
    confirmParticipation,
    createReminder,
    updateReminder,
    deleteReminder,
  } = useBidWorkspace(cnpj, favorites, openSummaryData?.bids);

  const syncMeta = openSummaryData?.meta ?? null;
  const bidsError =
    openBidsQueryError instanceof Error ? openBidsQueryError.message : null;

  // Lista de CNAEs reais da empresa + preferências configuradas
  const companyCnaes: CompanyCnae[] = useMemo(() => {
    if (profile?.business?.cnaes && profile.business.cnaes.length > 0) {
      return profile.business.cnaes;
    }
    if (profile?.business?.cnaePrincipal) {
      return [
        {
          codigo: profile.business.cnaePrincipal.codigo,
          descricao: profile.business.cnaePrincipal.descricao,
          isPrincipal: true,
        },
      ];
    }
    return [];
  }, [profile]);

  const companyCity = profile?.business?.municipio?.nome ?? null;
  const companyIbge =
    profile?.business?.municipio?.codigoIbge ?? profile?.municipioIbge ?? null;

  const companyMatchProfile: CompanyMatchProfile = useMemo(
    () => ({
      cnaes: companyCnaes,
      customCnaeText: preferences.customCnaeText,
      extraKeywords: preferences.extraKeywords,
      companyCity,
      companyIbge,
    }),
    [
      companyCnaes,
      preferences.customCnaeText,
      preferences.extraKeywords,
      companyCity,
      companyIbge,
    ],
  );

  // Cruza 100% das licitações abertas do PNCP/CE com o CNAE e palavras-chave da empresa
  const openBids: EnrichedMeBid[] = useMemo(() => {
    const rawList = openSummaryData?.bids ?? [];
    return rawList
      .filter((bid) => bid.isOpen && !hiddenBidIds.has(bid.id))
      .map((bid) => ({
        ...bid,
        match: evaluateBidMatch(bid, companyMatchProfile),
      }));
  }, [openSummaryData?.bids, companyMatchProfile, hiddenBidIds]);

  const liveBidsMap = useMemo(() => {
    const map = new Map<string, EnrichedMeBid>();
    for (const b of openBids) {
      map.set(b.id, b);
    }
    return map;
  }, [openBids]);

  const matchedOpenBids = useMemo(
    () => openBids.filter((b) => b.match.isMatch),
    [openBids],
  );

  // Mantém o score de match sincronizado caso a empresa edite palavras-chave/CNAE
  const activeSelectedBid: EnrichedMeBid | null = useMemo(() => {
    if (!selectedBid) return null;
    return {
      ...selectedBid,
      match:
        selectedBid.match ??
        evaluateBidMatch(selectedBid, companyMatchProfile),
    };
  }, [selectedBid, companyMatchProfile]);

  const activeManagingTracked = useMemo(
    () => (managingBidId ? (trackedBidsMap.get(managingBidId) ?? null) : null),
    [managingBidId, trackedBidsMap],
  );

  // Resolução de link direto (/me?oportunidade=...) via cache ou consulta individual TanStack
  useEffect(() => {
    if (!pendingDeepLinkId) return;
    const foundInOpen = openBids.find((b) => b.id === pendingDeepLinkId);
    if (foundInOpen) {
      setSelectedBid(foundInOpen);
      setPendingDeepLinkId(null);
    }
  }, [pendingDeepLinkId, openBids]);

  const parsedDeepLink = useMemo(
    () =>
      pendingDeepLinkId ? parsePncpControlNumber(pendingDeepLinkId) : null,
    [pendingDeepLinkId],
  );

  const { data: deepLinkDetail } = useMeBidDetailQuery({
    agencyCnpj: parsedDeepLink?.cnpj,
    year: parsedDeepLink?.ano,
    sequential: parsedDeepLink?.sequencial,
    enabled: Boolean(
      parsedDeepLink &&
        !loadingBids &&
        !openBids.some((b) => b.id === pendingDeepLinkId),
    ),
  });

  useEffect(() => {
    if (!pendingDeepLinkId || !deepLinkDetail?.bid) return;
    setSelectedBid({
      ...deepLinkDetail.bid,
      match: evaluateBidMatch(deepLinkDetail.bid, companyMatchProfile),
    });
    setPendingDeepLinkId(null);
  }, [pendingDeepLinkId, deepLinkDetail, companyMatchProfile]);

  const navItems: NavItem[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Visão geral",
        icon: <LayoutDashboard size={19} />,
      },
      {
        id: "opportunities",
        label: "Licitações",
        icon: <Gavel size={19} />,
        badge: openBids.length > 0 ? String(openBids.length) : undefined,
      },
      {
        id: "radar",
        label: "Radar de Licitações",
        icon: <Radio size={19} />,
        badge:
          matchedOpenBids.length > 0
            ? String(matchedOpenBids.length)
            : undefined,
      },
      {
        id: "my-bids",
        label: "Minhas Licitações",
        icon: <FolderKanban size={19} />,
        badge: activeTrackedCount > 0 ? String(activeTrackedCount) : undefined,
      },
      {
        id: "agenda",
        label: "Agenda",
        icon: <CalendarDays size={19} />,
        badge: upcoming7DaysCount > 0 ? String(upcoming7DaysCount) : undefined,
      },
      { id: "documents", label: "Documentos", icon: <FileText size={19} /> },
      {
        id: "profile",
        label: "Perfil e CNAE",
        icon: <Building2 size={19} />,
      },
    ],
    [
      openBids.length,
      matchedOpenBids.length,
      activeTrackedCount,
      upcoming7DaysCount,
    ],
  );

  const navigate = (id: string) => {
    setActive(id);
    setSelectedBid(null);
    setManagingBidId(null);
    setPendingDeepLinkId(null);
  };

  const openBidDetail = (bid: EnrichedMeBid) => {
    setSelectedBid(bid);
    setPendingDeepLinkId(null);
  };

  const toggleFavorite = (id: string) => {
    const found = liveBidsMap.get(id);
    if (found) {
      void handleToggleAnalysisBid(found);
      return;
    }
    toggleSavedBid(id);
  };

  const handleToggleAnalysisBid = async (bid: EnrichedMeBid) => {
    const result = await toggleAnalysisBid(bid);
    if (result === "added") {
      if (!favorites.has(bid.id)) toggleSavedBid(bid.id);
      toast.success("Salva em Minhas Licitações (Análise)", {
        description: "Acesse Minhas Licitações no menu lateral para gerenciar.",
      });
    } else if (result === "removed") {
      if (favorites.has(bid.id)) toggleSavedBid(bid.id);
      toast.info("Removida de Minhas Licitações");
    } else {
      handleManageBid(bid.id, "overview");
    }
  };

  const handleManageBid = (
    bidControlId: string,
    tab: WorkspaceSubTab = "overview",
  ) => {
    setManagingInitialTab(tab);
    setManagingBidId(bidControlId);
    setSelectedBid(null);
  };

  return (
    <AppShell role="me" active={active} onNavigate={navigate} items={navItems}>
      {activeSelectedBid ? (
        <OpportunityDetail
          bid={activeSelectedBid}
          isFavorite={allTrackedBidIds.has(activeSelectedBid.id) || favorites.has(activeSelectedBid.id)}
          companyCnaes={companyCnaes}
          onBack={() => setSelectedBid(null)}
          onToggleFavorite={() => void handleToggleAnalysisBid(activeSelectedBid)}
          onNavigateProfile={() => navigate("profile")}
          onOpenChat={() => setChatBid(activeSelectedBid)}
        />
      ) : activeManagingTracked ? (
        <MeBidWorkspace
          tracked={activeManagingTracked}
          liveBid={liveBidsMap.get(activeManagingTracked.bidControlId)}
          companyMatchProfile={companyMatchProfile}
          reminders={reminders}
          initialTab={managingInitialTab}
          onBack={() => setManagingBidId(null)}
          onOpenSelectItems={() => {
            const live = liveBidsMap.get(activeManagingTracked.bidControlId);
            setSelectItemsModalBid(
              live ?? {
                ...activeManagingTracked.bidSnapshot,
                match: evaluateBidMatch(
                  activeManagingTracked.bidSnapshot,
                  companyMatchProfile,
                ),
              },
            );
          }}
          onOpenChat={(bid) => setChatBid(bid)}
          onOpenFullOfficialFicha={(bid) => setSelectedBid(bid)}
          onUpdateTracked={upsertTrackedBid}
          onRemoveTracked={async (id) => {
            await removeTrackedBid(id);
            if (favorites.has(id)) toggleSavedBid(id);
          }}
          onCreateReminder={createReminder}
          onUpdateReminder={updateReminder}
          onDeleteReminder={deleteReminder}
        />
      ) : (
        <>
          {active === "overview" && (
            <MeOverview
              openBids={openBids}
              matchedOpenBids={matchedOpenBids}
              syncMeta={syncMeta}
              loading={loadingBids}
              error={bidsError}
              onNavigate={navigate}
              onOpenBid={openBidDetail}
            />
          )}
          {active === "radar" && (
            <MeRadarView
              companyMatchProfile={companyMatchProfile}
              companyCnaes={companyCnaes}
              extraKeywords={preferences.extraKeywords}
              companyCity={companyCity}
              savedFilters={savedRadarFilters}
              savingFilter={savingFilter}
              onCreateFilter={createFilter}
              onUpdateFilter={updateFilter}
              onDeleteFilter={deleteFilter}
              savedBidIds={allTrackedBidIds}
              trackedBidsMap={trackedBidsMap}
              hiddenBidIds={hiddenBidIds}
              hiddenBidIdsList={hiddenBidIdsList}
              onToggleSaveBid={toggleFavorite}
              onToggleAnalysisBid={handleToggleAnalysisBid}
              onParticipateBid={(bid) => setSelectItemsModalBid(bid)}
              onManageBid={(bid) => handleManageBid(bid.id, "overview")}
              onToggleHideBid={(id) => toggleHiddenBid(id)}
              onOpenBidDetail={openBidDetail}
              onOpenBidChat={(bid) => setChatBid(bid)}
            />
          )}
          {active === "my-bids" && (
            <MeMyBidsView
              trackedBids={trackedBids}
              calendarEvents={calendarEvents}
              liveBidsMap={liveBidsMap}
              companyMatchProfile={companyMatchProfile}
              onManageBid={(id, tab) => handleManageBid(id, tab)}
              onSelectItemsForBid={(bid) => setSelectItemsModalBid(bid)}
              onOpenChat={(bid) => setChatBid(bid)}
              onUpdateTrackedTags={(id, tags) =>
                upsertTrackedBid(id, { tags })
              }
              onUpdateTrackedNotes={(id, notes) =>
                upsertTrackedBid(id, { notes })
              }
              onRemoveTracked={async (id) => {
                await removeTrackedBid(id);
                if (favorites.has(id)) toggleSavedBid(id);
              }}
              onNavigateRadar={() => navigate("radar")}
              onNavigateAgenda={() => navigate("agenda")}
            />
          )}
          {active === "agenda" && (
            <MeAgendaView
              trackedBids={trackedBids}
              calendarEvents={calendarEvents}
              onOpenBidWorkspace={(id) => handleManageBid(id, "overview")}
              onCreateReminder={createReminder}
              onUpdateReminder={updateReminder}
              onDeleteReminder={deleteReminder}
            />
          )}
          {active === "opportunities" && (
            <Opportunities
              companyMatchProfile={companyMatchProfile}
              companyCnaes={companyCnaes}
              syncMeta={syncMeta}
              onRefreshPncp={() => refreshPncp()}
              isRefreshingPncp={isRefreshingPncp}
              favorites={allTrackedBidIds}
              trackedBidsMap={trackedBidsMap}
              hiddenBidIds={hiddenBidIds}
              hiddenBidIdsList={hiddenBidIdsList}
              onToggleFavorite={toggleFavorite}
              onToggleAnalysisBid={handleToggleAnalysisBid}
              onParticipateBid={(bid) => setSelectItemsModalBid(bid)}
              onManageBid={(bid) => handleManageBid(bid.id, "overview")}
              onToggleHide={(id) => toggleHiddenBid(id)}
              selected={null}
              onSelect={(bid) => {
                setSelectedBid(bid);
                setPendingDeepLinkId(null);
              }}
              onOpenChat={(bid) => setChatBid(bid)}
              onNavigateProfile={() => navigate("profile")}
            />
          )}
          {active === "documents" && <Documents />}
          {active === "profile" && (
            <CompanyProfile
              companyCnaes={companyCnaes}
              customCnaeText={preferences.customCnaeText}
              extraKeywords={preferences.extraKeywords}
              onSavePreferences={savePreferences}
            />
          )}
        </>
      )}

      <SelectBidItemsModal
        bid={selectItemsModalBid}
        existingTracked={
          selectItemsModalBid
            ? (trackedBidsMap.get(selectItemsModalBid.id) ?? null)
            : null
        }
        companyKeywords={preferences.extraKeywords}
        onClose={() => setSelectItemsModalBid(null)}
        onConfirm={async ({ bid, nickname, items }) => {
          await confirmParticipation(bid, { nickname, items });
          if (!favorites.has(bid.id)) toggleSavedBid(bid.id);
          setSelectItemsModalBid(null);
          toast.success("Participação salva em Minhas Licitações!", {
            description:
              "Clique em Gerenciar no card ou acesse Minhas Licitações para precificar.",
          });
        }}
      />

      <EditalAssistantModal bid={chatBid} onClose={() => setChatBid(null)} />
    </AppShell>
  );
}

function MeOverview({
  openBids,
  matchedOpenBids,
  syncMeta,
  loading,
  error,
  onNavigate,
  onOpenBid,
}: {
  openBids: EnrichedMeBid[];
  matchedOpenBids: EnrichedMeBid[];
  syncMeta: MePncpSyncMeta | null;
  loading: boolean;
  error: string | null;
  onNavigate: (id: string) => void;
  onOpenBid: (bid: EnrichedMeBid) => void;
}) {
  const { profile } = useUserProfile();
  const prefetchBidDetail = usePrefetchMeBidDetail();

  const userFirstName = profile?.name?.trim().split(" ")[0] || "Empresário(a)";
  const porte = profile?.business?.porte_empresa || "ME";

  // KPIs calculados com dados 100% reais do PNCP
  const urgentOpenBids = useMemo(
    () =>
      openBids.filter(
        (b) => b.daysLeft !== null && b.daysLeft >= 0 && b.daysLeft <= 5,
      ),
    [openBids],
  );

  const relevantBidsForValue =
    matchedOpenBids.length > 0 ? matchedOpenBids : openBids;
  const totalEstimatedOpenValue = useMemo(
    () =>
      relevantBidsForValue.reduce(
        (sum, b) => sum + (b.estimatedValue ?? 0),
        0,
      ),
    [relevantBidsForValue],
  );

  // Dados reais para o Gráfico 1: Top 6 municípios em valor estimado aberto (R$)
  const cityChartData = useMemo(() => {
    const map = new Map<
      string,
      { city: string; totalValue: number; matchValue: number; count: number }
    >();
    for (const bid of openBids) {
      const key = bid.city || "Outros";
      const curr = map.get(key) ?? {
        city: key,
        totalValue: 0,
        matchValue: 0,
        count: 0,
      };
      const val = bid.estimatedValue ?? 0;
      curr.totalValue += val;
      if (bid.match.isMatch) curr.matchValue += val;
      curr.count += 1;
      map.set(key, curr);
    }
    const sorted = Array.from(map.values())
      .sort((a, b) => b.totalValue - a.totalValue || b.count - a.count)
      .slice(0, 6);

    return {
      categories: sorted.length ? sorted.map((i) => i.city) : ["Sem dados"],
      totalSeries: sorted.length ? sorted.map((i) => Math.round(i.totalValue)) : [0],
      matchSeries: sorted.length ? sorted.map((i) => Math.round(i.matchValue)) : [0],
      ranking: sorted,
    };
  }, [openBids]);

  // Dados reais para o Gráfico 2: Distribuição por Modalidade no PNCP
  const modalityChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const bid of openBids) {
      const mod = bid.modality || "Outras";
      map.set(mod, (map.get(mod) ?? 0) + 1);
    }
    const sorted = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      labels: sorted.length ? sorted.map(([label]) => label) : ["Nenhuma aberta"],
      series: sorted.length ? sorted.map(([, count]) => count) : [0],
    };
  }, [openBids]);

  // Lista de recomendações reais (prioriza as que deram Match com CNAE, depois as abertas de menor prazo)
  const recommendedBids = useMemo(() => {
    const source = matchedOpenBids.length > 0 ? matchedOpenBids : openBids;
    return [...source]
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 4);
  }, [matchedOpenBids, openBids]);

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow={`PAINEL DA EMPRESA • ${porte}`}
        title={`Olá, ${userFirstName}!`}
      />

      {error && (
        <section className="dashboard-card" style={{ borderColor: "#f59e0b" }}>
          <p style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <AlertTriangle size={18} /> {error}
          </p>
        </section>
      )}

      <section className="metric-grid">
        <Metric
          icon={<Sparkles />}
          label="Compatíveis com sua atividade"
          value={loading ? "…" : String(matchedOpenBids.length)}
          trend={
            openBids.length > 0
              ? `${Math.round((matchedOpenBids.length / openBids.length) * 100)}% das abertas`
              : undefined
          }
        />
        <Metric
          icon={<Gavel />}
          label="Licitações abertas (CE)"
          value={loading ? "…" : String(openBids.length)}
          trend={syncMeta?.isComplete ? "100% do PNCP/CE" : undefined}
        />
        <Metric
          icon={<TrendingUp />}
          label={
            matchedOpenBids.length > 0
              ? "Valor aberto no seu CNAE"
              : "Valor total em disputa"
          }
          value={loading ? "…" : formatCompactMoney(totalEstimatedOpenValue)}
          tone="gold"
        />
        <Metric
          icon={<Clock3 />}
          label="Encerram em até 5 dias"
          value={loading ? "…" : String(urgentOpenBids.length)}
        />
      </section>

      <section className="dashboard-grid two-thirds">
        <article className="dashboard-card chart-card">
          <CardHeader
            title="Volume financeiro em editais abertos por município"
            subtitle="Valores estimados reais publicados no PNCP (Total x Compatíveis com suas atividades)"
          />
          <SpendingAreaChart
            categories={cityChartData.categories}
            totalSeries={cityChartData.totalSeries}
            matchSeries={cityChartData.matchSeries}
          />
        </article>
        <article className="dashboard-card chart-card">
          <CardHeader title="Editais abertos por modalidade" />
          <OpportunityDonut
            labels={modalityChartData.labels}
            series={modalityChartData.series}
            totalLabel="abertas"
          />
        </article>
      </section>

      <section className="dashboard-card recommendation-card">
        <CardHeader
          title={
            matchedOpenBids.length > 0
              ? "Licitações compatíveis com sua empresa"
              : "Licitações abertas em destaque no PNCP"
          }
          action={
            <button onClick={() => onNavigate("opportunities")}>
              Ver todas ({openBids.length}) <ArrowRight />
            </button>
          }
        />
        {loading ? (
          <p className="match-spotlight-empty">
            Consultando licitações no PNCP…
          </p>
        ) : recommendedBids.length === 0 ? (
          <p className="match-spotlight-empty">
            Nenhuma licitação aberta retornada no momento.
          </p>
        ) : (
          <div className="match-spotlight-grid">
            {recommendedBids.map((item) => {
              const { title: headline } = extractBidTitleAndSummary(item.object);
              const deadline = formatDeadlineBadge(item);
              const hasValue =
                item.estimatedValue !== null &&
                item.estimatedValue !== undefined &&
                !Number.isNaN(item.estimatedValue) &&
                item.estimatedValue > 0;

              return (
                <button
                  type="button"
                  key={item.id}
                  className="match-spotlight-item"
                  onMouseEnter={() =>
                    prefetchBidDetail(
                      item.agencyCnpj,
                      item.year,
                      item.sequential,
                    )
                  }
                  onClick={() => onOpenBid(item)}
                >
                  <div className="match-spotlight-top">
                    <div className="match-spotlight-badges">
                      <span
                        className={`match-pill ${item.match.isMatch ? "is-match" : ""}`}
                      >
                        <Sparkles size={13} />
                        {item.match.isMatch
                          ? "Alta compatibilidade"
                          : "Edital aberto"}
                      </span>
                      <span className="modality-pill">{item.modality}</span>
                    </div>
                    <span className={`deadline-pill ${deadline.tone}`}>
                      <CalendarClock size={13} />
                      {deadline.label}
                    </span>
                  </div>

                  <strong className="match-spotlight-title">{headline}</strong>

                  <div className="match-spotlight-footer">
                    <span className="match-spotlight-location">
                      <MapPin size={14} />
                      <span>
                        {formatBuyerLocation(item.city, item.uf, item.unitName)}
                      </span>
                    </span>
                    <span
                      className={`match-spotlight-price ${hasValue ? "has-value" : "is-muted"}`}
                    >
                      {hasValue
                        ? formatCurrencyBr(item.estimatedValue)
                        : "Valor no edital"}
                      <ArrowRight size={15} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="dashboard-grid halves bottom-grid">
        <article className="dashboard-card compact-card">
          <CardHeader
            title="Municípios com mais editais abertos"
          />
          {cityChartData.ranking.slice(0, 4).map((item, index) => {
            const maxVal = cityChartData.ranking[0]?.totalValue || 1;
            const pct = Math.max(12, Math.round((item.totalValue / maxVal) * 100));
            return (
              <div className="ranking-row" key={item.city}>
                <span>{index + 1}</span>
                <div>
                  <b>{item.city}</b>
                  <small>
                    {item.count} {item.count === 1 ? "licitação aberta" : "licitações abertas"}
                  </small>
                  <i>
                    <em style={{ width: `${pct}%` }} />
                  </i>
                </div>
                <strong>{formatCompactMoney(item.totalValue)}</strong>
              </div>
            );
          })}
          {!loading && cityChartData.ranking.length === 0 && (
            <p style={{ opacity: 0.7 }}>Sem licitações abertas para exibir.</p>
          )}
        </article>

        <article className="dashboard-card compact-card">
          <CardHeader
            title="Radar de licitações e prazos"
          />
          <div className="activity-list">
            {matchedOpenBids.slice(0, 2).map((bid) => {
              const cleanObj = formatCleanTitle(bid.object);
              return (
                <span
                  key={`alert-match-${bid.id}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onOpenBid(bid)}
                >
                  <i className="blue">
                    <Sparkles />
                  </i>
                  <div>
                    <b>Compatível com seu ramo</b>
                    <small>
                      {bid.city}: {cleanObj.slice(0, 72)}
                      {cleanObj.length > 72 ? "…" : ""}
                    </small>
                  </div>
                  <em>Aberta</em>
                </span>
              );
            })}
            {urgentOpenBids.slice(0, 2).map((bid) => {
              const cleanObj = formatCleanTitle(bid.object);
              return (
                <span
                  key={`alert-urgent-${bid.id}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => onOpenBid(bid)}
                >
                  <i className="gold">
                    <Clock3 />
                  </i>
                  <div>
                    <b>
                      Prazo encerrando (
                      {bid.daysLeft !== null && bid.daysLeft <= 0
                        ? "hoje"
                        : `${bid.daysLeft}d`}
                      )
                    </b>
                    <small>
                      {bid.city}: {cleanObj.slice(0, 72)}
                      {cleanObj.length > 72 ? "…" : ""}
                    </small>
                  </div>
                  <em>Urgente</em>
                </span>
              );
            })}
            {!loading &&
              matchedOpenBids.length === 0 &&
              urgentOpenBids.length === 0 && (
                <span>
                  <i className="green">
                    <Bell />
                  </i>
                  <div>
                    <b>Nenhum alerta crítico no momento</b>
                    <small>
                      Configure grupos de palavras-chave no Radar de Licitações para ampliar o monitoramento.
                    </small>
                  </div>
                  <em>OK</em>
                </span>
              )}
          </div>
        </article>
      </section>
    </div>
  );
}

const OPP_PAGE_SIZES = [10, 20, 30] as const;

function buildOppPageList(current: number, total: number): Array<number | "gap"> {
  const pages = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  return pages.flatMap((p, idx) =>
    idx > 0 && p - pages[idx - 1] > 1 ? (["gap", p] as const) : [p],
  );
}

function Opportunities({
  companyMatchProfile,
  companyCnaes,
  syncMeta,
  onRefreshPncp,
  isRefreshingPncp,
  favorites,
  trackedBidsMap,
  hiddenBidIds,
  hiddenBidIdsList,
  onToggleFavorite,
  onToggleAnalysisBid,
  onParticipateBid,
  onManageBid,
  onToggleHide,
  selected,
  onSelect,
  onOpenChat,
  onNavigateProfile,
  favoritesOnly = false,
}: {
  companyMatchProfile: CompanyMatchProfile;
  companyCnaes: CompanyCnae[];
  syncMeta: MePncpSyncMeta | null;
  onRefreshPncp: () => void;
  isRefreshingPncp: boolean;
  favorites: Set<string>;
  trackedBidsMap?: Map<string, TrackedBid>;
  hiddenBidIds: Set<string>;
  hiddenBidIdsList: string[];
  onToggleFavorite: (id: string) => void;
  onToggleAnalysisBid?: (bid: EnrichedMeBid) => void;
  onParticipateBid?: (bid: EnrichedMeBid) => void;
  onManageBid?: (bid: EnrichedMeBid) => void;
  onToggleHide: (id: string) => void;
  selected: EnrichedMeBid | null;
  onSelect: (bid: EnrichedMeBid | null) => void;
  onOpenChat: (bid: EnrichedMeBid) => void;
  onNavigateProfile: () => void;
  favoritesOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [onlyCnaeMatch, setOnlyCnaeMatch] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [sortBy, setSortBy] = useState<MeBidSortBy>("match");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(OPP_PAGE_SIZES[0]);
  const resultsTopRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQuery("");
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedQuery,
    onlyCnaeMatch,
    cityFilter,
    modalityFilter,
    sortBy,
    favoritesOnly,
  ]);

  const favoriteIds = useMemo(
    () => (favoritesOnly ? Array.from(favorites) : undefined),
    [favorites, favoritesOnly],
  );

  const paginatedRequest: MePaginatedBidsRequest = useMemo(
    () => ({
      page,
      pageSize,
      query: debouncedQuery || undefined,
      city: cityFilter || undefined,
      modality: modalityFilter || undefined,
      onlyCnaeMatch: onlyCnaeMatch || undefined,
      sortBy,
      favoritesOnly: favoritesOnly || undefined,
      favoriteIds,
      hiddenBidIds: favoritesOnly ? undefined : hiddenBidIdsList,
      companyProfile: companyMatchProfile,
    }),
    [
      page,
      pageSize,
      debouncedQuery,
      cityFilter,
      modalityFilter,
      onlyCnaeMatch,
      sortBy,
      favoritesOnly,
      favoriteIds,
      hiddenBidIdsList,
      companyMatchProfile,
    ],
  );

  const {
    data: pageData,
    isLoading: pageLoading,
    isFetching: pageFetching,
    isPlaceholderData,
    error: pageQueryError,
    prefetchPage,
  } = useMePaginatedBidsQuery(paginatedRequest);

  const cityOptions = useMemo(
    () =>
      (pageData?.facets.cities ?? []).map((city) => ({
        value: city,
        label: city,
      })),
    [pageData?.facets.cities],
  );

  const modalityOptions = useMemo(
    () =>
      (pageData?.facets.modalities ?? []).map((mod) => ({
        value: mod,
        label: mod,
      })),
    [pageData?.facets.modalities],
  );

  if (selected) {
    return (
      <OpportunityDetail
        bid={selected}
        isFavorite={favorites.has(selected.id)}
        companyCnaes={companyCnaes}
        onBack={() => onSelect(null)}
        onToggleFavorite={() => onToggleFavorite(selected.id)}
        onNavigateProfile={onNavigateProfile}
        onOpenChat={() => onOpenChat(selected)}
      />
    );
  }

  const paginatedList = pageData?.items ?? [];
  const totalItems = pageData?.totalItems ?? 0;
  const totalPages = pageData?.totalPages ?? 1;
  const currentPage = pageData?.page ?? page;
  const firstIndex = (currentPage - 1) * pageSize;
  const effectiveMeta = pageData?.meta ?? syncMeta;
  const errorMessage =
    pageQueryError instanceof Error ? pageQueryError.message : null;

  const hasActiveFilters = Boolean(
    query.trim() || cityFilter || modalityFilter || onlyCnaeMatch,
  );

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    setPage(clamped);
    const el = resultsTopRef.current;
    if (el && el.getBoundingClientRect().top < 84) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="PORTAL NACIONAL DE CONTRATAÇÕES PÚBLICAS (PNCP)"
        title={
          favoritesOnly
            ? "Licitações salvas nos favoritos"
            : "Licitações abertas no Ceará"
        }
        description={
          favoritesOnly
            ? "Acompanhe os editais que você salvou para analisar ou disputar."
            : "Consulte 100% dos editais com propostas abertas no Ceará diretamente do PNCP, filtre pelo Match com o CNAE da sua empresa e acesse o portal de disputa."
        }
      />

      <section ref={resultsTopRef} className="dashboard-card opp-toolbar">
        <div className="opp-toolbar-top">
          {favoritesOnly ? (
            <div className="opp-sync-status">
              <span className="opp-sync-badge is-complete">
                <Bookmark size={14} />
                {favorites.size}{" "}
                {favorites.size === 1 ? "licitação salva" : "licitações salvas"}
              </span>
            </div>
          ) : (
            <div className="opp-sync-status">
              {effectiveMeta ? (
                <span
                  className={`opp-sync-badge ${effectiveMeta.isComplete ? "is-complete" : "is-partial"}`}
                  title={`Escopo ${effectiveMeta.scope} • ${effectiveMeta.pncpFetchedPages} de ${effectiveMeta.pncpTotalPages} páginas consultadas no PNCP`}
                >
                  {effectiveMeta.isComplete ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <AlertTriangle size={14} />
                  )}
                  {effectiveMeta.isComplete
                    ? `${effectiveMeta.totalOpenBids} abertas no CE • 100% PNCP`
                    : `${effectiveMeta.totalOpenBids} abertas carregadas`}
                </span>
              ) : (
                <span className="opp-sync-badge">
                  <RefreshCw size={14} className="is-spinning" />
                  Sincronizando editais abertos do Ceará…
                </span>
              )}

              <button
                type="button"
                className="opp-refresh-btn"
                onClick={onRefreshPncp}
                disabled={isRefreshingPncp || pageLoading}
                title="Sincronizar novamente todas as páginas de propostas abertas no PNCP"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshingPncp ? "is-spinning" : ""}
                />
                <span>{isRefreshingPncp ? "Sincronizando…" : "Atualizar"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="opp-toolbar-controls">
          <label className="opp-search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por objeto, edital ou órgão…"
            />
            {query && (
              <button
                type="button"
                className="opp-search-clear"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <PublicFilterSelect
            name="municipio"
            label="Município"
            allLabel="Todos (CE)"
            icon="municipality"
            variant="dashboard"
            value={cityFilter}
            options={cityOptions}
            onValueChange={setCityFilter}
          />

          <PublicFilterSelect
            name="modalidade"
            label="Modalidade"
            allLabel="Todas"
            icon="modality"
            variant="dashboard"
            value={modalityFilter}
            options={modalityOptions}
            onValueChange={setModalityFilter}
          />

          <PublicFilterSelect
            name="ordenar"
            label="Ordenar por"
            icon="sort"
            variant="dashboard"
            value={sortBy}
            options={[
              { value: "match", label: "Maior compatibilidade" },
              { value: "deadline", label: "Prazo mais próximo" },
              { value: "value", label: "Maior valor" },
              { value: "recent", label: "Mais recentes" },
            ]}
            onValueChange={(val) =>
              setSortBy((val as MeBidSortBy) || "match")
            }
          />
        </div>
      </section>

      <div className="opp-results-meta">
        <p>
          {pageLoading ? (
            <>Consultando editais abertos no PNCP…</>
          ) : totalItems > paginatedList.length ? (
            <>
              Mostrando <b>{firstIndex + 1}</b> a{" "}
              <b>{firstIndex + paginatedList.length}</b> de <b>{totalItems}</b>{" "}
              {favoritesOnly ? "licitações salvas" : "licitações abertas"}
              {isPlaceholderData && pageFetching ? " (carregando página…)" : ""}
            </>
          ) : (
            <>
              <b>{totalItems}</b>{" "}
              {favoritesOnly
                ? totalItems === 1
                  ? "licitação salva"
                  : "licitações salvas"
                : totalItems === 1
                  ? "licitação aberta encontrada"
                  : "licitações abertas encontradas"}
            </>
          )}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            className="opp-clear-filters"
            onClick={() => {
              setQuery("");
              setCityFilter("");
              setModalityFilter("");
              setOnlyCnaeMatch(false);
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {errorMessage && (
        <section className="dashboard-card empty-state">
          <AlertTriangle />
          <h2>Erro ao consultar o PNCP</h2>
          <p>{errorMessage}</p>
        </section>
      )}

      {pageLoading ? (
        <section className="dashboard-card empty-state">
          <RefreshCw />
          <h2>Carregando licitações abertas do PNCP…</h2>
          <p>Sincronizando todas as páginas de propostas abertas no Ceará.</p>
        </section>
      ) : (
        <>
          <section
            className={`me-bid-cards-stack ${isPlaceholderData ? "is-placeholder" : ""}`}
          >
            {paginatedList.map((item) => (
              <MeBidCard
                key={item.id}
                bid={item}
                isSaved={favorites.has(item.id)}
                trackedBid={trackedBidsMap?.get(item.id) ?? null}
                isHidden={hiddenBidIds.has(item.id)}
                onToggleSave={onToggleFavorite}
                onToggleAnalysis={onToggleAnalysisBid}
                onParticipate={onParticipateBid}
                onManage={onManageBid}
                onToggleHide={favoritesOnly ? undefined : onToggleHide}
                onOpenDetail={(b) => onSelect(b)}
                onOpenChat={onOpenChat}
              />
            ))}
          </section>

          {!errorMessage && totalItems > OPP_PAGE_SIZES[0] && (
            <div className="opp-pagination">
              <p className="opp-pagination-count">
                Mostrando <b>{firstIndex + 1}</b> a{" "}
                <b>{firstIndex + paginatedList.length}</b> de{" "}
                <b>{totalItems}</b>
              </p>

              <div
                className="opp-page-size"
                role="group"
                aria-label="Licitações por página"
              >
                <span>Por página</span>
                <div className="opp-page-size-options">
                  {OPP_PAGE_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`opp-page-size-btn ${pageSize === size ? "is-active" : ""}`}
                      aria-pressed={pageSize === size}
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
                  aria-label="Paginação das licitações"
                >
                  <ul className="opp-pagination-list">
                    <li>
                      <button
                        type="button"
                        className="opp-page-control"
                        disabled={currentPage === 1}
                        onMouseEnter={() => prefetchPage(currentPage - 1)}
                        onClick={() => goToPage(currentPage - 1)}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft size={17} aria-hidden="true" />
                        <span>Anterior</span>
                      </button>
                    </li>

                    {buildOppPageList(currentPage, totalPages).map(
                      (entry, idx) =>
                        entry === "gap" ? (
                          <li key={`gap-${idx}`}>
                            <span
                              className="opp-page-ellipsis"
                              aria-hidden="true"
                            >
                              <MoreHorizontal size={16} />
                            </span>
                          </li>
                        ) : (
                          <li key={entry}>
                            <button
                              type="button"
                              className={`opp-page-btn ${entry === currentPage ? "is-active" : ""}`}
                              aria-current={
                                entry === currentPage ? "page" : undefined
                              }
                              aria-label={`Ir para a página ${entry}`}
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
                        aria-label="Próxima página"
                      >
                        <span>Próxima</span>
                        <ChevronRight size={17} aria-hidden="true" />
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          )}
        </>
      )}

      {!pageLoading && !errorMessage && totalItems === 0 && (
        <section className="dashboard-card empty-state">
          <Search />
          <h2>
            {favoritesOnly && favorites.size === 0
              ? "Você ainda não salvou nenhuma licitação"
              : "Nenhuma licitação aberta encontrada com esses filtros"}
          </h2>
          <p>
            {favoritesOnly && favorites.size === 0
              ? "Clique no ícone de coração em qualquer edital aberto para acompanhá-lo aqui."
              : "Experimente limpar a busca, trocar o município ou desmarcar o filtro de Match CNAE."}
          </p>
        </section>
      )}
    </div>
  );
}

function renderTextWithLinks(text: string): React.ReactNode {
  const parts = text.split(/(https?:\/\/[^\s<>"')]+|www\.[^\s<>"')]+)/gi);
  return parts.map((part, idx) => {
    if (/^(?:https?:\/\/|www\.)/i.test(part)) {
      const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
      return (
        <a key={idx} href={href} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function OpportunityDetail({
  bid,
  isFavorite,
  companyCnaes,
  onBack,
  onToggleFavorite,
  onNavigateProfile,
  onOpenChat,
}: {
  bid: EnrichedMeBid;
  isFavorite: boolean;
  companyCnaes: CompanyCnae[];
  onBack: () => void;
  onToggleFavorite: () => void;
  onNavigateProfile: () => void;
  onOpenChat?: () => void;
}) {
  const [showAllItems, setShowAllItems] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const { data: detailData, isLoading: loadingDetails } = useMeBidDetailQuery({
    agencyCnpj: bid.agencyCnpj,
    year: bid.year,
    sequential: bid.sequential,
  });

  useEffect(() => {
    setShowAllItems(false);
    setCopiedId(false);
  }, [bid.id]);

  const effectiveBid: EnrichedMeBid = useMemo(() => {
    if (!detailData?.bid) return bid;
    return {
      ...bid,
      ...detailData.bid,
      match: bid.match,
    };
  }, [bid, detailData]);

  const documents: MeBidDocument[] = useMemo(
    () => detailData?.documents ?? [],
    [detailData?.documents],
  );
  const items: MeBidItem[] = useMemo(
    () => detailData?.items ?? [],
    [detailData?.items],
  );
  const totalItems = detailData?.totalItems ?? items.length;

  const primaryEditalDoc = useMemo(
    () =>
      documents.find((d) =>
        `${d.typeName} ${d.title}`.toLowerCase().includes("edital"),
      ) ?? documents[0] ?? null,
    [documents],
  );

  const mpeBenefitCount = useMemo(
    () =>
      items.filter((i) => {
        const b = (i.benefitName ?? "").toLowerCase();
        return (
          b.includes("exclusiv") ||
          b.includes("me/epp") ||
          b.includes("cota") ||
          b.includes("microempresa")
        );
      }).length,
    [items],
  );

  const mainCnae = companyCnaes[0];
  const { title: cleanHeadline, summary: cleanFullObject } =
    extractBidTitleAndSummary(effectiveBid.object);
  const deadline = formatDeadlineBadge(effectiveBid);

  const hasEstimatedValue =
    effectiveBid.estimatedValue !== null &&
    effectiveBid.estimatedValue !== undefined &&
    !Number.isNaN(effectiveBid.estimatedValue) &&
    effectiveBid.estimatedValue > 0;

  const shortPortalLabel = effectiveBid.portalName
    ? effectiveBid.portalName.replace(/\s*\([^)]*\)\s*/g, "").trim()
    : null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(effectiveBid.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2400);
    } catch {
      // fallback silencioso
    }
  };

  const visibleItems = showAllItems ? items : items.slice(0, 10);

  return (
    <div className="dashboard-page opportunity-detail-page">
      {/* Barra superior limpa */}
      <div className="opp-detail-topbar">
        <button type="button" className="opp-back-btn" onClick={onBack}>
          <ArrowLeft size={17} />
          Voltar para licitações
        </button>

        <div className="opp-detail-top-actions">
          {onOpenChat && (
            <button
              type="button"
              className="opp-ghost-btn is-chat-accent"
              onClick={onOpenChat}
            >
              <Sparkles size={16} />
              Converse com o edital
            </button>
          )}

          <button
            type="button"
            className={`opp-ghost-btn ${copiedId ? "is-copied" : ""}`}
            onClick={handleCopyCode}
          >
            {copiedId ? <Check size={16} /> : <Copy size={16} />}
            {copiedId ? "Código PNCP copiado" : "Copiar código PNCP"}
          </button>

          <button
            type="button"
            className={`opp-ghost-btn ${isFavorite ? "is-favorite" : ""}`}
            onClick={onToggleFavorite}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
            {isFavorite ? "Salva nos favoritos" : "Salvar nos favoritos"}
          </button>
        </div>
      </div>

      {/* Cabeçalho Principal (Hero) */}
      <section className="opp-detail-hero">
        <div className="opp-hero-badges">
          <span
            className={`opp-badge status-dot ${effectiveBid.isOpen ? "status-open" : "status-closed"}`}
          >
            <i aria-hidden="true" />
            {effectiveBid.isOpen
              ? "Aberta para propostas"
              : "Prazo encerrado"}
          </span>

          {effectiveBid.isOpen && (
            <span
              className={`opp-badge ${deadline.tone === "urgent" ? "urgent" : deadline.tone === "warning" ? "warning" : "status-open"}`}
            >
              <Clock3 size={14} />
              {deadline.label}
            </span>
          )}

          <span className="opp-badge modality">{effectiveBid.modality}</span>

          {effectiveBid.srp && (
            <span className="opp-badge srp">Registro de Preços (SRP)</span>
          )}

          {effectiveBid.match.isMatch && (
            <span className="opp-badge match">
              <Sparkles size={14} />
              Compatível com sua empresa
            </span>
          )}
        </div>

        <div className="opp-hero-heading">
          <h1 className="opp-hero-title">{cleanHeadline}</h1>
          <p className="opp-hero-subtitle">
            <span>
              <Building2 size={17} />
              {formatBuyerLocation(
                effectiveBid.city,
                effectiveBid.uf,
                effectiveBid.unitName,
              )}
            </span>
            <span className="opp-hero-sep">•</span>
            <span>Compra nº {effectiveBid.purchaseNumber}</span>
            {effectiveBid.process &&
              effectiveBid.process !== effectiveBid.purchaseNumber && (
                <>
                  <span className="opp-hero-sep">•</span>
                  <span>Processo {effectiveBid.process}</span>
                </>
              )}
          </p>
        </div>

        <div className="opp-detail-kpis">
          <div className="opp-kpi-box">
            <span className="opp-kpi-label">
              <TrendingUp size={15} />
              Valor total estimado
            </span>
            <strong className="opp-kpi-value">
              {hasEstimatedValue
                ? formatCurrencyBr(effectiveBid.estimatedValue)
                : effectiveBid.confidentialBudget
                  ? "Orçamento sigiloso"
                  : "Conforme edital"}
            </strong>
            <span className="opp-kpi-sub">
              {effectiveBid.awardedValue !== null &&
              effectiveBid.awardedValue > 0
                ? `Homologado: ${formatCurrencyBr(effectiveBid.awardedValue)}`
                : "Referência oficial da contratação"}
            </span>
          </div>

          <div className="opp-kpi-box">
            <span className="opp-kpi-label">
              <CalendarClock size={15} />
              {effectiveBid.isOpen
                ? "Prazo final para propostas"
                : "Encerramento das propostas"}
            </span>
            <strong
              className={`opp-kpi-value ${effectiveBid.isOpen && effectiveBid.daysLeft !== null && effectiveBid.daysLeft <= 3 ? "is-urgent" : ""}`}
            >
              {formatDateBr(effectiveBid.closingAt)}
            </strong>
            <span className="opp-kpi-sub">
              {effectiveBid.openingAt
                ? `Abertura: ${formatDateBr(effectiveBid.openingAt)}`
                : deadline.label}
            </span>
          </div>

          <div className="opp-kpi-box highlight-portal">
            <span className="opp-kpi-label">
              <Globe size={15} />
              Portal de participação
            </span>
            <strong className="opp-kpi-value">
              {effectiveBid.portalName ?? "Definido no Edital"}
            </strong>
            <span className="opp-kpi-sub">
              {effectiveBid.portalUrlIsDirect
                ? "Link direto para a sala de disputa"
                : effectiveBid.portalUrl
                  ? "Plataforma eletrônica onde ocorre a disputa"
                  : "Consulte o Edital para o canal de envio"}
            </span>
          </div>

          <div className="opp-kpi-box">
            <span className="opp-kpi-label">
              <Gavel size={15} />
              Modo de disputa
            </span>
            <strong className="opp-kpi-value">
              {effectiveBid.disputeMode ||
                effectiveBid.instrumentType ||
                "Conforme edital"}
            </strong>
            <span className="opp-kpi-sub">{effectiveBid.situation}</span>
          </div>
        </div>
      </section>

      {/* Grid Principal em 2 Colunas */}
      <div className="opp-detail-grid">
        {/* Coluna Esquerda: Conteúdo Essencial, Edital/Anexos e Itens */}
        <div className="opp-detail-main">
          {/* 1. Objeto e Ficha Essencial */}
          <section className="opp-section-card">
            <header className="opp-section-header">
              <div className="opp-section-title-group">
                <span className="opp-section-icon">
                  <FileText size={20} />
                </span>
                <div>
                  <h2>Objeto e dados da contratação</h2>
                  <p>Resumo organizado sem duplicações para análise rápida</p>
                </div>
              </div>
            </header>

            <div className="opp-object-box">
              <span className="opp-box-eyebrow">Objeto completo</span>
              <p className="opp-object-text">{cleanFullObject}</p>
            </div>

            {effectiveBid.complementaryInfo && (
              <div className="opp-complementary-box">
                <span className="opp-box-eyebrow">
                  Informações complementares do órgão
                </span>
                <p className="opp-complementary-text">
                  {renderTextWithLinks(effectiveBid.complementaryInfo)}
                </p>
              </div>
            )}

            <dl className="opp-meta-grid">
              <div className="opp-meta-item">
                <dt>Órgão comprador</dt>
                <dd>{formatOrgName(effectiveBid.agencyName)}</dd>
              </div>

              <div className="opp-meta-item">
                <dt>Unidade compradora</dt>
                <dd>
                  {formatOrgName(effectiveBid.unitName)}
                  {effectiveBid.uasgCode
                    ? ` (UASG ${effectiveBid.uasgCode})`
                    : ""}
                </dd>
              </div>

              <div className="opp-meta-item">
                <dt>CNPJ do órgão</dt>
                <dd>{formatCnpj(effectiveBid.agencyCnpj)}</dd>
              </div>

              <div className="opp-meta-item">
                <dt>Controle oficial PNCP</dt>
                <dd>
                  <code>{effectiveBid.id}</code>
                </dd>
              </div>

              <div className="opp-meta-item">
                <dt>Instrumento convocatório</dt>
                <dd>{effectiveBid.instrumentType || "Edital"}</dd>
              </div>

              <div className="opp-meta-item">
                <dt>Amparo legal</dt>
                <dd>
                  {effectiveBid.legalBasis || "Lei nº 14.133/2021"}
                  {effectiveBid.legalBasisDescription
                    ? ` — ${effectiveBid.legalBasisDescription}`
                    : ""}
                </dd>
              </div>
            </dl>
          </section>

          {/* 2. Edital e Documentos Oficiais */}
          <section className="opp-section-card">
            <header className="opp-section-header">
              <div className="opp-section-title-group">
                <span className="opp-section-icon">
                  <Download size={20} />
                </span>
                <div>
                  <h2>Edital e documentos oficiais</h2>
                  <p>
                    Arquivos publicados pelo órgão no Portal Nacional de
                    Contratações Públicas
                  </p>
                </div>
              </div>
              {!loadingDetails && (
                <span className="opp-count-pill">
                  {documents.length}{" "}
                  {documents.length === 1 ? "arquivo" : "arquivos"}
                </span>
              )}
            </header>

            {loadingDetails ? (
              <div className="opp-loading-inline">
                <RefreshCw size={18} />
                <span>Buscando edital e anexos oficiais no PNCP…</span>
              </div>
            ) : documents.length > 0 ? (
              <div className="opp-docs-list">
                {documents.map((doc) => {
                  const isEdital = `${doc.typeName} ${doc.title}`
                    .toLowerCase()
                    .includes("edital");
                  return (
                    <article
                      key={`${doc.id}-${doc.url}`}
                      className={`opp-doc-row ${isEdital ? "is-edital" : ""}`}
                    >
                      <div className="opp-doc-info">
                        <span className="opp-doc-icon">
                          <FileText size={20} />
                        </span>
                        <div className="opp-doc-text">
                          <strong>{doc.title}</strong>
                          <div className="opp-doc-meta">
                            <span className="opp-doc-type-badge">
                              {doc.typeName}
                            </span>
                            {doc.publishedAt && (
                              <span>
                                Publicado em {formatDateBr(doc.publishedAt, false)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <a
                        className="opp-doc-btn"
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={15} />
                        Abrir arquivo
                      </a>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="opp-section-empty">
                <span>
                  Nenhum anexo avulso foi retornado pela API neste momento.
                  Consulte diretamente a página oficial do processo no PNCP.
                </span>
                <a
                  className="opp-doc-btn"
                  href={effectiveBid.pncpGovUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir no PNCP <ExternalLink size={15} />
                </a>
              </div>
            )}
          </section>

          {/* 3. Itens e Benefícios ME/EPP */}
          <section className="opp-section-card">
            <header className="opp-section-header">
              <div className="opp-section-title-group">
                <span className="opp-section-icon">
                  <ListChecks size={20} />
                </span>
                <div>
                  <h2>Itens da licitação</h2>
                  <p>
                    Quantidades, valores de referência e benefícios para ME/EPP
                  </p>
                </div>
              </div>
              {!loadingDetails && totalItems > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {mpeBenefitCount > 0 && (
                    <span className="opp-count-pill is-benefit">
                      <ShieldCheck size={14} />
                      {mpeBenefitCount} com benefício ME/EPP
                    </span>
                  )}
                  <span className="opp-count-pill">
                    {totalItems} {totalItems === 1 ? "item" : "itens"}
                  </span>
                </div>
              )}
            </header>

            {loadingDetails ? (
              <div className="opp-loading-inline">
                <RefreshCw size={18} />
                <span>Carregando relação de itens do edital…</span>
              </div>
            ) : items.length > 0 ? (
              <>
                <div className="opp-items-table-wrap">
                  <table className="opp-items-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Descrição e participação</th>
                        <th className="is-right">Qtd.</th>
                        <th className="is-right">Unitário est.</th>
                        <th className="is-right">Total est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map((item) => {
                        const benefitLower = (
                          item.benefitName ?? ""
                        ).toLowerCase();
                        const isMpeExclusive =
                          benefitLower.includes("exclusiv") ||
                          benefitLower.includes("me/epp") ||
                          benefitLower.includes("cota") ||
                          benefitLower.includes("microempresa");

                        return (
                          <tr key={item.number}>
                            <td>
                              <span className="opp-item-num">
                                {String(item.number).padStart(2, "0")}
                              </span>
                            </td>
                            <td>
                              <div className="opp-item-desc">
                                <p>{formatCleanTitle(item.description)}</p>
                                <div className="opp-item-tags">
                                  {item.kind && (
                                    <span className="opp-item-tag">
                                      {item.kind}
                                    </span>
                                  )}
                                  {item.benefitName &&
                                    !benefitLower.includes("não se aplica") && (
                                      <span
                                        className={`opp-item-tag ${isMpeExclusive ? "is-mpe" : ""}`}
                                      >
                                        {isMpeExclusive && (
                                          <ShieldCheck size={12} />
                                        )}
                                        {item.benefitName}
                                      </span>
                                    )}
                                  {item.judgmentCriteria && (
                                    <span className="opp-item-tag">
                                      {item.judgmentCriteria}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="is-right opp-item-qty">
                              {item.quantity !== null
                                ? `${item.quantity.toLocaleString("pt-BR")}${item.unit ? ` ${item.unit}` : ""}`
                                : "—"}
                            </td>
                            <td className="is-right opp-item-price">
                              {item.confidentialBudget
                                ? "Sigiloso"
                                : item.unitValue && item.unitValue > 0
                                  ? formatCurrencyBr(item.unitValue)
                                  : "—"}
                            </td>
                            <td className="is-right opp-item-price">
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

                {items.length > 10 && (
                  <button
                    type="button"
                    className="opp-items-more-btn"
                    onClick={() => setShowAllItems((prev) => !prev)}
                  >
                    {showAllItems
                      ? "Mostrar menos itens"
                      : `Mostrar todos os ${items.length} itens carregados`}
                  </button>
                )}
              </>
            ) : (
              <div className="opp-section-empty">
                <span>
                  Os itens desta contratação estão detalhados diretamente no
                  Edital / Termo de Referência anexo acima.
                </span>
              </div>
            )}
          </section>
        </div>

        {/* Coluna Direita (Sticky): Onde Participar + CNAE + Cronograma */}
        <aside className="opp-detail-aside">
          {/* Card Principal: Portal de Participação / Disputa */}
          <section className="opp-portal-card">
            <div className="opp-portal-top">
              <span className="opp-portal-eyebrow">
                Onde participar e competir
              </span>
            </div>

            <h2>
              {effectiveBid.portalUrl
                ? "Portal eletrônico de disputa"
                : "Participação conforme Edital"}
            </h2>

            <div
              className={`opp-platform-badge-box ${effectiveBid.portalUrl ? "" : "is-neutral"}`}
            >
              <span className="opp-platform-icon">
                {effectiveBid.portalUrl ? (
                  <Gavel size={20} />
                ) : (
                  <FileText size={20} />
                )}
              </span>
              <div className="opp-platform-info">
                <small>
                  {effectiveBid.portalUrl
                    ? "Plataforma de envio de propostas e lances"
                    : "Canal de envio de propostas"}
                </small>
                <strong>
                  {effectiveBid.portalName ??
                    "Consulte o endereço no Edital oficial"}
                </strong>
              </div>
            </div>

            <p className="opp-portal-desc">
              {effectiveBid.portalUrlIsDirect
                ? "O PNCP é o mural oficial do Governo, mas o cadastro de propostas e a disputa de lances acontecem diretamente na plataforma eletrônica abaixo."
                : effectiveBid.portalUrl
                  ? "O envio de propostas e os lances ocorrem nesta plataforma eletrônica. Ao abrir o portal, utilize os dados abaixo para localizar rapidamente o certame:"
                  : "Este processo não informou link externo de sala eletrônica no PNCP (comum em credenciamentos, pré-qualificações ou portais próprios descritos no PDF). Abra o Edital oficial para ver onde protocolar sua proposta."}
            </p>

            {effectiveBid.portalUrl && !effectiveBid.portalUrlIsDirect && (
              <div className="opp-portal-lookup">
                <span className="opp-portal-lookup-title">
                  Dados para busca rápida no portal
                </span>
                <div className="opp-portal-lookup-row">
                  <span>Nº da compra:</span>
                  <strong>{effectiveBid.purchaseNumber}</strong>
                </div>
                <div className="opp-portal-lookup-row">
                  <span>CNPJ do órgão:</span>
                  <strong>{formatCnpj(effectiveBid.agencyCnpj)}</strong>
                </div>
                {effectiveBid.uasgCode && (
                  <div className="opp-portal-lookup-row">
                    <span>Código UASG:</span>
                    <strong>{effectiveBid.uasgCode}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="opp-portal-actions">
              {effectiveBid.portalUrl ? (
                <a
                  className="opp-cta-primary"
                  href={effectiveBid.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {effectiveBid.portalUrlIsDirect
                    ? `Participar no ${shortPortalLabel ?? "Portal de Disputa"}`
                    : `Acessar ${shortPortalLabel ?? "Plataforma de Disputa"}`}
                  <ExternalLink size={17} />
                </a>
              ) : primaryEditalDoc ? (
                <a
                  className="opp-cta-primary"
                  href={primaryEditalDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Baixar Edital Oficial <Download size={17} />
                </a>
              ) : null}

              <a
                className={
                  effectiveBid.portalUrl || primaryEditalDoc
                    ? "opp-cta-secondary"
                    : "opp-cta-primary"
                }
                href={effectiveBid.pncpGovUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver publicação oficial no PNCP (Gov.br){" "}
                <ExternalLink size={16} />
              </a>

              {effectiveBid.electronicProcessUrl &&
                effectiveBid.electronicProcessUrl !== effectiveBid.portalUrl &&
                effectiveBid.electronicProcessUrl !==
                  effectiveBid.pncpGovUrl && (
                  <a
                    className="opp-cta-secondary"
                    href={effectiveBid.electronicProcessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir processo eletrônico <ExternalLink size={16} />
                  </a>
                )}
            </div>
          </section>

          {/* Card Lateral: Compatibilidade CNAE */}
          <section className="opp-side-card">
            <h3>Compatibilidade com sua empresa</h3>

            <div className="opp-cnae-summary">
              <div
                className={`opp-cnae-score ${effectiveBid.match.isMatch ? "is-match" : ""}`}
              >
                <b>
                  {effectiveBid.match.isMatch
                    ? `${effectiveBid.match.score}%`
                    : "—"}
                </b>
                <small>{effectiveBid.match.isMatch ? "Aderente" : "Perfil"}</small>
              </div>
              <div>
                <strong>
                  {effectiveBid.match.isMatch
                    ? "Compatível com seu perfil"
                    : "Aderência por palavras-chave"}
                </strong>
                <span>
                  {effectiveBid.match.matchedCnae ??
                    (mainCnae
                      ? `${mainCnae.codigo} — ${mainCnae.descricao}`
                      : "CNAE ainda não configurado")}
                </span>
              </div>
            </div>

            {effectiveBid.match.matchedKeywords.length > 0 ? (
              <div className="opp-cnae-keywords">
                {effectiveBid.match.matchedKeywords.map((kw) => (
                  <span key={kw}>{kw}</span>
                ))}
              </div>
            ) : (
              <p className="opp-cnae-text">
                {mainCnae
                  ? "Você pode participar normalmente caso atenda às exigências de habilitação do Edital, ou adicionar palavras-chave ao seu radar."
                  : "Cadastre seu CNAE ou palavras-chave para destacar automaticamente os editais do seu ramo."}
              </p>
            )}

            <button
              type="button"
              className="opp-link-inline"
              onClick={onNavigateProfile}
            >
              Ajustar CNAE e palavras-chave <ArrowRight size={15} />
            </button>
          </section>

          {/* Card Lateral: Cronograma */}
          <section className="opp-side-card">
            <h3>Cronograma oficial</h3>

            <div className="opp-timeline-list">
              <div className="opp-timeline-step is-done">
                <i className="opp-timeline-dot" aria-hidden="true" />
                <div className="opp-timeline-info">
                  <strong>Publicação no PNCP</strong>
                  <span>{formatDateBr(effectiveBid.publishedAt)}</span>
                </div>
              </div>

              <div
                className={`opp-timeline-step ${effectiveBid.openingAt ? "is-done" : ""}`}
              >
                <i className="opp-timeline-dot" aria-hidden="true" />
                <div className="opp-timeline-info">
                  <strong>Abertura para propostas</strong>
                  <span>{formatDateBr(effectiveBid.openingAt)}</span>
                </div>
              </div>

              <div
                className={`opp-timeline-step ${effectiveBid.isOpen ? "is-current" : "is-done"}`}
              >
                <i className="opp-timeline-dot" aria-hidden="true" />
                <div className="opp-timeline-info">
                  <strong>Encerramento de propostas</strong>
                  <span>{formatDateBr(effectiveBid.closingAt)}</span>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Documents() {
  const { profile } = useUserProfile();
  const b = profile?.business;

  const docs = [
    {
      title: "Cartão CNPJ",
      url: b?.url_cartao_cnpj,
      description: "Comprovante de inscrição e de situação cadastral",
    },
    {
      title: "Contrato Social / Certificado MEI",
      url: b?.url_contrato_social,
      description: "Ato constitutivo enviado no credenciamento",
    },
    {
      title: "Comprovante de Endereço",
      url: b?.url_comprovante_endereco,
      description: "Comprovante da sede da empresa",
    },
    {
      title: "Documento do Sócio / Responsável",
      url: b?.url_comprovante_socio,
      description: "Identificação oficial do representante legal",
    },
  ];

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="CADASTRO E CONFORMIDADE"
        title="Documentos da empresa"
        description="Consulte os documentos enviados no cadastro da sua empresa."
      />
      <section className="document-overview">
        <CheckCircle2 />
        <div>
          <small>SITUAÇÃO DOCUMENTAL</small>
          <h2>Documentação cadastrada</h2>
          <p>
            Seus 4 documentos obrigatórios estão vinculados ao CNPJ{" "}
            {b?.cnpj ? formatCnpj(b.cnpj) : "da empresa"}.
          </p>
        </div>
        <span>
          100%
          <i>
            <em style={{ width: "100%" }} />
          </i>
        </span>
      </section>
      <section className="document-list dashboard-card">
        <CardHeader
          title="Arquivos enviados no cadastro"
          subtitle="Acesso protegido (somente sua empresa e a administração podem visualizar)"
        />
        {docs.map((doc) => (
          <article key={doc.title}>
            <span className="doc-icon">
              <FileText />
            </span>
            <div>
              <b>{doc.title}</b>
              <small>{doc.description}</small>
            </div>
            <em className="approved">Vinculado</em>
            <button
              type="button"
              disabled={!doc.url}
              onClick={() => {
                if (doc.url) {
                  openDocumentInNewTab(doc.url, doc.title);
                }
              }}
            >
              Visualizar arquivo
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function getCompanyInitials(name?: string, fallback = "ME"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CompanyProfile({
  companyCnaes,
  customCnaeText,
  extraKeywords,
  onSavePreferences,
}: {
  companyCnaes: CompanyCnae[];
  customCnaeText: string;
  extraKeywords: string[];
  onSavePreferences: (patch: {
    customCnaeText?: string;
    extraKeywords?: string[];
  }) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copiedCnpj, setCopiedCnpj] = useState(false);
  const { profile } = useUserProfile();

  const cnpj = profile?.business?.cnpj || profile?.cnpj || "";
  const nomeEmpresa = profile?.business?.nome_empresa || "Minha Empresa";
  const email = profile?.email || "";
  const porte = profile?.business?.porte_empresa || "ME";
  const responsavel = profile?.name || "Responsável Legal";
  const municipioNome = profile?.business?.municipio
    ? `${profile.business.municipio.nome} — ${profile.business.municipio.uf}`
    : "Ceará — CE";

  const [cnaeInput, setCnaeInput] = useState(customCnaeText);

  useEffect(() => {
    setCnaeInput(customCnaeText);
  }, [customCnaeText]);

  const handleCopyCnpj = async () => {
    if (!cnpj) return;
    try {
      await navigator.clipboard.writeText(cnpj.replace(/\D/g, ""));
      setCopiedCnpj(true);
      setTimeout(() => setCopiedCnpj(false), 2000);
      toast.success("CNPJ copiado com sucesso!");
    } catch {
      // ignore
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSavePreferences({
      customCnaeText: cnaeInput.trim(),
      extraKeywords,
    });
    setSaved(true);
    toast.success("Perfil e preferências salvos!", {
      description: "O Radar de Licitações agora utilizará estas informações para ranquear oportunidades.",
    });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="dashboard-page profile-page">
      <PageHeading
        eyebrow={`PERFIL DA EMPRESA • ${porte}`}
        title="Perfil Empresarial & CNAEs"
        description="Gerencie os ramos de atuação econômica e termos de busca que orientam os alertas e a inteligência do Radar de Licitações."
        action={
          <button className="ds-button primary" onClick={() => handleSave()}>
            {saved ? <Check size={16} /> : <Sparkles size={16} />}
            {saved ? "Alterações salvas!" : "Salvar preferências"}
          </button>
        }
      />

      {/* Hero Banner Executivo da Empresa */}
      <section className="profile-hero-banner">
        <div className="profile-hero-main">
          <div className="profile-hero-avatar">
            {getCompanyInitials(nomeEmpresa, "ME")}
          </div>
          <div className="profile-hero-details">
            <div className="profile-hero-title-row">
              <h2>{nomeEmpresa}</h2>
              <span className="profile-badge-porte">{porte}</span>
              <span className="profile-status-pill is-active">
                <CheckCircle2 size={13} />
                <span>Situação Ativa • Receita Federal</span>
              </span>
            </div>
            <div className="profile-hero-meta-row">
              {cnpj && (
                <div className="profile-cnpj-chip">
                  <span className="profile-cnpj-label">CNPJ:</span>
                  <code>{formatCnpj(cnpj)}</code>
                  <button
                    type="button"
                    onClick={handleCopyCnpj}
                    title="Copiar CNPJ"
                    aria-label="Copiar CNPJ"
                    className="profile-copy-btn"
                  >
                    {copiedCnpj ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              )}
              <span className="profile-meta-item">
                <MapPin size={14} />
                <span>{municipioNome}</span>
              </span>
              <span className="profile-meta-item">
                <ShieldCheck size={14} />
                <span>Habilitada para Compras Públicas</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stack de Seções Modernas */}
      <div className="profile-sections-stack">
        {/* Card 1: Atividades Econômicas & CNAEs */}
        <section className="profile-card">
          <div className="profile-card__header">
            <div>
              <div className="profile-card__title-row">
                <Building2 size={20} className="profile-card-icon" />
                <h2>Atividades Econômicas & CNAEs</h2>
              </div>
              <p>O Radar de Licitações cruza estes códigos com o objeto dos editais para priorizar licitações com alta aderência.</p>
            </div>
            <span className="profile-card-count-badge">
              {companyCnaes.length} {companyCnaes.length === 1 ? "CNAE registrado" : "CNAEs registrados"}
            </span>
          </div>

          <div className="profile-card-body">
            {/* CNAE Principal */}
            <div className="profile-cnae-section">
              <span className="profile-field-label">CNAE Principal (Atividade Primária)</span>
              {companyCnaes[0] ? (
                <div className="profile-cnae-main-card">
                  <div className="profile-cnae-main-header">
                    <span className="profile-cnae-badge is-primary">Principal</span>
                    <code className="profile-cnae-code">{companyCnaes[0].codigo}</code>
                    <span className="profile-cnae-match-pill">Prioridade Máxima no Radar</span>
                  </div>
                  <h3 className="profile-cnae-main-desc">{companyCnaes[0].descricao}</h3>
                </div>
              ) : (
                <div className="profile-cnae-empty">
                  <Building2 size={24} />
                  <div>
                    <strong>Nenhum CNAE principal importado automaticamente</strong>
                    <p>Você pode indicar abaixo seu ramo ou atividade complementar.</p>
                  </div>
                </div>
              )}
            </div>

            {/* CNAEs Secundários */}
            {companyCnaes.length > 1 && (
              <div className="profile-cnae-section">
                <div className="profile-field-header">
                  <span className="profile-field-label">
                    CNAEs Secundários ({companyCnaes.length - 1} atividades)
                  </span>
                  <small className="profile-field-hint">Também pontuam na aderência dos editais</small>
                </div>
                <div className="profile-cnaes-grid">
                  {companyCnaes.slice(1).map((c) => (
                    <div key={`${c.codigo}-${c.descricao}`} className="profile-cnae-subcard">
                      <div className="profile-cnae-subcard-top">
                        <code className="profile-cnae-subcode">{c.codigo}</code>
                        <span className="profile-cnae-subtag">Secundário</span>
                      </div>
                      <p className="profile-cnae-subdesc">{c.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ramo complementar */}
            <div className="profile-cnae-section">
              <label className="profile-field-label" htmlFor="profile-cnae-complementar">
                Atividade ou Ramo Complementar (Opcional)
              </label>
              <p className="profile-field-desc">
                Caso sua empresa atue em atividades complementares ou deseje ampliar as buscas do Radar.
              </p>
              <input
                id="profile-cnae-complementar"
                className="profile-modern-input"
                value={cnaeInput}
                onChange={(e) => setCnaeInput(e.target.value)}
                placeholder="Ex: 4711-3/02 - Comércio varejista ou prestação de serviços"
              />
            </div>
          </div>
        </section>
        {/* Card 2: Dados Cadastrais Oficiais */}
        <section className="profile-card">
          <div className="profile-card__header">
            <div>
              <div className="profile-card__title-row">
                <FileText size={20} className="profile-card-icon" />
                <h2>Dados Cadastrais da Empresa</h2>
              </div>
              <p>Informações de registro oficial para emissão de certidões e habilitação nas disputas.</p>
            </div>
          </div>

          <div className="profile-card-body">
            <div className="profile-cadastral-grid">
              <div className="profile-cadastral-item">
                <span className="profile-cadastral-label">Razão Social</span>
                <strong className="profile-cadastral-value">{nomeEmpresa}</strong>
              </div>
              <div className="profile-cadastral-item">
                <span className="profile-cadastral-label">CNPJ</span>
                <strong className="profile-cadastral-value">{cnpj ? formatCnpj(cnpj) : "Não informado"}</strong>
              </div>
              <div className="profile-cadastral-item">
                <span className="profile-cadastral-label">Porte Empresarial</span>
                <strong className="profile-cadastral-value">{porte === "ME" ? "Microempresa (ME)" : porte === "EPP" ? "Empresa de Pequeno Porte (EPP)" : porte}</strong>
              </div>
              <div className="profile-cadastral-item">
                <span className="profile-cadastral-label">Responsável Legal</span>
                <strong className="profile-cadastral-value">{responsavel}</strong>
              </div>
              <div className="profile-cadastral-item">
                <span className="profile-cadastral-label">E-mail Cadastrado</span>
                <strong className="profile-cadastral-value">{email || "Não informado"}</strong>
              </div>
              <div className="profile-cadastral-item">
                <span className="profile-cadastral-label">Município da Sede</span>
                <strong className="profile-cadastral-value">{municipioNome}</strong>
              </div>
            </div>
          </div>

          <div className="profile-card-footer">
            <button
              type="button"
              className="ds-button primary"
              onClick={() => handleSave()}
            >
              {saved ? <Check size={16} /> : null}
              {saved ? "Alterações salvas!" : "Salvar alterações"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="dashboard-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  trend?: string;
  tone?: string;
}) {
  return (
    <article className={`metric-card ${tone ?? ""}`}>
      <div className="metric-top">
        <span>{icon}</span>
        <small>{label}</small>
      </div>
      <div className="metric-value-row">
        <b>{value}</b>
        {trend && <em>{trend}</em>}
      </div>
      {detail && <p>{detail}</p>}
    </article>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export { PageHeading, Metric, CardHeader };
