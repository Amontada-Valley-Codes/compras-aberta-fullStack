import { NextResponse } from "next/server";
import type {
  MeBidDetailResponse,
  MeBidDocument,
  MeBidItem,
} from "@/features/dashboard/me/cnae-match";
import {
  mapRawToBid,
  type RawPncpItem,
} from "@/features/dashboard/me/pncp-mapper";
import { fetchPncpJson } from "@/features/dashboard/me/pncp-limiter";
import {
  readDetailDiskCache,
  writeDetailDiskCache,
} from "@/features/dashboard/me/pncp-disk-cache";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de cache em memória

interface RawPncpFile {
  uri?: string | null;
  url?: string | null;
  statusAtivo?: boolean;
  sequencialDocumento?: number;
  titulo?: string | null;
  tipoDocumentoNome?: string | null;
  tipoDocumentoDescricao?: string | null;
  tipoDocumentoId?: number;
  dataPublicacaoPncp?: string | null;
}

interface RawPncpBidItem {
  numeroItem?: number;
  descricao?: string | null;
  materialOuServicoNome?: string | null;
  valorUnitarioEstimado?: number | null;
  valorTotal?: number | null;
  quantidade?: number | null;
  unidadeMedida?: string | null;
  orcamentoSigiloso?: boolean;
  situacaoCompraItemNome?: string | null;
  tipoBeneficioNome?: string | null;
  criterioJulgamentoNome?: string | null;
}

const detailCache = new Map<
  string,
  { timestamp: number; data: MeBidDetailResponse }
>();

async function fetchJsonSafe<T>(url: string, timeoutMs = 10_000): Promise<T | null> {
  const res = await fetchPncpJson<T>(url, { timeoutMs, maxAttempts: 2 });
  if (!res.ok || res.status === 204 || !res.data) return null;
  return res.data;
}

function docPriority(typeName: string, title: string): number {
  const combined = `${typeName} ${title}`.toLowerCase();
  if (combined.includes("edital") || combined.includes("aviso")) return 0;
  if (combined.includes("termo de refer") || combined.includes("projeto b")) return 1;
  if (combined.includes("etp") || combined.includes("estudo t")) return 2;
  if (combined.includes("planilha") || combined.includes("orçamento") || combined.includes("orcamento")) return 3;
  if (combined.includes("minuta") || combined.includes("anexo")) return 4;
  return 5;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ cnpj: string; ano: string; sequencial: string }> },
) {
  const { cnpj, ano, sequencial } = await context.params;
  const cleanCnpj = cnpj.replace(/\D/g, "");
  const cleanAno = ano.replace(/\D/g, "");
  const cleanSeq = String(Number.parseInt(sequencial.replace(/\D/g, ""), 10));

  if (
    cleanCnpj.length !== 14 ||
    cleanAno.length !== 4 ||
    !cleanSeq ||
    cleanSeq === "NaN"
  ) {
    return NextResponse.json(
      { error: "Parâmetros PNCP inválidos." },
      { status: 400 },
    );
  }

  const cacheKey = `${cleanCnpj}:${cleanAno}:${cleanSeq}`;

  // 1. Verifica cache em memória
  const cached = detailCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // 2. Verifica cache persistente em disco
  const diskCached = await readDetailDiskCache(cacheKey);
  if (diskCached) {
    detailCache.set(cacheKey, { timestamp: Date.now(), data: diskCached });
    return NextResponse.json(diskCached);
  }

  const filesUrl = `https://pncp.gov.br/pncp-api/v1/orgaos/${cleanCnpj}/compras/${cleanAno}/${cleanSeq}/arquivos`;
  const itemsUrl = `https://pncp.gov.br/pncp-api/v1/orgaos/${cleanCnpj}/compras/${cleanAno}/${cleanSeq}/itens?pagina=1&tamanhoPagina=100`;
  const countUrl = `https://pncp.gov.br/pncp-api/v1/orgaos/${cleanCnpj}/compras/${cleanAno}/${cleanSeq}/itens/quantidade`;
  const singleBidUrl = `https://pncp.gov.br/api/consulta/v1/orgaos/${cleanCnpj}/compras/${cleanAno}/${cleanSeq}`;

  // Consulta através do limitador seguro de taxa
  const [rawFiles, rawItems, rawCount, rawSingleBid] = await Promise.all([
    fetchJsonSafe<RawPncpFile[]>(filesUrl),
    fetchJsonSafe<RawPncpBidItem[]>(itemsUrl),
    fetchJsonSafe<number>(countUrl, 6_000),
    fetchJsonSafe<RawPncpItem>(singleBidUrl),
  ]);

  const documents: MeBidDocument[] = Array.isArray(rawFiles)
    ? rawFiles
        .filter((f) => f && f.statusAtivo !== false && (f.url || f.uri))
        .map((f, index) => {
          const typeName =
            f.tipoDocumentoNome?.trim() ||
            f.tipoDocumentoDescricao?.trim() ||
            "Documento Oficial";
          const title = f.titulo?.trim() || `${typeName} #${f.sequencialDocumento ?? index + 1}`;
          return {
            id: f.sequencialDocumento ?? index + 1,
            title,
            typeName,
            publishedAt: f.dataPublicacaoPncp ?? null,
            url: (f.url || f.uri || "").trim(),
          };
        })
        .filter((d) => Boolean(d.url))
        .sort(
          (a, b) => docPriority(a.typeName, a.title) - docPriority(b.typeName, b.title),
        )
    : [];

  const items: MeBidItem[] = Array.isArray(rawItems)
    ? rawItems
        .filter((item) => item && item.descricao)
        .map((item, idx) => ({
          number: item.numeroItem ?? idx + 1,
          description: (item.descricao ?? "").trim(),
          kind: item.materialOuServicoNome?.trim() || null,
          quantity:
            typeof item.quantidade === "number" && Number.isFinite(item.quantidade)
              ? item.quantidade
              : null,
          unit: item.unidadeMedida?.trim() || null,
          unitValue:
            typeof item.valorUnitarioEstimado === "number" &&
            Number.isFinite(item.valorUnitarioEstimado)
              ? item.valorUnitarioEstimado
              : null,
          totalValue:
            typeof item.valorTotal === "number" && Number.isFinite(item.valorTotal)
              ? item.valorTotal
              : null,
          confidentialBudget: Boolean(item.orcamentoSigiloso),
          situation: item.situacaoCompraItemNome?.trim() || null,
          benefitName: item.tipoBeneficioNome?.trim() || null,
          judgmentCriteria: item.criterioJulgamentoNome?.trim() || null,
        }))
        .sort((a, b) => a.number - b.number)
    : [];

  const totalItems =
    typeof rawCount === "number" && rawCount >= items.length
      ? rawCount
      : items.length;

  const bid = rawSingleBid ? mapRawToBid(rawSingleBid, Date.now()) : null;

  const payload: MeBidDetailResponse = {
    bid,
    documents,
    items,
    totalItems,
  };

  detailCache.set(cacheKey, { timestamp: Date.now(), data: payload });
  await writeDetailDiskCache(cacheKey, payload);

  return NextResponse.json(payload);
}
