"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Clock3,
  ExternalLink,
  FileText,
  Gavel,
  Heart,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { OpportunityDonut, SpendingAreaChart } from "./DashboardCharts";
import {
  evaluateBidMatch,
  type EnrichedMeBid,
  type MePncpBid,
} from "./me/cnae-match";
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
      {active === "alerts" && (
        <Alerts onNavigate={navigate} onOpenOpportunity={openOpportunity} />
      )}
      {active === "profile" && <CompanyProfile />}
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
  const router = useRouter();

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
            title="Municípios em destaque"
            subtitle="Maior demanda no seu segmento"
            action={<button onClick={() => router.push("/analise")}>Ver análise</button>}
          />
          {[
            ["Amontada", "R$ 684 mil", "12 oportunidades", 92],
            ["Itapipoca", "R$ 512 mil", "8 oportunidades", 74],
            ["Itarema", "R$ 396 mil", "5 oportunidades", 58],
          ].map((city, index) => (
            <div className="ranking-row" key={city[0]}>
              <span>{index + 1}</span>
              <div>
                <b>{city[0]}</b>
                <small>{city[2]}</small>
                <i>
                  <em style={{ width: `${city[3]}%` }} />
                </i>
              </div>
              <strong>{city[1]}</strong>
            </div>
          ))}
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

