// Sem "use client": leitura, no servidor do Next, da API pública de consulta
// do PNCP (Portal Nacional de Contratações Públicas). Ela traz o que a fonte
// do TCE não tem: secretaria, modalidade, valor estimado x homologado, editais
// abertos, contratos com vigência e o Plano de Contratações Anual (PCA).
//
// Só aparece o que a prefeitura publicou no PNCP. A API é lenta (a rota de
// contratos leva ~20 s por órgão): tudo fica no cache de dados do Next e em
// memória, com nova tentativa quando uma consulta falha.

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta";
const HOUR = 60 * 60;

// Modalidades de contratação do PNCP (Lei 14.133/2021).
export const PNCP_MODALITIES: Record<number, string> = {
  1: "Leilão eletrônico",
  2: "Diálogo competitivo",
  3: "Concurso",
  4: "Concorrência eletrônica",
  5: "Concorrência presencial",
  6: "Pregão eletrônico",
  7: "Pregão presencial",
  8: "Dispensa",
  9: "Inexigibilidade",
  10: "Manifestação de interesse",
  11: "Pré-qualificação",
  12: "Credenciamento",
  13: "Leilão presencial",
};

// Modalidades consultadas: as que prefeituras usam. Cada uma é uma consulta
// separada ao PNCP (a rota exige a modalidade), e o PNCP limita a taxa.
const QUERIED_MODALITIES = [1, 4, 5, 6, 7, 8, 9, 12];

// Teto por modalidade: municípios grandes (Fortaleza tem ~8 mil dispensas por
// ano) não travam a página; quando o teto é atingido a tela avisa.
const MAX_PROCUREMENT_PAGES = 40;

export interface PncpProcurement {
  controlNumber: string;
  purchaseNumber: string;
  process: string | null;
  object: string;
  modalityId: number;
  modality: string;
  agencyCnpj: string;
  agencyName: string;
  unitName: string;
  estimated: number | null;
  awarded: number | null;
  publishedAt: string | null;
  openingAt: string | null;
  closingAt: string | null;
  legalBasis: string | null;
  srp: boolean;
  status: string;
  link: string;
}

export interface PncpContract {
  controlNumber: string;
  number: string | null;
  object: string;
  supplierName: string;
  supplierDocument: string | null;
  type: string;
  category: string | null;
  initialValue: number;
  globalValue: number;
  signedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  agencyCnpj: string;
  unitName: string;
  procurementControlNumber: string | null;
}

export interface PncpPlanItem {
  year: number;
  agencyCnpj: string;
  unitName: string;
  description: string;
  category: string;
  classification: string | null;
  quantity: number;
  unit: string | null;
  unitValue: number;
  total: number;
  desiredDate: string | null;
  requester: string | null;
  group: string | null;
}

export interface PncpResult<T> {
  rows: T[];
  // Teto de páginas atingido: os números são parciais.
  truncated: boolean;
}

// 429 (limite de taxa) pode esperar várias vezes; tempo esgotado ou falha de
// rede tenta só mais uma vez (órgãos sem dados às vezes fazem o PNCP demorar
// até estourar o tempo, e insistir só atrasa a página).
const ATTEMPTS = 6;
const NETWORK_ATTEMPTS = 2;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// O PNCP limita a taxa por IP: aceita uma rajada de ~14 consultas e depois
// responde 429 por ~25 s. Este "balde" (compartilhado por todo o servidor)
// libera até 8 consultas de imediato e depois uma a cada 2,5 s; um 429 pausa
// todas as consultas por 20 s.
const BUCKET_SIZE = 8;
const REFILL_MS = 2_500;
const PAUSE_ON_LIMIT_MS = 20_000;
let tokens = BUCKET_SIZE;
let refilledAt = Date.now();
let pausedUntil = 0;
let queue: Promise<void> = Promise.resolve();

