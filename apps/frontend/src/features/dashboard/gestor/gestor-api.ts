// Sem "use client": acesso do servidor do Next à API pública de dados
// (a mesma que o backend usa por trás das rotas /analytics). Estas rotas da
// API — participações, empresas, licitações e itens — não têm equivalente no
// backend Fastify, então são lidas direto, como o catálogo de municípios em
// services/municipalities/list-municipality-codes.service.ts.

const API_BASE_URL = process.env.ANALYTICS_API_BASE_URL ?? "https://compra-aberta-api.onrender.com";

const PAGE_SIZE = 100;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

export interface ApiParticipation {
  codigo_municipio: string;
  municipio: string;
  numero_licitacao: string;
  cnpj: string;
  razao_social: string | null;
  porte_empresa: string | null;
  cnae_principal: string | null;
  valor_total_vencido: string;
  quantidade_itens_vencidos: number;
  data_realizacao_licitacao: string | null;
}

export interface ApiCompany {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  cnae_principal: string | null;
  porte_empresa: string | null;
  uf_empresa: string | null;
  municipio_empresa: string | null;
}

export interface ApiBid {
  codigo_municipio: string;
  municipio: string;
  numero_licitacao: string;
  data_realizacao_licitacao: string | null;
  valor_total_licitacao: string;
  quantidade_empresas: number;
  quantidade_itens: number;
  // Nomes oficiais (ex.: "MATERIAL DE CONSUMO"); vazio quando a licitação
  // ainda não tem dotação associada.
  naturezas_despesa?: string[] | null;
}

export interface ApiBidItem {
  numero_sequencial_item_licitacao: number;
  cnpj: string | null;
  razao_social: string | null;
  porte_empresa: string | null;
  descricao_item_licitacao: string | null;
  unidade: string | null;
  quantidade: string;
  valor_unitario: string;
  valor_vencedor: string;
}

export class ApiNotFoundError extends Error {}

const ATTEMPTS = 3;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// O fetch do Next guarda cada página no cache de dados do servidor pelo tempo
// de "revalidate" (só respostas 200): depois da primeira consulta, as páginas
// seguintes abrem sem esperar a API, que fica no Render e pode demorar.
// A API às vezes responde 502/503 numa página isolada; sem nova tentativa,
// uma página com falha derrubaria a lista inteira.
async function getJson<T>(path: string, revalidate: number): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        headers: { Accept: "application/json" },
        next: { revalidate },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      // Falha de rede ou tempo esgotado: tenta de novo.
      if (attempt >= ATTEMPTS) throw error;
      await wait(500 * attempt);
      continue;
    }
    if (response.status === 404) throw new ApiNotFoundError(path);
    if (response.ok) return (await response.json()) as T;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= ATTEMPTS) throw new Error(`API de dados respondeu ${response.status} em ${path}`);
    await wait(500 * attempt);
  }
}

// As listagens da API devolvem no máximo 100 linhas e não informam o total:
// busca em lotes paralelos até a primeira página incompleta.
async function getAllPages<T>(path: string, revalidate: number, parallel: number, maxPages: number): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const rows: T[] = [];
  for (let start = 0; start < maxPages; start += parallel) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(parallel, maxPages - start) }, (_, index) =>
        getJson<{ data: T[] }>(`${path}${separator}limit=${PAGE_SIZE}&offset=${(start + index) * PAGE_SIZE}`, revalidate),
      ),
    );
    for (const page of batch) {
      rows.push(...page.data);
      if (page.data.length < PAGE_SIZE) return rows;
    }
  }
  return rows;
}

// ---------- Cadastro de empresas (cidade de cada fornecedor) ----------
// São ~20 mil empresas (~210 páginas). Fica em memória por 12 h, e cada
// página também no cache de dados do Next (1 dia), então só a primeira
// consulta do dia espera a API. Consultas simultâneas compartilham a mesma
// carga em andamento.
const DIRECTORY_TTL_MS = 12 * HOUR * 1000;
let directory: { loadedAt: number; promise: Promise<Map<string, ApiCompany>> } | null = null;

export function loadCompanyDirectory(): Promise<Map<string, ApiCompany>> {
  if (!directory || Date.now() - directory.loadedAt > DIRECTORY_TTL_MS) {
    const promise = getAllPages<ApiCompany>("/empresas", DAY, 20, 600)
      .then((companies) => new Map(companies.map((company) => [company.cnpj, company])));
    const entry = { loadedAt: Date.now(), promise };
    directory = entry;
    promise.catch(() => {
      if (directory === entry) directory = null;
    });
  }
  return directory.promise;
}

// ---------- Participações (empresas vencedoras) ----------
// A rota não filtra por ano: traz todas as vencedoras do município, e quem
// usa filtra pela data da licitação.
export function loadParticipations(tceCode: string): Promise<ApiParticipation[]> {
  return getAllPages<ApiParticipation>(`/participacoes?codigo_municipio=${encodeURIComponent(tceCode)}`, HOUR, 10, 300);
}

export function loadParticipationsByCnpj(cnpj: string): Promise<ApiParticipation[]> {
  return getAllPages<ApiParticipation>(`/participacoes?cnpj=${encodeURIComponent(cnpj)}`, HOUR, 5, 100);
}

// ---------- Licitações e itens ----------
export function loadBids(tceCode: string, year: number): Promise<ApiBid[]> {
  return getAllPages<ApiBid>(
    `/licitacoes?codigo_municipio=${encodeURIComponent(tceCode)}&data_inicio=${year}-01-01&data_fim=${year}-12-31`,
    HOUR,
    10,
    100,
  );
}

// Números de licitação com "/" (ex.: "PE 004/2025") não funcionam nesta rota
// da API (ela responde 404): quem chama trata ApiNotFoundError.
export function loadBidItems(tceCode: string, bidNumber: string): Promise<ApiBidItem[]> {
  return getAllPages<ApiBidItem>(
    `/licitacoes/${encodeURIComponent(tceCode)}/${encodeURIComponent(bidNumber)}/itens`,
    HOUR,
    5,
    50,
  );
}
