import { paymentResponses } from "./payments.responses";
import {
  badGatewayResponse,
  field,
  object,
  toJsonSchema,
  validationErrorResponse,
} from "../../docs/helpers";
import {
  paymentsSummaryQuerySchema,
  paymentSuppliersQuerySchema,
  getMicroenterpriseIndicatorQuerySchema,
  listDetailedBidsQuerySchema,
  listExpensesByNatureQuerySchema,
  listGeneralMicroenterpriseParticipationsQuerySchema,
  listLocalMicroenterpriseParticipationsQuerySchema,
  listMicroenterpriseParticipationByNatureQuerySchema,
} from "./analytics.schema";

const tags = ["Analytics"];

const upstreamNote = [
  "",
  "Os dados vêm da API externa de dados: a resposta é **cacheada por alguns minutos** e, se a API falhar, o backend tenta de novo até 2 vezes antes de responder **502**.",
].join("\n");

const errors = { 400: validationErrorResponse, 502: badGatewayResponse };

const pagination = {
  limit: field.integer("Limite aplicado à consulta.", 100),
  offset: field.integer("Deslocamento aplicado à consulta.", 0),
};

const percentual = (description: string) =>
  field.nullableNumber(
    `${description} Em porcentagem (0–100); \`null\` quando não há base para o cálculo.`,
    12.5,
  );

const listDetailedBidsDocs = {
  tags,
  summary: "Listar licitações detalhadas",
  description: [
    "Lista licitações com o **vencedor** de cada uma (empresa, CNPJ e porte) e os valores envolvidos.",
    "",
    "Todos os filtros são opcionais e combináveis: município, natureza e ano. Use `limit` e `offset` para paginar (máximo de 100 registros por página).",
    "",
    "É a base da tabela de oportunidades e da exportação da tela de análise.",
    upstreamNote,
  ].join("\n"),
  querystring: toJsonSchema(listDetailedBidsQuerySchema),
  response: {
    200: object("Página de licitações.", {
      ...pagination,
      data: {
        type: "array",
        description: "Licitações da página atual.",
        items: object("Licitação e seu vencedor.", {
          codigo_municipio: field.string("Código TCE-CE do município.", "1"),
          municipio: field.string("Nome do município.", "Fortaleza"),
          numero_licitacao: field.string("Número da licitação.", "2024.0001"),
          ano_licitacao: field.integer("Ano da licitação.", 2024),
          valor_total_licitacao: field.money("Valor total estimado da licitação."),
          codigo_natureza: field.string("Código da natureza.", "33"),
          nome_natureza: field.string("Nome da natureza."),
          cnpj: field.nullableString("CNPJ do vencedor, quando há.", "12345678000190"),
          empresa: field.nullableString("Razão social do vencedor, quando há."),
          porte_empresa: field.nullableString(
            "Porte do vencedor (ex.: microempresa), quando informado.",
          ),
          valor_total_vencido: field.money("Valor total vencido por essa empresa."),
          quantidade_itens_vencidos: field.integer(
            "Quantidade de itens vencidos por essa empresa.",
            3,
          ),
        }),
      },
    }),
    ...errors,
  },
};

const participacaoItemFields = {
  codigo_municipio: field.string("Código TCE-CE do município.", "1"),
  municipio_consultado: field.string("Nome do município consultado."),
  numero_licitacao: field.string("Número da licitação.", "2024.0001"),
  data_realizacao_licitacao: field.nullableString(
    "Data de realização da licitação.",
    "2024-05-10",
  ),
  cnpj: field.string("CNPJ da empresa.", "12345678000190"),
  empresa: field.nullableString("Razão social da empresa."),
  porte_empresa: field.nullableString(
    "Porte da empresa (ex.: microempresa), quando informado.",
  ),
  municipio_empresa: field.nullableString("Município onde a empresa é sediada."),
  uf_empresa: field.nullableString("UF onde a empresa é sediada.", "CE"),
  endereco: field.nullableString("Endereço cadastrado da empresa."),
  valor_total_vencido: field.money("Valor vencido pela empresa."),
  quantidade_itens_vencidos: field.integer(
    "Quantidade de itens vencidos por essa empresa.",
    3,
  ),
};

