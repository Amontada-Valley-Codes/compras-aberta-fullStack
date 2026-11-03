"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Gavel,
  Globe,
  Heart,
  LayoutDashboard,
  ListChecks,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { OpportunityDonut, SpendingAreaChart } from "./DashboardCharts";
import {
  evaluateBidMatch,
  type EnrichedMeBid,
  type MeBidDetailResponse,
  type MeBidDocument,
  type MeBidItem,
  type MePncpBid,
} from "./me/cnae-match";
import { parsePncpControlNumber } from "./me/pncp-mapper";
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

function getFavoritesKey(cnpj?: string | null) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return `compras-abertas:me-favs:${clean || "default"}`;
}

export function MeDashboard({
  initialOpportunityId,
}: {
  initialOpportunityId?: string;
}) {
  const { profile, preferences, savePreferences } = useUserProfile();
  const [rawBids, setRawBids] = useState<MePncpBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(true);
  const [bidsError, setBidsError] = useState<string | null>(null);

  const [active, setActive] = useState(
    initialOpportunityId ? "opportunities" : "overview",
  );
  const [selectedBidId, setSelectedBidId] = useState<string | null>(
    initialOpportunityId ?? null,
  );
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  const cnpj = profile?.business?.cnpj ?? profile?.cnpj ?? null;

  // Carrega favoritos salvos no navegador da empresa
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(getFavoritesKey(cnpj));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed));
          return;
        }
      }
      setFavorites(new Set());
    } catch {
      setFavorites(new Set());
    }
  }, [cnpj]);

  const updateFavorites = (next: Set<string>) => {
    setFavorites(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          getFavoritesKey(cnpj),
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // ignora erro de escrita
      }
    }
  };

  const fetchPncpBids = async () => {
    setLoadingBids(true);
    setBidsError(null);
    try {
      const res = await fetch("/api/me/licitacoes");
      if (!res.ok) throw new Error("Falha ao consultar o PNCP");
      const data = (await res.json()) as {
        bids: MePncpBid[];
      };
      setRawBids(data.bids ?? []);
    } catch {
      setBidsError(
        "Não foi possível carregar as licitações do PNCP neste momento. Tente atualizar em instantes.",
      );
    } finally {
      setLoadingBids(false);
    }
  };

  useEffect(() => {
    void fetchPncpBids();
  }, []);

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

  // Cruza cada licitação do PNCP com o CNAE e palavras-chave da empresa
  const enrichedBids: EnrichedMeBid[] = useMemo(() => {
    const companyCity = profile?.business?.municipio?.nome ?? null;
    const companyIbge =
      profile?.business?.municipio?.codigoIbge ?? profile?.municipioIbge ?? null;

    return rawBids.map((bid) => ({
      ...bid,
      match: evaluateBidMatch(bid, {
        cnaes: companyCnaes,
        customCnaeText: preferences.customCnaeText,
        extraKeywords: preferences.extraKeywords,
        companyCity,
        companyIbge,
      }),
    }));
  }, [rawBids, companyCnaes, preferences, profile]);

  const openBids = useMemo(
    () => enrichedBids.filter((b) => b.isOpen),
    [enrichedBids],
  );
  const matchedOpenBids = useMemo(
    () => openBids.filter((b) => b.match.isMatch),
    [openBids],
  );

  const selectedBid = useMemo(
    () => enrichedBids.find((b) => b.id === selectedBidId) ?? null,
    [enrichedBids, selectedBidId],
  );

  // Caso o usuário abra link direto (/me?oportunidade=...) de edital fora da página inicial, busca direto no PNCP
  useEffect(() => {
    if (!selectedBidId || loadingBids) return;
    if (rawBids.some((b) => b.id === selectedBidId)) return;

    const parsed = parsePncpControlNumber(selectedBidId);
    if (!parsed) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/me/licitacoes/${parsed.cnpj}/${parsed.ano}/${parsed.sequencial}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as MeBidDetailResponse;
        if (!cancelled && data.bid) {
          setRawBids((prev) =>
            prev.some((item) => item.id === data.bid!.id)
              ? prev
              : [data.bid!, ...prev],
          );
        }
      } catch {
        // mantém fallback padrão
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedBidId, loadingBids, rawBids]);

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
        id: "alerts",
        label: "Alertas",
        icon: <Bell size={19} />,
        badge:
          matchedOpenBids.length > 0
            ? String(matchedOpenBids.length)
            : undefined,
      },
      {
        id: "favorites",
        label: "Favoritos",
        icon: <Bookmark size={19} />,
        badge: favorites.size > 0 ? String(favorites.size) : undefined,
      },
      { id: "documents", label: "Documentos", icon: <FileText size={19} /> },
      {
        id: "profile",
        label: "Perfil e CNAE",
        icon: <Building2 size={19} />,
      },
    ],
    [openBids.length, matchedOpenBids.length, favorites.size],
  );

  const navigate = (id: string) => {
    setActive(id);
    setSelectedBidId(null);
  };

  const openBidDetail = (bid: EnrichedMeBid) => {
    setSelectedBidId(bid.id);
    setActive("opportunities");
  };

  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateFavorites(next);
  };

  return (
    <AppShell role="me" active={active} onNavigate={navigate} items={navItems}>
      {active === "overview" && (
        <MeOverview
          openBids={openBids}
          matchedOpenBids={matchedOpenBids}
          loading={loadingBids}
          error={bidsError}
          onNavigate={navigate}
          onOpenBid={openBidDetail}
        />
      )}
      {active === "opportunities" && (
        <Opportunities
          bids={enrichedBids}
          loading={loadingBids}
          error={bidsError}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          selected={selectedBid}
          onSelect={(bid) => setSelectedBidId(bid ? bid.id : null)}
          companyCnaes={companyCnaes}
          onNavigateProfile={() => navigate("profile")}
        />
      )}
      {active === "favorites" && (
        <Opportunities
          bids={enrichedBids}
          loading={loadingBids}
          error={bidsError}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          selected={selectedBid}
          onSelect={(bid) => setSelectedBidId(bid ? bid.id : null)}
          companyCnaes={companyCnaes}
          onNavigateProfile={() => navigate("profile")}
          favoritesOnly
        />
      )}
      {active === "alerts" && (
        <Alerts
          openBids={openBids}
          matchedOpenBids={matchedOpenBids}
          loading={loadingBids}
          companyCnaes={companyCnaes}
          customCnaeText={preferences.customCnaeText}
          extraKeywords={preferences.extraKeywords}
          onSavePreferences={savePreferences}
          onOpenBid={openBidDetail}
          onNavigate={navigate}
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
    </AppShell>
  );
}

function MeOverview({
  openBids,
  matchedOpenBids,
  loading,
  error,
  onNavigate,
  onOpenBid,
}: {
  openBids: EnrichedMeBid[];
  matchedOpenBids: EnrichedMeBid[];
  loading: boolean;
  error: string | null;
  onNavigate: (id: string) => void;
  onOpenBid: (bid: EnrichedMeBid) => void;
}) {
  const { profile } = useUserProfile();

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
        eyebrow={`PAINEL DA MICROEMPRESA • ${porte}`}
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
          label="Dão Match com seu CNAE"
          value={loading ? "…" : String(matchedOpenBids.length)}
          trend={
            openBids.length > 0
              ? `${Math.round((matchedOpenBids.length / openBids.length) * 100)}% das abertas`
              : undefined
          }
        />
        <Metric
          icon={<Gavel />}
          label="Licitações no PNCP (CE)"
          value={loading ? "…" : String(openBids.length)}
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
            subtitle="Valores estimados reais publicados no PNCP (Total x Compatível com seu CNAE)"
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
              ? "Licitações que deram Match com seu CNAE"
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
                  onClick={() => onOpenBid(item)}
                >
                  <div className="match-spotlight-top">
                    <div className="match-spotlight-badges">
                      <span
                        className={`match-pill ${item.match.isMatch ? "is-match" : ""}`}
                      >
                        <Sparkles size={13} />
                        {item.match.isMatch
                          ? `${item.match.score}% compatível`
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
            action={
              <button onClick={() => onNavigate("opportunities")}>
                Filtrar por cidade
              </button>
            }
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
            title="Alertas de licitações e prazos"
            action={
              <button onClick={() => onNavigate("alerts")}>
                Abrir central de alertas
              </button>
            }
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
                    <b>Match CNAE ({bid.match.score}% compatível)</b>
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
                      Ajuste palavras-chave na aba Alertas para ampliar o monitoramento.
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

function Opportunities({
  bids,
  loading,
  error,
  favorites,
  onToggleFavorite,
  selected,
  onSelect,
  companyCnaes,
  onNavigateProfile,
  favoritesOnly = false,
}: {
  bids: EnrichedMeBid[];
  loading: boolean;
  error: string | null;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  selected: EnrichedMeBid | null;
  onSelect: (bid: EnrichedMeBid | null) => void;
  companyCnaes: CompanyCnae[];
  onNavigateProfile: () => void;
  favoritesOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "expired" | "all">(
    "open",
  );
  const [onlyCnaeMatch, setOnlyCnaeMatch] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [sortBy, setSortBy] = useState<"match" | "deadline" | "value">("match");

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bids) {
      if (b.city) set.add(b.city);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((city) => ({ value: city, label: city }));
  }, [bids]);

  const modalityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bids) {
      if (b.modality) set.add(b.modality);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((mod) => ({ value: mod, label: mod }));
  }, [bids]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = bids.filter((item) => {
      if (favoritesOnly && !favorites.has(item.id)) return false;
      if (statusFilter === "open" && !item.isOpen) return false;
      if (statusFilter === "expired" && item.isOpen) return false;
      if (onlyCnaeMatch && !item.match.isMatch) return false;
      if (cityFilter && item.city !== cityFilter) return false;
      if (modalityFilter && item.modality !== modalityFilter) return false;
      if (q) {
        const hay =
          `${item.object} ${item.purchaseNumber} ${item.process ?? ""} ${item.agencyName} ${item.city} ${item.modality}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "value") {
        return (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0);
      }
      if (sortBy === "deadline") {
        return (a.closingAt ?? "9999").localeCompare(b.closingAt ?? "9999");
      }
      // match
      if (a.match.isMatch !== b.match.isMatch) {
        return a.match.isMatch ? -1 : 1;
      }
      return b.match.score - a.match.score;
    });
  }, [
    bids,
    favoritesOnly,
    favorites,
    statusFilter,
    onlyCnaeMatch,
    cityFilter,
    modalityFilter,
    query,
    sortBy,
  ]);

  if (selected) {
    return (
      <OpportunityDetail
        bid={selected}
        isFavorite={favorites.has(selected.id)}
        companyCnaes={companyCnaes}
        onBack={() => onSelect(null)}
        onToggleFavorite={() => onToggleFavorite(selected.id)}
        onNavigateProfile={onNavigateProfile}
      />
    );
  }

  const openCount = bids.filter((b) => b.isOpen).length;
  const expiredCount = bids.length - openCount;
  const hasActiveFilters = Boolean(
    query.trim() || cityFilter || modalityFilter || onlyCnaeMatch,
  );

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="PORTAL NACIONAL DE CONTRATAÇÕES PÚBLICAS (PNCP)"
        title={
          favoritesOnly
            ? "Licitações salvas nos favoritos"
            : "Licitações no PNCP"
        }
        description={
          favoritesOnly
            ? "Acompanhe os editais que você salvou para analisar ou disputar."
            : "Consulte editais abertos e vencidos diretamente do PNCP, filtre pelo Match com o CNAE da sua empresa e acesse o portal de disputa."
        }
      />

      <section className="dashboard-card opp-toolbar">
        <div className="opp-toolbar-top">
          <div
            className="opp-status-tabs"
            role="tablist"
            aria-label="Filtrar por situação da licitação"
          >
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "open"}
              className={`opp-status-tab ${statusFilter === "open" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("open")}
            >
              Abertas <span>{openCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "expired"}
              className={`opp-status-tab ${statusFilter === "expired" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("expired")}
            >
              Encerradas <span>{expiredCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === "all"}
              className={`opp-status-tab ${statusFilter === "all" ? "is-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Todas <span>{bids.length}</span>
            </button>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={onlyCnaeMatch}
            className={`opp-match-switch ${onlyCnaeMatch ? "is-active" : ""}`}
            onClick={() => setOnlyCnaeMatch((prev) => !prev)}
          >
            <Sparkles size={15} />
            <span>Compatíveis com meu CNAE</span>
            <i aria-hidden="true" />
          </button>
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
            ]}
            onValueChange={(val) =>
              setSortBy((val as "match" | "deadline" | "value") || "match")
            }
          />
        </div>
      </section>

      <div className="opp-results-meta">
        <p>
          <b>{filteredList.length}</b>{" "}
          {filteredList.length === 1
            ? "licitação encontrada"
            : "licitações encontradas"}
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

      {error && (
        <section className="dashboard-card empty-state">
          <AlertTriangle />
          <h2>Erro ao consultar o PNCP</h2>
          <p>{error}</p>
        </section>
      )}

      {loading ? (
        <section className="dashboard-card empty-state">
          <RefreshCw />
          <h2>Carregando licitações do PNCP…</h2>
          <p>Buscando editais abertos e encerrados publicados no Ceará.</p>
        </section>
      ) : (
        <section className="opportunity-results">
          {filteredList.map((item) => {
            const { title: headline } = extractBidTitleAndSummary(item.object);
            const deadline = formatDeadlineBadge(item);
            const hasValue =
              item.estimatedValue !== null &&
              item.estimatedValue !== undefined &&
              !Number.isNaN(item.estimatedValue) &&
              item.estimatedValue > 0;
            const isFav = favorites.has(item.id);

            return (
              <article
                key={item.id}
                className="opp-card"
                onClick={() => onSelect(item)}
              >
                <div className="opp-card-top">
                  <div className="opp-card-badges">
                    {item.match.isMatch && (
                      <span className="match-pill is-match">
                        <Sparkles size={13} />
                        {item.match.score}% compatível
                      </span>
                    )}
                    <span className="modality-pill">{item.modality}</span>
                    <span className={`deadline-pill ${deadline.tone}`}>
                      <CalendarClock size={13} />
                      {deadline.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`opp-fav-btn ${isFav ? "favorited" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(item.id);
                    }}
                    aria-label={
                      isFav
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                    }
                  >
                    <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="opp-card-body">
                  <h2 className="opp-card-title">{headline}</h2>
                  <p className="opp-card-location">
                    <MapPin size={14} />
                    <span>
                      {formatBuyerLocation(item.city, item.uf, item.unitName)}
                    </span>
                  </p>
                </div>

                <footer className="opp-card-footer">
                  <div className="opp-card-meta">
                    <span>
                      <small>Valor estimado</small>
                      <strong className={hasValue ? "" : "is-muted"}>
                        {hasValue
                          ? formatCurrencyBr(item.estimatedValue)
                          : "No edital"}
                      </strong>
                    </span>
                    <span>
                      <small>
                        {item.isOpen ? "Propostas até" : "Encerrou em"}
                      </small>
                      <strong
                        className={
                          item.isOpen &&
                          item.daysLeft !== null &&
                          item.daysLeft <= 3
                            ? "is-urgent"
                            : ""
                        }
                      >
                        {formatDateBr(item.closingAt ?? item.publishedAt, false)}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="opp-card-cta"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                  >
                    Ver licitação <ArrowRight size={15} />
                  </button>
                </footer>
              </article>
            );
          })}
        </section>
      )}

      {!loading && !error && filteredList.length === 0 && (
        <section className="dashboard-card empty-state">
          <Search />
          <h2>Nenhuma licitação encontrada com esses filtros</h2>
          <p>
            Experimente alternar entre Abertas e Vencidas ou desmarcar o filtro
            de Match CNAE.
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
}: {
  bid: EnrichedMeBid;
  isFavorite: boolean;
  companyCnaes: CompanyCnae[];
  onBack: () => void;
  onToggleFavorite: () => void;
  onNavigateProfile: () => void;
}) {
  const [detailData, setDetailData] = useState<MeBidDetailResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [showAllItems, setShowAllItems] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingDetails(true);
    setDetailData(null);
    setShowAllItems(false);

    const cnpjClean = (bid.agencyCnpj ?? "").replace(/\D/g, "");
    if (cnpjClean.length !== 14 || !bid.year || !bid.sequential) {
      setLoadingDetails(false);
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/me/licitacoes/${cnpjClean}/${bid.year}/${bid.sequential}`,
        );
        if (!res.ok) throw new Error("Erro ao carregar detalhes");
        const json = (await res.json()) as MeBidDetailResponse;
        if (!cancelled) {
          setDetailData(json);
        }
      } catch {
        if (!cancelled) {
          setDetailData(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bid.id, bid.agencyCnpj, bid.year, bid.sequential]);

  const effectiveBid: EnrichedMeBid = useMemo(() => {
    if (!detailData?.bid) return bid;
    return {
      ...bid,
      ...detailData.bid,
      match: bid.match,
    };
  }, [bid, detailData]);

  const documents: MeBidDocument[] = detailData?.documents ?? [];
  const items: MeBidItem[] = detailData?.items ?? [];
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
              {effectiveBid.match.score}% compatível com seu CNAE
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
                <small>{effectiveBid.match.isMatch ? "Match" : "CNAE"}</small>
              </div>
              <div>
                <strong>
                  {effectiveBid.match.isMatch
                    ? "Compatível com seu perfil"
                    : "Sem match direto no CNAE"}
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

function Alerts({
  openBids,
  matchedOpenBids,
  loading,
  companyCnaes,
  customCnaeText,
  extraKeywords,
  onSavePreferences,
  onOpenBid,
  onNavigate,
}: {
  openBids: EnrichedMeBid[];
  matchedOpenBids: EnrichedMeBid[];
  loading: boolean;
  companyCnaes: CompanyCnae[];
  customCnaeText: string;
  extraKeywords: string[];
  onSavePreferences: (patch: {
    customCnaeText?: string;
    extraKeywords?: string[];
  }) => void;
  onOpenBid: (bid: EnrichedMeBid) => void;
  onNavigate: (id: string) => void;
}) {
  const [newKeyword, setNewKeyword] = useState("");

  const addKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeyword.trim();
    if (!clean) return;
    if (!extraKeywords.includes(clean)) {
      onSavePreferences({ extraKeywords: [...extraKeywords, clean] });
    }
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    onSavePreferences({
      extraKeywords: extraKeywords.filter((item) => item !== kw),
    });
  };

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="RADAR INTELIGENTE POR CNAE"
        title="Alertas de novas licitações (Match CNAE)"
        description="Cruzamos automaticamente o CNAE cadastrado da sua empresa com as licitações abertas no PNCP. Clique em qualquer card para ver todos os dados e ir para a disputa."
      />

      <section className="dashboard-grid alert-layout">
        <div className="dashboard-card activity-list large">
          <CardHeader
            title={`Licitações abertas compatíveis com seu CNAE (${matchedOpenBids.length})`}
            subtitle="Ordenadas pela maior aderência ao ramo de atividade da sua empresa"
          />

          {loading ? (
            <p style={{ padding: "1rem 0", opacity: 0.75 }}>
              Analisando editais abertos no PNCP contra o CNAE da sua empresa…
            </p>
          ) : matchedOpenBids.length === 0 ? (
            <div style={{ padding: "1.25rem 0" }}>
              <p style={{ marginBottom: 12 }}>
                Nenhuma das {openBids.length} licitações abertas agora bateu
                diretamente com os termos atuais do seu CNAE.
              </p>
              <button
                type="button"
                className="ds-button secondary"
                onClick={() => onNavigate("opportunities")}
              >
                Ver todas as {openBids.length} licitações abertas no PNCP
              </button>
            </div>
          ) : (
            matchedOpenBids.map((bid) => (
              <span
                key={bid.id}
                onClick={() => onOpenBid(bid)}
                style={{ cursor: "pointer" }}
              >
                <i className="blue">
                  <Sparkles />
                </i>
                <div>
                  <em>
                    MATCH {bid.match.score}% • {bid.modality.toUpperCase()} •{" "}
                    {bid.city}/{bid.uf}
                  </em>
                  <b>{formatCleanTitle(bid.object)}</b>
                  <small>
                    {formatCleanTitle(bid.agencyName)} • Valor estimado:{" "}
                    {formatCurrencyBr(bid.estimatedValue)} • Encerra em:{" "}
                    {formatDateBr(bid.closingAt)}
                  </small>
                  {bid.match.matchedKeywords.length > 0 && (
                    <small style={{ display: "block", marginTop: 4, color: "#16a34a" }}>
                      Termos compatíveis:{" "}
                      {bid.match.matchedKeywords.join(", ")}
                    </small>
                  )}
                </div>
                <button type="button" onClick={() => onOpenBid(bid)}>
                  Ver licitação
                </button>
              </span>
            ))
          )}
        </div>

        <aside className="dashboard-card alert-settings">
          <h2>CNAE monitorado</h2>
          <p>Atividades vinculadas ao seu CNPJ na Receita Federal:</p>

          {companyCnaes.length > 0 ? (
            companyCnaes.map((cnae) => (
              <span key={`${cnae.codigo}-${cnae.descricao}`}>
                <Check />{" "}
                <div>
                  <b>
                    {cnae.isPrincipal ? "Principal: " : "Secundário: "}
                    {cnae.codigo || "CNAE"}
                  </b>
                  <small style={{ display: "block", opacity: 0.85 }}>
                    {cnae.descricao}
                  </small>
                </div>
              </span>
            ))
          ) : (
            <p style={{ fontSize: "var(--text-sm)", opacity: 0.8 }}>
              {customCnaeText
                ? `CNAE complementar: ${customCnaeText}`
                : "Nenhum CNAE automático retornado para o seu CNPJ. Adicione palavras-chave abaixo ou configure na aba Perfil e CNAE."}
            </p>
          )}

          <hr style={{ margin: "16px 0", opacity: 0.2 }} />

          <h2>Palavras-chave extras</h2>
          <p>
            Adicione termos do que você fornece (ex.:{" "}
            <i>merenda, informática, reforma, medicamentos</i>) para ampliar o
            Match:
          </p>

          <form
            onSubmit={addKeyword}
            style={{ display: "flex", gap: 8, marginBottom: 12 }}
          >
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Ex.: material escolar"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
              }}
            />
            <button type="submit" className="ds-button primary">
              Adicionar
            </button>
          </form>

          {extraKeywords.map((kw) => (
            <span
              key={kw}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <Check /> {kw}
              </span>
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: "var(--text-xs)",
                }}
              >
                Remover
              </button>
            </span>
          ))}

          <button
            type="button"
            className="ds-button secondary"
            style={{ marginTop: 12 }}
            onClick={() => onNavigate("profile")}
          >
            Editar CNAE no Perfil
          </button>
        </aside>
      </section>
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
  const { profile } = useUserProfile();

  const cnpj = profile?.business?.cnpj || profile?.cnpj || "";
  const nomeEmpresa = profile?.business?.nome_empresa || "";
  const email = profile?.email || "";
  const porte = profile?.business?.porte_empresa || "ME";
  const responsavel = profile?.name || "";
  const municipioNome = profile?.business?.municipio
    ? `${profile.business.municipio.nome} — ${profile.business.municipio.uf}`
    : "Ceará — CE";

  const [cnaeInput, setCnaeInput] = useState(customCnaeText);
  const [keywordsInput, setKeywordsInput] = useState(extraKeywords.join(", "));

  useEffect(() => {
    setCnaeInput(customCnaeText);
  }, [customCnaeText]);

  useEffect(() => {
    setKeywordsInput(extraKeywords.join(", "));
  }, [extraKeywords]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedKeywords = keywordsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSavePreferences({
      customCnaeText: cnaeInput.trim(),
      extraKeywords: parsedKeywords,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow={`DADOS DA MICROEMPRESA (${porte})`}
        title="Perfil empresarial e configuração de CNAE"
        description="Seus CNAEs oficiais são puxados automaticamente pelo CNPJ na Receita Federal, e você também pode complementar com atividades ou palavras-chave abaixo."
        action={
          <button className="ds-button primary" onClick={handleSave}>
            {saved ? <Check /> : null}
            {saved ? "Configurações salvas!" : "Salvar configurações de CNAE"}
          </button>
        }
      />
      <form className="profile-grid" onSubmit={handleSave}>
        <section className="dashboard-card">
          <h2>Identificação Cadastral</h2>
          <label>
            CNPJ
            <input
              key={`cnpj-${cnpj}`}
              defaultValue={cnpj ? formatCnpj(cnpj) : ""}
              readOnly
            />
          </label>
          <label>
            Razão social / Nome da empresa
            <input
              key={`nome-${nomeEmpresa}`}
              defaultValue={nomeEmpresa}
              readOnly
            />
          </label>
          <label>
            Porte da empresa
            <input key={`porte-${porte}`} defaultValue={porte} readOnly />
          </label>
          <label>
            Responsável legal
            <input
              key={`resp-${responsavel}`}
              defaultValue={responsavel}
              readOnly
            />
          </label>
          <label>
            E-mail de acesso
            <input key={`email-${email}`} defaultValue={email} readOnly />
          </label>
          <label>
            Município identificado na Receita
            <input
              key={`mun-${municipioNome}`}
              defaultValue={municipioNome}
              readOnly
            />
          </label>
        </section>

        <section className="dashboard-card">
          <h2>CNAE da Empresa e Match de Licitações</h2>
          <label>
            CNAE Principal (puxado automaticamente pelo CNPJ)
            <input
              readOnly
              value={
                companyCnaes[0]
                  ? `${companyCnaes[0].codigo} — ${companyCnaes[0].descricao}`
                  : "Não encontrado automaticamente para este CNPJ"
              }
            />
          </label>

          {companyCnaes.length > 1 && (
            <label>
              CNAEs Secundários ({companyCnaes.length - 1})
              <textarea
                readOnly
                rows={3}
                value={companyCnaes
                  .slice(1)
                  .map((c) => `${c.codigo} — ${c.descricao}`)
                  .join("\n")}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                }}
              />
            </label>
          )}

          <label>
            CNAE ou Ramo de Atuação Complementar (opcional — editável)
            <input
              value={cnaeInput}
              onChange={(e) => setCnaeInput(e.target.value)}
              placeholder="Ex.: 4711-3/02 - Comércio varejista de gêneros alimentícios"
            />
          </label>

          <label>
            Palavras-chave para o Alerta de Match (separadas por vírgula)
            <input
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="Ex.: merenda escolar, cestas básicas, informática, reforma"
            />
          </label>

          <button
            type="submit"
            className="ds-button primary"
            style={{ marginTop: 8 }}
          >
            {saved ? "Configurações salvas!" : "Salvar configurações de CNAE"}
          </button>
        </section>
      </form>
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
