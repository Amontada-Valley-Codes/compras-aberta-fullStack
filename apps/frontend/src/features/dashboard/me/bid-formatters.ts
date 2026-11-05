import type { MePncpBid } from "./cnae-match";

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
  "sesc",
  "senai",
  "senac",
  "sebrae",
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
  quimico: "químico",
  quimicos: "químicos",
};

export function restoreWordFormat(
  word: string,
  titleCase = false,
  isFirstWord = false,
): string {
  const match = word.match(
    /^([^a-zA-ZÀ-ÿ0-9]*)([a-zA-ZÀ-ÿ0-9]+(?:\/[a-zA-ZÀ-ÿ0-9]+)?)([^a-zA-ZÀ-ÿ0-9]*)$/,
  );
  if (!match) return word;
  const [, prefix, core, suffix] = match;

  if (core.includes("/")) {
    const parts = core
      .split("/")
      .map((part, idx) =>
        restoreWordFormat(part, titleCase, isFirstWord && idx === 0),
      );
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

export function formatCurrencyBr(value: number | null | undefined): string {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    value <= 0
  ) {
    return "Conforme edital";
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function formatCleanTitle(raw: string): string {
  if (!raw) return "Objeto não informado";
  let cleaned = raw
    .trim()
    .replace(/^\s*(?:\[[^\]]+\]\s*[-–—:•]*\s*)+/g, "")
    .replace(
      /^\s*(?:objeto\s*(?:da\s+(?:licita[çc][ãa]o|contrata[çc][ãa]o|compra))?\s*[:\-–—]\s*)/i,
      "",
    )
    .replace(/^\s*\d+(?:\.\d+)*\s*[)\-–—:]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Objeto não informado";

  const letters = cleaned.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  const upperCount = letters.replace(/[^A-ZÀ-Ý]/g, "").length;
  const isMostlyUpper =
    letters.length > 0 && upperCount / letters.length > 0.55;

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

export function extractBidTitleAndSummary(raw: string): {
  title: string;
  summary: string;
} {
  const full = formatCleanTitle(raw);
  let headline = full;

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

export function formatOrgName(raw: string | null | undefined): string {
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

export function formatBuyerLocation(
  city: string | null | undefined,
  uf: string | null | undefined,
  unitName: string | null | undefined,
): string {
  const cityLabel = `${city || "Brasil"}${uf ? `/${uf}` : ""}`;
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

  const strippedCityOrg = normCity
    ? org.replace(
        new RegExp(
          `\\s+(?:de|do|da|dos|das)\\s+${city?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          "i",
        ),
        "",
      )
    : org;

  return `${cityLabel} • ${strippedCityOrg.trim()}`;
}

export function formatDateBr(
  iso: string | null | undefined,
  withTime = true,
): string {
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
  const datePart = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} às ${timePart}`;
}

export function formatDeadlineBadge(bid: Pick<MePncpBid, "isOpen" | "daysLeft">): {
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