const listLocalMicroenterpriseParticipationsDocs = {
  tags,
  summary: "Participações de microempresas locais",
  description: [
    "Lista as participações de **microempresas locais** (sediadas no próprio município) nas licitações do município informado, com um **resumo** de percentuais.",
    "",
    "`codigo_municipio` é **obrigatório**. `codigo_natureza` é opcional. O objeto `resumo` responde à pergunta: *quanto das compras do município fica com empresas da própria cidade?*",
    "",
    "Veja também `GET /analytics/participacoes-me-gerais`, que traz todas as ME vencedoras no município (locais ou não).",
    upstreamNote,
  ].join("\n"),
  querystring: toJsonSchema(listLocalMicroenterpriseParticipationsQuerySchema),
  response: {
    200: object("Participações e resumo do município.", {
      ...pagination,
      data: {
        type: "array",
        description: "Participações de ME locais na página atual.",
        items: object("Participação de uma ME local.", participacaoItemFields),
      },
      resumo: object("Totais e percentuais do município no período.", {
        total_licitacoes: field.integer("Total de licitações do município.", 120),
        licitacoes_com_me_local: field.integer(
          "Licitações com ao menos uma ME local participando.",
          30,
        ),
        percentual_licitacoes_com_me_local: percentual(
          "Parcela das licitações com ME local.",
        ),
        total_participacoes: field.integer("Total de participações.", 400),
        participacoes_me_locais: field.integer(
          "Participações de ME locais.",
          80,
        ),
        percentual_participacoes_me_locais: percentual(
          "Parcela das participações que são de ME locais.",
        ),
        valor_total_vencido: field.money("Valor total vencido no município."),
        valor_vencido_me_local: field.money("Parte do valor vencida por ME locais."),
        percentual_valor_vencido_me_local: percentual(
          "Parcela do valor vencida por ME locais.",
        ),
        itens_vencidos: field.integer("Total de itens vencidos no município.", 500),
        itens_vencidos_me_locais: field.integer(
          "Itens vencidos por ME locais.",
          90,
        ),
        percentual_itens_vencidos_me_locais: percentual(
          "Parcela dos itens vencidos por ME locais.",
        ),
      }),
    }),
    ...errors,
  },
};

const listGeneralMicroenterpriseParticipationsDocs = {
  tags,
  summary: "Participações de microempresas (geral)",
  description: [
    "Lista **todas** as microempresas vencedoras em licitações do município informado, sejam elas locais ou de fora, com um **resumo** de percentuais.",
    "",
    "`codigo_municipio` é **obrigatório**. `codigo_natureza` é opcional. Diferente de `GET /analytics/participacoes-me-locais`, aqui não importa onde a empresa está sediada.",
    upstreamNote,
  ].join("\n"),
  querystring: toJsonSchema(listGeneralMicroenterpriseParticipationsQuerySchema),
  response: {
    200: object("Participações e resumo do município.", {
      ...pagination,
      data: {
        type: "array",
        description: "Participações de ME (locais ou não) na página atual.",
        items: object("Participação de uma ME.", participacaoItemFields),
      },
      resumo: object("Totais e percentuais do município no período.", {
        total_licitacoes: field.integer("Total de licitações do município.", 120),
        licitacoes_com_me: field.integer(
          "Licitações com ao menos uma ME participando.",
          45,
        ),
        percentual_licitacoes_com_me: percentual("Parcela das licitações com ME."),
        total_participacoes: field.integer("Total de participações.", 400),
        participacoes_me: field.integer("Participações de ME.", 120),
        percentual_participacoes_me: percentual(
          "Parcela das participações que são de ME.",
        ),
        valor_total_vencido: field.money("Valor total vencido no município."),
        valor_vencido_me: field.money("Parte do valor vencida por ME."),
        percentual_valor_vencido_me: percentual(
          "Parcela do valor vencida por ME.",
        ),
        itens_vencidos: field.integer("Total de itens vencidos no município.", 500),
        itens_vencidos_me: field.integer("Itens vencidos por ME.", 140),
        percentual_itens_vencidos_me: percentual(
          "Parcela dos itens vencidos por ME.",
        ),
      }),
    }),
    ...errors,
  },
};

const listExpensesByNatureDocs = {
  tags,
  summary: "Gastos por natureza",
  description: [
    "Agrupa as **dotações** (valores reservados para compras) por natureza, mostrando quanto o município planeja gastar em cada categoria.",
    "",
    "Sem `codigo_municipio` a consulta abrange todos os municípios. `data_inicio` e `data_fim` são opcionais e delimitam o período.",
    "",
    "A resposta inclui `metrica` e `observacao`, que explicam como o valor foi calculado — vale exibi-los junto do gráfico.",
    upstreamNote,
  ].join("\n"),
  querystring: toJsonSchema(listExpensesByNatureQuerySchema),
  response: {
    200: object("Gastos agrupados por natureza.", {
      data: {
        type: "array",
        description: "Uma linha por natureza.",
        items: object("Gasto de uma natureza.", {
          codigo_natureza: field.string("Código da natureza.", "33"),
          nome_natureza: field.string("Nome da natureza."),
          valor_total_dotacao: field.money("Soma das dotações da natureza."),
          quantidade_dotacoes: field.integer("Quantidade de dotações.", 15),
          quantidade_licitacoes: field.integer(
            "Quantidade de licitações relacionadas.",
            8,
          ),
        }),
      },
      metrica: field.string("Descrição da métrica usada no cálculo."),
      observacao: field.string("Ressalvas sobre interpretação dos valores."),
    }),
    ...errors,
  },
};