function takeToken(): Promise<void> {
  // Fila: cada pedido espera o anterior pegar a sua vez.
  const turn = queue.then(async () => {
    for (;;) {
      const now = Date.now();
      if (now < pausedUntil) {
        await wait(pausedUntil - now);
        continue;
      }
      tokens = Math.min(BUCKET_SIZE, tokens + Math.floor((now - refilledAt) / REFILL_MS));
      if (tokens > 0) {
        if (tokens === BUCKET_SIZE) refilledAt = now;
        tokens -= 1;
        return;
      }
      await wait(REFILL_MS - ((now - refilledAt) % REFILL_MS));
      refilledAt = Date.now();
      tokens = 1;
    }
  });
  queue = turn.catch(() => undefined);
  return turn;
}

async function getJson<T>(path: string, revalidate: number, timeoutMs = 30_000): Promise<T | null> {
  let networkFailures = 0;
  for (let attempt = 1; ; attempt += 1) {
    await takeToken();
    let response: Response;
    try {
      response = await fetch(`${PNCP_BASE_URL}${path}`, {
        headers: { Accept: "application/json" },
        next: { revalidate },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      networkFailures += 1;
      if (networkFailures >= NETWORK_ATTEMPTS || attempt >= ATTEMPTS) throw error;
      await wait(1_000);
      continue;
    }
    // 204 = consulta válida sem nenhum registro.
    if (response.status === 204) return null;
    if (response.ok) return (await response.json()) as T;
    if (response.status === 429) {
      pausedUntil = Math.max(pausedUntil, Date.now() + PAUSE_ON_LIMIT_MS);
      if (attempt >= ATTEMPTS) throw new Error(`PNCP limitou as consultas (429) em ${path}`);
      continue;
    }
    if (response.status < 500 || attempt >= ATTEMPTS) throw new Error(`PNCP respondeu ${response.status} em ${path}`);
    await wait(1_000 * attempt);
  }
}

// Executa no máximo `limit` tarefas ao mesmo tempo (o PNCP não aguenta
// dezenas de consultas simultâneas).
async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

// Memória do processo: o resultado completo de cada consulta fica guardado
// pelo mesmo tempo do cache, então páginas já carregadas não voltam a passar
// pela fila do limitador.
const memo = new Map<string, { at: number; promise: Promise<unknown> }>();
function remember<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const cached = memo.get(key);
  if (cached && Date.now() - cached.at < ttlMs) return cached.promise as Promise<T>;
  const promise = load();
  memo.set(key, { at: Date.now(), promise });
  promise.catch(() => {
    if (memo.get(key)?.promise === promise) memo.delete(key);
  });
  return promise;
}

const ymd = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");
const yearRange = (year: number) => {
  const today = new Date();
  const end = new Date(Date.UTC(year, 11, 31));
  return { start: `${year}0101`, end: ymd(end < today ? end : today) };
};

interface Page<T> {
  data: T[];
  totalPaginas: number;
}

// ---------- Contratações publicadas ----------

interface RawProcurement {
  numeroControlePNCP: string;
  numeroCompra: string;
  processo: string | null;
  anoCompra: number;
  sequencialCompra: number;
  objetoCompra: string | null;
  modalidadeId: number;
  modalidadeNome: string;
  orgaoEntidade: { cnpj: string; razaoSocial: string; esferaId: string | null; poderId: string | null };
  unidadeOrgao: { nomeUnidade: string } | null;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataPublicacaoPncp: string | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  amparoLegal: { nome: string } | null;
  srp: boolean;
  situacaoCompraNome: string;
}

// A busca por município traz todo órgão sediado na cidade, inclusive escolas e
// órgãos do Estado e a Câmara Municipal. O painel é da prefeitura: ficam só
// os órgãos da esfera municipal que não são do Legislativo (prefeitura,
// secretarias, autarquias, fundos).
function isPrefectureAgency(raw: RawProcurement): boolean {
  return raw.orgaoEntidade.esferaId === "M" && raw.orgaoEntidade.poderId !== "L";
}

function toProcurement(raw: RawProcurement): PncpProcurement {
  return {
    controlNumber: raw.numeroControlePNCP,
    purchaseNumber: raw.numeroCompra,
    process: raw.processo,
    object: (raw.objetoCompra ?? "Objeto não informado").trim(),
    modalityId: raw.modalidadeId,
    modality: PNCP_MODALITIES[raw.modalidadeId] ?? raw.modalidadeNome,
    agencyCnpj: raw.orgaoEntidade.cnpj,
    agencyName: raw.orgaoEntidade.razaoSocial,
    unitName: raw.unidadeOrgao?.nomeUnidade?.trim() || raw.orgaoEntidade.razaoSocial,
    estimated: raw.valorTotalEstimado,
    awarded: raw.valorTotalHomologado,
    publishedAt: raw.dataPublicacaoPncp,
    openingAt: raw.dataAberturaProposta,
    closingAt: raw.dataEncerramentoProposta,
    legalBasis: raw.amparoLegal?.nome ?? null,
    srp: raw.srp,
    status: raw.situacaoCompraNome,
    link: `https://pncp.gov.br/app/editais/${raw.orgaoEntidade.cnpj}/${raw.anoCompra}/${raw.sequencialCompra}`,
  };
}

async function loadModality(ibge: string, year: number, modality: number): Promise<PncpResult<RawProcurement>> {
  const { start, end } = yearRange(year);
  const base = `/v1/contratacoes/publicacao?dataInicial=${start}&dataFinal=${end}&codigoModalidadeContratacao=${modality}&codigoMunicipioIbge=${ibge}&tamanhoPagina=50`;
  const first = await getJson<Page<RawProcurement>>(`${base}&pagina=1`, 6 * HOUR);
  if (!first) return { rows: [], truncated: false };
  const pages = Math.min(first.totalPaginas, MAX_PROCUREMENT_PAGES);
  const rest = await mapLimit(
    Array.from({ length: pages - 1 }, (_, index) => index + 2),
    6,
    (page) => getJson<Page<RawProcurement>>(`${base}&pagina=${page}`, 6 * HOUR),
  );
  return {
    rows: [first, ...rest].flatMap((page) => page?.data ?? []),
    truncated: first.totalPaginas > MAX_PROCUREMENT_PAGES,
  };
}

// Todas as contratações publicadas no ano, de todas as modalidades.
export function loadProcurements(ibge: string, year: number): Promise<PncpResult<PncpProcurement>> {
  return remember(`procurements:${ibge}:${year}`, 6 * HOUR * 1000, async () => {
    // Uma modalidade que falha não derruba as outras: o resultado fica marcado
    // como parcial. Se todas falharem, a página mostra o erro.
    let failures = 0;
    const results = await mapLimit(QUERIED_MODALITIES, 4, (modality) =>
      loadModality(ibge, year, modality).catch(() => {
        failures += 1;
        return { rows: [] as RawProcurement[], truncated: true };
      }),
    );
    if (failures === QUERIED_MODALITIES.length) throw new Error("PNCP indisponível");
    const seen = new Set<string>();
    const rows: PncpProcurement[] = [];
    for (const raw of results.flatMap((result) => result.rows)) {
      if (seen.has(raw.numeroControlePNCP) || !isPrefectureAgency(raw)) continue;
      seen.add(raw.numeroControlePNCP);
      rows.push(toProcurement(raw));
    }
    return { rows, truncated: results.some((result) => result.truncated) };
  });
}

// Editais com recebimento de propostas aberto (encerramento de hoje em diante).
export function loadOpenTenders(ibge: string): Promise<PncpProcurement[]> {
  return remember(`open:${ibge}`, HOUR * 1000, async () => {
    const until = new Date();
    until.setUTCFullYear(until.getUTCFullYear() + 1);
    const base = `/v1/contratacoes/proposta?dataFinal=${ymd(until)}&codigoMunicipioIbge=${ibge}&tamanhoPagina=50`;
    const first = await getJson<Page<RawProcurement>>(`${base}&pagina=1`, HOUR);
    if (!first) return [];
    const rest = await mapLimit(
      Array.from({ length: Math.min(first.totalPaginas, 10) - 1 }, (_, index) => index + 2),
      4,
      (page) => getJson<Page<RawProcurement>>(`${base}&pagina=${page}`, HOUR),
    );
    const now = Date.now();
    return [first, ...rest]
      .flatMap((page) => page?.data ?? [])
      .filter(isPrefectureAgency)
      .map(toProcurement)
      .filter((item) => !item.closingAt || new Date(item.closingAt).getTime() >= now)
      .sort((a, b) => (a.closingAt ?? "").localeCompare(b.closingAt ?? ""));
  });
}

// Órgãos (prefeitura, secretarias, autarquias, câmara) que publicam no PNCP,
// descobertos pelas contratações do ano.
export async function loadAgencies(ibge: string, year: number): Promise<Map<string, string>> {
  const current = await loadProcurements(ibge, year);
  const agencies = new Map<string, string>();
  for (const row of current.rows) {
    if (!agencies.has(row.agencyCnpj)) agencies.set(row.agencyCnpj, row.agencyName);
  }
  return agencies;
}

// ---------- Contratos ----------

interface RawContract {
  numeroControlePNCP: string;
  numeroControlePncpCompra: string | null;
  numeroContratoEmpenho: string | null;
  objetoContrato: string | null;
  nomeRazaoSocialFornecedor: string | null;
  niFornecedor: string | null;
  tipoContrato: { nome: string } | null;
  categoriaProcesso: { nome: string } | null;
  valorInicial: number | null;
  valorGlobal: number | null;
  dataAssinatura: string | null;
  dataVigenciaInicio: string | null;
  dataVigenciaFim: string | null;
  orgaoEntidade: { cnpj: string; razaoSocial: string };
  unidadeOrgao: { nomeUnidade: string } | null;
}

function loadAgencyContracts(cnpj: string, year: number): Promise<RawContract[]> {
  const { start, end } = yearRange(year);
  return getJson<Page<RawContract>>(
    `/v1/contratos?dataInicial=${start}&dataFinal=${end}&cnpjOrgao=${cnpj}&pagina=1&tamanhoPagina=500`,
    12 * HOUR,
    90_000,
  ).then((page) => page?.data ?? []);
}

// Contratos publicados no ano escolhido, no anterior e no ano corrente: o ano
// corrente garante os vigentes hoje mesmo quando o gestor olha um ano passado
// (contratos mais antigos e ainda vigentes ficam de fora).
export function contractYears(year: number): number[] {
  return [...new Set([year - 1, year, new Date().getUTCFullYear()])].filter((item) => item <= new Date().getUTCFullYear()).sort();
}

export function loadContracts(ibge: string, year: number): Promise<{ rows: PncpContract[]; agencies: number; failedRequests: number }> {
  return remember(`contracts:${ibge}:${year}`, 12 * HOUR * 1000, async () => {
    const agencies = [...(await loadAgencies(ibge, year)).keys()];
    const jobs = agencies.flatMap((cnpj) => contractYears(year).map((jobYear) => ({ cnpj, jobYear })));
    let failed = 0;
    const lists = await mapLimit(jobs, 8, ({ cnpj, jobYear }) =>
      loadAgencyContracts(cnpj, jobYear).catch(() => {
        failed += 1;
        return [] as RawContract[];
      }),
    );
    const seen = new Set<string>();
    const rows: PncpContract[] = [];
    for (const raw of lists.flat()) {
      if (seen.has(raw.numeroControlePNCP)) continue;
      seen.add(raw.numeroControlePNCP);
      rows.push({
        controlNumber: raw.numeroControlePNCP,
        number: raw.numeroContratoEmpenho,
        object: (raw.objetoContrato ?? "Objeto não informado").trim(),
        supplierName: (raw.nomeRazaoSocialFornecedor ?? "Fornecedor não informado").trim(),
        supplierDocument: raw.niFornecedor,
        type: raw.tipoContrato?.nome ?? "Contrato",
        category: raw.categoriaProcesso?.nome ?? null,
        initialValue: raw.valorInicial ?? 0,
        globalValue: raw.valorGlobal ?? raw.valorInicial ?? 0,
        signedAt: raw.dataAssinatura,
        startsAt: raw.dataVigenciaInicio,
        endsAt: raw.dataVigenciaFim,
        agencyCnpj: raw.orgaoEntidade.cnpj,
        unitName: raw.unidadeOrgao?.nomeUnidade?.trim() || raw.orgaoEntidade.razaoSocial,
        procurementControlNumber: raw.numeroControlePncpCompra,
      });
    }
    return { rows, agencies: agencies.length, failedRequests: failed };
  });
}

// ---------- PCA (Plano de Contratações Anual) ----------

interface RawPlan {
  anoPca: number;
  nomeUnidade: string | null;
  orgaoEntidadeCnpj: string;
  itens: Array<{
    descricaoItem: string | null;
    categoriaItemPcaNome: string | null;
    classificacaoSuperiorNome: string | null;
    quantidadeEstimada: number | null;
    unidadeFornecimento: string | null;
    valorUnitario: number | null;
    valorTotal: number | null;
    dataDesejada: string | null;
    unidadeRequisitante: string | null;
    grupoContratacaoNome: string | null;
  }>;
}

// O PCA do ano Y costuma ser publicado em Y-1 e atualizado em Y. A rota filtra
// pela data de atualização (janela de até 365 dias), então a busca usa os
// 12 meses até o fim do ano escolhido (ou até hoje) e fica com os itens do ano.
function loadAgencyPlan(cnpj: string, year: number): Promise<PncpPlanItem[]> {
  const today = new Date();
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const end = yearEnd < today ? yearEnd : today;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  const base = `/v1/pca/atualizacao?dataInicio=${ymd(start)}&dataFim=${ymd(end)}&cnpj=${cnpj}&tamanhoPagina=500`;

  return (async () => {
    const first = await getJson<Page<RawPlan>>(`${base}&pagina=1`, 12 * HOUR);
    if (!first) return [];
    const rest = await mapLimit(
      Array.from({ length: Math.min(first.totalPaginas, 20) - 1 }, (_, index) => index + 2),
      3,
      (page) => getJson<Page<RawPlan>>(`${base}&pagina=${page}`, 12 * HOUR),
    );
    return [first, ...rest]
      .flatMap((page) => page?.data ?? [])
      .filter((plan) => plan.anoPca === year)
      .flatMap((plan) =>
        plan.itens.map((item) => ({
          year: plan.anoPca,
          agencyCnpj: plan.orgaoEntidadeCnpj,
          unitName: plan.nomeUnidade?.trim() || "Órgão não informado",
          description: (item.descricaoItem ?? "Item sem descrição").trim(),
          category: item.categoriaItemPcaNome ?? "Não informada",
          classification: item.classificacaoSuperiorNome,
          quantity: item.quantidadeEstimada ?? 0,
          unit: item.unidadeFornecimento,
          unitValue: item.valorUnitario ?? 0,
          total: item.valorTotal ?? 0,
          desiredDate: item.dataDesejada,
          requester: item.unidadeRequisitante,
          group: item.grupoContratacaoNome,
        })),
      );
  })();
}

export function loadPlan(ibge: string, year: number): Promise<{ items: PncpPlanItem[]; agencies: number; agenciesWithPlan: number }> {
  return remember(`plan:${ibge}:${year}`, 12 * HOUR * 1000, async () => {
    const agencies = [...(await loadAgencies(ibge, year)).keys()];
    const lists = await mapLimit(agencies, 5, (cnpj) => loadAgencyPlan(cnpj, year).catch(() => [] as PncpPlanItem[]));
    return {
      items: lists.flat(),
      agencies: agencies.length,
      agenciesWithPlan: lists.filter((list) => list.length > 0).length,
    };
  });
}
