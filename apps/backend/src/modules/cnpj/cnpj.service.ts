import axios from "axios";

import { openCnpjApi } from "../../lib/axios/opencnpj-api";
import { createMemoryCache } from "../../lib/cache/memory-cache";
import { AppError } from "../../utils/AppError";
import { municipioService } from "../municipios/municipio.service";
import type { FindCnpjDTO } from "./cnpj.schema";

// Só os campos da resposta do OpenCNPJ que usamos.
interface OpenCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  porte_empresa: string;
  cnae_principal?: string;
  cnaes?: { codigo?: string; descricao: string; is_principal: boolean }[];
  municipio: string;
  uf: string;
  email: string;
  telefones?: { ddd: string; numero: string; is_fax: boolean }[];
}

// Os dados cadastrais mudam pouco; um dia de cache evita repetir a consulta
// externa a cada tecla ou reenvio do formulário.
const cnpjCache = createMemoryCache<OpenCnpjResponse>({
  ttlMs: 24 * 60 * 60 * 1000,
});

// A Receita grava o município em maiúsculas e sem acentos ("SAO GONCALO DO
// AMARANTE"); o catálogo usa o nome do IBGE ("São Gonçalo do Amarante").
function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

async function findMunicipioIbge(nome: string, uf: string) {
  // O catálogo só tem municípios do Ceará.
  if (uf !== "CE") {
    return null;
  }

  const municipios = await municipioService.list({});
  const target = normalizeName(nome);
  const match = municipios.find(
    (municipio) => municipio.nome && normalizeName(municipio.nome) === target,
  );

  return match?.id ?? null;
}

function mainPhone(telefones: OpenCnpjResponse["telefones"]) {
  const phone = telefones?.find((item) => !item.is_fax && item.numero);
  const digits = phone ? `${phone.ddd}${phone.numero}`.replace(/\D/g, "") : "";

  return /^\d{10,11}$/.test(digits) ? digits : null;
}

async function fetchCnpj(cnpj: string) {
  try {
    const { data } = await openCnpjApi.get<OpenCnpjResponse>(`/${cnpj}`);

    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError("CNPJ não encontrado na Receita Federal", 404);
    }

    throw new AppError(
      "Não foi possível consultar o CNPJ na Receita Federal agora.",
      502,
      {
        upstreamStatus: axios.isAxiosError(error)
          ? error.response?.status
          : undefined,
        code: axios.isAxiosError(error) ? error.code : undefined,
        cause: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

const cnpjService = {
  async find({ cnpj }: FindCnpjDTO) {
    const data = await cnpjCache.getOrLoad(cnpj, () => fetchCnpj(cnpj));

    const cnaes = (data.cnaes ?? []).map((item) => ({
      codigo: item.codigo ?? (item.is_principal ? data.cnae_principal ?? "" : ""),
      descricao: item.descricao,
      isPrincipal: Boolean(item.is_principal),
    }));

    const principal = cnaes.find((cnae) => cnae.isPrincipal) ?? cnaes[0] ?? null;

    return {
      cnpj: data.cnpj,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia || null,
      situacaoCadastral: data.situacao_cadastral,
      porte: data.porte_empresa || null,
      atividadePrincipal: principal?.descricao ?? null,
      cnaePrincipal: principal
        ? { codigo: principal.codigo, descricao: principal.descricao }
        : null,
      cnaes,
      municipio: {
        nome: data.municipio,
        uf: data.uf,
        codigoIbge: await findMunicipioIbge(data.municipio, data.uf),
      },
      telefone: mainPhone(data.telefones),
      email: data.email ? data.email.trim().toLowerCase() : null,
    };
  },
};

export { cnpjService };