function OpportunityDetail({
  bid,
  isFavorite,
  companyCnaes,
  onBack,
  onToggleFavorite,
}: {
  bid: EnrichedMeBid;
  isFavorite: boolean;
  companyCnaes: CompanyCnae[];
  onBack: () => void;
  onToggleFavorite: () => void;
}) {
  const mainCnae = companyCnaes[0];

  return (
    <div className="dashboard-page opportunity-detail-page">
      <button className="detail-back" onClick={onBack}>
        <ArrowLeft /> Voltar para lista de licitações
      </button>

      <PageHeading
        eyebrow={`${bid.modality.toUpperCase()} • COMPRA Nº ${bid.purchaseNumber}`}
        title={bid.object}
        description={`${bid.city}/${bid.uf} • ${bid.agencyName} (${bid.unitName})`}
        action={
          <button
            className={`ds-button secondary detail-favorite ${isFavorite ? "is-favorite" : ""}`}
            onClick={onToggleFavorite}
          >
            <Heart fill={isFavorite ? "currentColor" : "none"} />
            {isFavorite ? "Salva nos favoritos" : "Salvar nos favoritos"}
          </button>
        }
      />

      {/* Banner de Compatibilidade CNAE + Status Aberta/Vencida */}
      <section className="detail-summary-banner">
        <div className="detail-match">
          <span>
            <b>{bid.match.isMatch ? `${bid.match.score}%` : "—"}</b>
            <small>{bid.match.isMatch ? "match" : "CNAE"}</small>
          </span>
          <div>
            <small>ANÁLISE DE COMPATIBILIDADE COM SEU CNAE</small>
            <h2>
              {bid.match.isMatch
                ? "Dá Match com o CNAE da sua empresa!"
                : "Fora do CNAE principal identificado"}
            </h2>
            <p>
              {bid.match.isMatch ? (
                <>
                  Compatível com{" "}
                  <b>{bid.match.matchedCnae ?? mainCnae?.descricao}</b>.
                  {bid.match.matchedKeywords.length > 0 &&
                    ` Termos identificados no objeto: ${bid.match.matchedKeywords.join(", ")}.`}
                </>
              ) : mainCnae ? (
                <>
                  Seu CNAE cadastrado ({mainCnae.codigo} — {mainCnae.descricao})
                  não possui termos diretos neste objeto, mas você pode conferir
                  o edital completo.
                </>
              ) : (
                "Configure seu CNAE na aba 'Perfil e CNAE' para calcular a compatibilidade."
              )}
            </p>
          </div>
        </div>
        <div className="detail-deadline">
          <CalendarClock />
          <span>
            <small>
              {bid.isOpen
                ? "PRAZO FINAL PARA PROPOSTAS"
                : "LICITAÇÃO VENCIDA / ENCERRADA"}
            </small>
            <b>{formatDateBr(bid.closingAt)}</b>
            <em>
              {bid.isOpen
                ? bid.daysLeft !== null
                  ? bid.daysLeft <= 0
                    ? "Encerra hoje!"
                    : `${bid.daysLeft} dia(s) restante(s)`
                  : "Recebendo propostas"
                : "Prazo de envio de propostas encerrado"}
            </em>
          </span>
        </div>
      </section>

      <div className="detail-layout">
        <div className="detail-main-column">
          <section className="dashboard-card detail-card">
            <header>
              <span>
                <FileText />
              </span>
              <div>
                <h2>Ficha completa da licitação (PNCP)</h2>
                <p>Controle PNCP: {bid.id}</p>
              </div>
            </header>
            <dl className="detail-data-grid">
              <div>
                <dt>Órgão comprador</dt>
                <dd>{bid.agencyName}</dd>
              </div>
              <div>
                <dt>Unidade compradora</dt>
                <dd>{bid.unitName}</dd>
              </div>
              <div>
                <dt>Município / UF</dt>
                <dd>
                  {bid.city} / {bid.uf}
                </dd>
              </div>
              <div>
                <dt>CNPJ do órgão</dt>
                <dd>{formatCnpj(bid.agencyCnpj)}</dd>
              </div>
              <div>
                <dt>Modalidade</dt>
                <dd>{bid.modality}</dd>
              </div>
              <div>
                <dt>Modo de disputa</dt>
                <dd>{bid.disputeMode || "Conforme edital"}</dd>
              </div>
              <div>
                <dt>Número da compra / Processo</dt>
                <dd>
                  Nº {bid.purchaseNumber}
                  {bid.process ? ` (Processo: ${bid.process})` : ""}
                </dd>
              </div>
              <div>
                <dt>Situação no PNCP</dt>
                <dd>
                  {bid.situation} {bid.srp ? "• Registro de Preços (SRP)" : ""}
                </dd>
              </div>
              <div>
                <dt>Valor total estimado</dt>
                <dd>{formatCurrencyBr(bid.estimatedValue)}</dd>
              </div>
              <div>
                <dt>Valor homologado</dt>
                <dd>
                  {bid.awardedValue !== null
                    ? formatCurrencyBr(bid.awardedValue)
                    : "Ainda não homologado / Não informado"}
                </dd>
              </div>
              <div>
                <dt>Abertura das propostas</dt>
                <dd>{formatDateBr(bid.openingAt)}</dd>
              </div>
              <div>
                <dt>Encerramento das propostas</dt>
                <dd>{formatDateBr(bid.closingAt)}</dd>
              </div>
            </dl>

            <div className="detail-object">
              <small>OBJETO DA CONTRATAÇÃO</small>
              <p>{bid.object}</p>
            </div>

            {bid.complementaryInfo && (
              <div className="detail-object" style={{ marginTop: 14 }}>
                <small>INFORMAÇÕES COMPLEMENTARES / LINKS DO EDITAL</small>
                <p style={{ whiteSpace: "pre-line" }}>{bid.complementaryInfo}</p>
              </div>
            )}

            {bid.legalBasis && (
              <div className="detail-object" style={{ marginTop: 14 }}>
                <small>AMPARO LEGAL</small>
                <p>
                  <b>{bid.legalBasis}</b>
                  {bid.legalBasisDescription
                    ? ` — ${bid.legalBasisDescription}`
                    : ""}
                </p>
              </div>
            )}
          </section>

          {/* Bloco de Ações Oficiais: Ir para Disputa + Ver no Gov.br */}
          <section className="official-process-note">
            <InfoIcon />
            <div>
              <h2>Acesso direto à disputa e ao portal oficial do Governo</h2>
              <p>
                {bid.disputeUrl
                  ? `Esta licitação possui link direto para o sistema de disputa (${bid.systemName ?? "Portal de Compras"}). Você também pode consultar o processo e baixar os anexos oficiais no PNCP (Gov.br).`
                  : "O órgão não preencheu um link externo separado para o sistema de origem; acesse a publicação oficial no PNCP (Gov.br) para verificar o edital e o endereço da plataforma de disputa."}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {bid.disputeUrl && (
                <a
                  className="ds-button primary"
                  href={bid.disputeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ir para o site da disputa <ExternalLink size={16} />
                </a>
              )}
              <a
                className={`ds-button ${bid.disputeUrl ? "secondary" : "primary"}`}
                href={bid.pncpGovUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver licitação no Gov.br (PNCP) <ExternalLink size={16} />
              </a>
            </div>
          </section>
        </div>

        <aside className="detail-sidebar">
          <section className="dashboard-card deadline-card">
            <span className={bid.isOpen ? "status-open" : "status-closed"}>
              <i /> {bid.isOpen ? "LICITAÇÃO ABERTA" : "LICITAÇÃO VENCIDA"}
            </span>
            <h2>Participar / Consultar</h2>
            <p>
              Acesse diretamente a plataforma onde ocorre a sessão pública ou
              veja os arquivos oficiais no portal do Governo Federal.
            </p>
            <div>
              <CalendarDays />
              <span>
                <small>Encerramento de propostas</small>
                <b>{formatDateBr(bid.closingAt)}</b>
              </span>
            </div>
            <div>
              <CircleMoney />
              <span>
                <small>Valor estimado</small>
                <b>{formatCurrencyBr(bid.estimatedValue)}</b>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <small>Município / Órgão</small>
                <b>
                  {bid.city}/{bid.uf}
                </b>
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
              }}
            >
              {bid.disputeUrl ? (
                <a
                  className="ds-button primary"
                  href={bid.disputeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ir para o site da disputa (
                  {bid.systemName ?? "Sistema Origem"}){" "}
                  <ExternalLink size={16} />
                </a>
              ) : (
                <a
                  className="ds-button primary"
                  href={bid.pncpGovUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir plataforma pelo PNCP <ExternalLink size={16} />
                </a>
              )}

              <a
                className="ds-button secondary"
                href={bid.pncpGovUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver licitação no Gov.br (PNCP) <ExternalLink size={16} />
              </a>

              {bid.electronicProcessUrl &&
                bid.electronicProcessUrl !== bid.disputeUrl && (
                  <a
                    className="ds-button secondary"
                    href={bid.electronicProcessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Processo eletrônico <ExternalLink size={16} />
                  </a>
                )}
            </div>
          </section>

          <section className="dashboard-card detail-timeline">
            <h2>Cronograma do edital</h2>
            <span className="active">
              <i />
              <div>
                <b>Publicado no PNCP</b>
                <small>{formatDateBr(bid.publishedAt)}</small>
              </div>
            </span>
            <span className={bid.openingAt ? "active" : ""}>
              <i />
              <div>
                <b>Abertura de propostas</b>
                <small>{formatDateBr(bid.openingAt)}</small>
              </div>
            </span>
            <span className={!bid.isOpen ? "active" : ""}>
              <i />
              <div>
                <b>Encerramento de propostas</b>
                <small>{formatDateBr(bid.closingAt)}</small>
              </div>
            </span>
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
            <p style={{ fontSize: "0.88rem", opacity: 0.8 }}>
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
                  fontSize: "0.8rem",
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

function Alerts({
  onNavigate,
  onOpenOpportunity,
}: {
  onNavigate: (id: string) => void;
  onOpenOpportunity: (item: Opportunity) => void;
}) {
  // Abre a oportunidade citada no alerta (dados de demonstração).
  const openById = (id: string) => {
    const item = opportunities.find((opportunity) => opportunity.id === id);
    if (item) onOpenOpportunity(item);
  };

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="ACOMPANHAMENTO"
        title="Alertas e notificações"
        description="Nada importante passa despercebido: acompanhe prazos, novidades e atualizações cadastrais."
      />
      <section className="dashboard-grid alert-layout">
        <div className="dashboard-card activity-list large">
          <span>
            <i className="gold">
              <Clock3 />
            </i>
            <div>
              <em>NÃO LIDA • PRAZO</em>
              <b>Oportunidade encerra em 3 dias</b>
              <small>
                Aquisição de gêneros para alimentação escolar • Amontada
              </small>
            </div>
            <button onClick={() => openById("OP-2048")}>Ver oportunidade</button>
          </span>
          <span>
            <i className="blue">
              <Sparkles />
            </i>
            <div>
              <em>NÃO LIDA • OPORTUNIDADE</em>
              <b>Novo processo com 91% de compatibilidade</b>
              <small>
                Manutenção de computadores e rede municipal • Itarema
              </small>
            </div>
            <button onClick={() => openById("OP-2071")}>Ver oportunidade</button>
          </span>
          <span>
            <i className="green">
              <FileCheck2 />
            </i>
            <div>
              <em>DOCUMENTO</em>
              <b>Seu cartão CNPJ foi validado</b>
              <small>A equipe concluiu a análise ontem, às 16:40</small>
            </div>
            <button onClick={() => onNavigate("documents")}>Ver documentos</button>
          </span>
        </div>
        <aside className="dashboard-card alert-settings">
          <h2>Preferências</h2>
          <p>Você recebe alertas para:</p>
          {[
            "Alimentos e bebidas",
            "Amontada + 80 km",
            "Oportunidades exclusivas ME",
          ].map((item) => (
            <span key={item}>
              <Check /> {item}
            </span>
          ))}
          <button className="ds-button secondary" onClick={() => onNavigate("profile")}>
            Editar preferências
          </button>
        </aside>
      </section>
    </div>
  );
}

function CompanyProfile() {
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
                  fontFamily: "inherit",
                  fontSize: "0.88rem",
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

function InfoIcon() {
  return <span className="detail-info-icon">i</span>;
}

function CircleMoney() {
  return <span className="detail-money-icon">R$</span>;
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