const getMicroenterpriseIndicatorDocs = {
  tags,
  summary: "Indicador de microempresas",
  description: [
    "Devolve **totais consolidados** sobre a participação de microempresas (ME) nas licitações: quantas empresas, quantas licitações e participações, e quanto venceram.",
    "",
    "Todos os filtros são opcionais (município, natureza e período). Sem filtros, o indicador considera todos os dados disponíveis. `porte_considerado` lista os portes de empresa contados como microempresa.",
    upstreamNote,
  ].join("\n"),
  querystring: toJsonSchema(getMicroenterpriseIndicatorQuerySchema),
  response: {
    200: object("Indicador consolidado.", {
      data: object("Totais no filtro informado.", {
        quantidade_microempresas: field.integer(
          "Microempresas distintas que participaram.",
          250,
        ),
        quantidade_licitacoes: field.integer("Licitações consideradas.", 120),
        quantidade_participacoes: field.integer(
          "Participações das microempresas.",
          600,
        ),
        valor_total_vencido: field.money("Valor vencido pelas microempresas."),
        quantidade_itens_vencidos: field.integer(
          "Itens vencidos pelas microempresas.",
          900,
        ),
      }),
      porte_considerado: {
        type: "array",
        description: "Portes de empresa contados como microempresa.",
        items: { type: "string" },
      },
    }),
    ...errors,
  },
};

const listMicroenterpriseParticipationByNatureDocs = {
  tags,
  summary: "Participação de microempresas por natureza",
  description: [
    "Para cada natureza, compara a participação das microempresas com o total: quantas licitações e participações tiveram ME, quanto foi vencido, e os **percentuais** correspondentes.",
    "",
    "Serve para descobrir em quais categorias de compra as microempresas têm mais (ou menos) espaço. Filtros opcionais: município e período.",
    upstreamNote,
  ].join("\n"),
  querystring: toJsonSchema(listMicroenterpriseParticipationByNatureQuerySchema),
  response: {
    200: object("Participação de ME por natureza.", {
      associacao: field.string("Associação dos valores às naturezas no nível da licitação."),
      observacao: field.string("Limitações da associação; valores não devem ser somados entre naturezas sem deduplicação."),
      data: {
        type: "array",
        description: "Uma linha por natureza.",
        items: object("Participação de ME em uma natureza.", {
          codigo_natureza: field.string("Código da natureza.", "33"),
          nome_natureza: field.string("Nome da natureza."),
          quantidade_licitacoes: field.integer("Total de licitações.", 120),
          licitacoes_com_me: field.integer("Licitações com ME.", 30),
          percentual_licitacoes_com_me: percentual("Parcela das licitações com ME."),
          quantidade_participacoes: field.integer("Total de participações.", 400),
          participacoes_me: field.integer("Participações de ME.", 80),
          percentual_participacoes_me: percentual(
            "Parcela das participações que são de ME.",
          ),
          valor_vencido: field.money("Valor total vencido na natureza."),
          valor_vencido_me: field.money("Parte do valor vencida por ME."),
          percentual_valor_vencido_me: percentual(
            "Parcela do valor vencida por ME.",
          ),
        }),
      },
    }),
    ...errors,
  },
};

export {
  getMicroenterpriseIndicatorDocs,
  listDetailedBidsDocs,
  listExpensesByNatureDocs,
  listGeneralMicroenterpriseParticipationsDocs,
  listLocalMicroenterpriseParticipationsDocs,
  listMicroenterpriseParticipationByNatureDocs,
};

export const paymentsSummaryDocs = {
  tags, summary: "Resumo de pagamentos por natureza",
  description: "Pagamentos efetivos da Prefeitura nas sete naturezas, total de controle e subtotal ME. Inclui metadados da coleta e pendências." + upstreamNote,
  querystring: toJsonSchema(paymentsSummaryQuerySchema),
  response: { 200: paymentResponses.summary, ...errors },
};
export const paymentSuppliersDocs = {
  tags, summary: "Pagamentos por fornecedor e natureza",
  description: "Por padrão retorna ME. categoria_porte vazio inclui todas as categorias. Use coleta_id do resumo para manter a mesma coleta." + upstreamNote,
  querystring: toJsonSchema(paymentSuppliersQuerySchema),
  response: { 200: paymentResponses.suppliers, ...errors },
};
