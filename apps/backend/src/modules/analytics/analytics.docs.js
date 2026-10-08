"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMicroenterpriseParticipationByNatureDocs = exports.listLocalMicroenterpriseParticipationsDocs = exports.listGeneralMicroenterpriseParticipationsDocs = exports.listExpensesByNatureDocs = exports.listDetailedBidsDocs = exports.getMicroenterpriseIndicatorDocs = void 0;
const helpers_1 = require("../../docs/helpers");
const analytics_schema_1 = require("./analytics.schema");
const tags = ["Analytics"];
const upstreamNote = [
    "",
    "Os dados vêm da API externa de dados: a resposta é **cacheada por alguns minutos** e, se a API falhar, o backend tenta de novo até 2 vezes antes de responder **502**.",
].join("\n");
const errors = { 400: helpers_1.validationErrorResponse, 502: helpers_1.badGatewayResponse };
const pagination = {
    limit: helpers_1.field.integer("Limite aplicado à consulta.", 100),
    offset: helpers_1.field.integer("Deslocamento aplicado à consulta.", 0),
};
const percentual = (description) => helpers_1.field.nullableNumber(`${description} Em porcentagem (0–100); \`null\` quando não há base para o cálculo.`, 12.5);
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
    querystring: (0, helpers_1.toJsonSchema)(analytics_schema_1.listDetailedBidsQuerySchema),
    response: {
        200: (0, helpers_1.object)("Página de licitações.", {
            ...pagination,
            data: {
                type: "array",
                description: "Licitações da página atual.",
                items: (0, helpers_1.object)("Licitação e seu vencedor.", {
                    codigo_municipio: helpers_1.field.string("Código TCE-CE do município.", "1"),
                    municipio: helpers_1.field.string("Nome do município.", "Fortaleza"),
                    numero_licitacao: helpers_1.field.string("Número da licitação.", "2024.0001"),
                    ano_licitacao: helpers_1.field.integer("Ano da licitação.", 2024),
                    valor_total_licitacao: helpers_1.field.money("Valor total estimado da licitação."),
                    codigo_natureza: helpers_1.field.string("Código da natureza.", "33"),
                    nome_natureza: helpers_1.field.string("Nome da natureza."),
                    cnpj: helpers_1.field.nullableString("CNPJ do vencedor, quando há.", "12345678000190"),
                    empresa: helpers_1.field.nullableString("Razão social do vencedor, quando há."),
                    porte_empresa: helpers_1.field.nullableString("Porte do vencedor (ex.: microempresa), quando informado."),
                    valor_total_vencido: helpers_1.field.money("Valor total vencido por essa empresa."),
                    quantidade_itens_vencidos: helpers_1.field.integer("Quantidade de itens vencidos por essa empresa.", 3),
                }),
            },
        }),
        ...errors,
    },
};
exports.listDetailedBidsDocs = listDetailedBidsDocs;
const participacaoItemFields = {
    codigo_municipio: helpers_1.field.string("Código TCE-CE do município.", "1"),
    municipio_consultado: helpers_1.field.string("Nome do município consultado."),
    numero_licitacao: helpers_1.field.string("Número da licitação.", "2024.0001"),
    data_realizacao_licitacao: helpers_1.field.nullableString("Data de realização da licitação.", "2024-05-10"),
    cnpj: helpers_1.field.string("CNPJ da empresa.", "12345678000190"),
    empresa: helpers_1.field.nullableString("Razão social da empresa."),
    porte_empresa: helpers_1.field.nullableString("Porte da empresa (ex.: microempresa), quando informado."),
    municipio_empresa: helpers_1.field.nullableString("Município onde a empresa é sediada."),
    uf_empresa: helpers_1.field.nullableString("UF onde a empresa é sediada.", "CE"),
    endereco: helpers_1.field.nullableString("Endereço cadastrado da empresa."),
    valor_total_vencido: helpers_1.field.money("Valor vencido pela empresa."),
    quantidade_itens_vencidos: helpers_1.field.integer("Quantidade de itens vencidos por essa empresa.", 3),
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
    querystring: (0, helpers_1.toJsonSchema)(analytics_schema_1.listLocalMicroenterpriseParticipationsQuerySchema),
    response: {
        200: (0, helpers_1.object)("Participações e resumo do município.", {
            ...pagination,
            data: {
                type: "array",
                description: "Participações de ME locais na página atual.",
                items: (0, helpers_1.object)("Participação de uma ME local.", participacaoItemFields),
            },
            resumo: (0, helpers_1.object)("Totais e percentuais do município no período.", {
                total_licitacoes: helpers_1.field.integer("Total de licitações do município.", 120),
                licitacoes_com_me_local: helpers_1.field.integer("Licitações com ao menos uma ME local participando.", 30),
                percentual_licitacoes_com_me_local: percentual("Parcela das licitações com ME local."),
                total_participacoes: helpers_1.field.integer("Total de participações.", 400),
                participacoes_me_locais: helpers_1.field.integer("Participações de ME locais.", 80),
                percentual_participacoes_me_locais: percentual("Parcela das participações que são de ME locais."),
                valor_total_vencido: helpers_1.field.money("Valor total vencido no município."),
                valor_vencido_me_local: helpers_1.field.money("Parte do valor vencida por ME locais."),
                percentual_valor_vencido_me_local: percentual("Parcela do valor vencida por ME locais."),
                itens_vencidos: helpers_1.field.integer("Total de itens vencidos no município.", 500),
                itens_vencidos_me_locais: helpers_1.field.integer("Itens vencidos por ME locais.", 90),
                percentual_itens_vencidos_me_locais: percentual("Parcela dos itens vencidos por ME locais."),
            }),
        }),
        ...errors,
    },
};
exports.listLocalMicroenterpriseParticipationsDocs = listLocalMicroenterpriseParticipationsDocs;
const listGeneralMicroenterpriseParticipationsDocs = {
    tags,
    summary: "Participações de microempresas (geral)",
    description: [
        "Lista **todas** as microempresas vencedoras em licitações do município informado, sejam elas locais ou de fora, com um **resumo** de percentuais.",
        "",
        "`codigo_municipio` é **obrigatório**. `codigo_natureza` é opcional. Diferente de `GET /analytics/participacoes-me-locais`, aqui não importa onde a empresa está sediada.",
        upstreamNote,
    ].join("\n"),
    querystring: (0, helpers_1.toJsonSchema)(analytics_schema_1.listGeneralMicroenterpriseParticipationsQuerySchema),
    response: {
        200: (0, helpers_1.object)("Participações e resumo do município.", {
            ...pagination,
            data: {
                type: "array",
                description: "Participações de ME (locais ou não) na página atual.",
                items: (0, helpers_1.object)("Participação de uma ME.", participacaoItemFields),
            },
            resumo: (0, helpers_1.object)("Totais e percentuais do município no período.", {
                total_licitacoes: helpers_1.field.integer("Total de licitações do município.", 120),
                licitacoes_com_me: helpers_1.field.integer("Licitações com ao menos uma ME participando.", 45),
                percentual_licitacoes_com_me: percentual("Parcela das licitações com ME."),
                total_participacoes: helpers_1.field.integer("Total de participações.", 400),
                participacoes_me: helpers_1.field.integer("Participações de ME.", 120),
                percentual_participacoes_me: percentual("Parcela das participações que são de ME."),
                valor_total_vencido: helpers_1.field.money("Valor total vencido no município."),
                valor_vencido_me: helpers_1.field.money("Parte do valor vencida por ME."),
                percentual_valor_vencido_me: percentual("Parcela do valor vencida por ME."),
                itens_vencidos: helpers_1.field.integer("Total de itens vencidos no município.", 500),
                itens_vencidos_me: helpers_1.field.integer("Itens vencidos por ME.", 140),
                percentual_itens_vencidos_me: percentual("Parcela dos itens vencidos por ME."),
            }),
        }),
        ...errors,
    },
};
exports.listGeneralMicroenterpriseParticipationsDocs = listGeneralMicroenterpriseParticipationsDocs;
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
    querystring: (0, helpers_1.toJsonSchema)(analytics_schema_1.listExpensesByNatureQuerySchema),
    response: {
        200: (0, helpers_1.object)("Gastos agrupados por natureza.", {
            data: {
                type: "array",
                description: "Uma linha por natureza.",
                items: (0, helpers_1.object)("Gasto de uma natureza.", {
                    codigo_natureza: helpers_1.field.string("Código da natureza.", "33"),
                    nome_natureza: helpers_1.field.string("Nome da natureza."),
                    valor_total_dotacao: helpers_1.field.money("Soma das dotações da natureza."),
                    quantidade_dotacoes: helpers_1.field.integer("Quantidade de dotações.", 15),
                    quantidade_licitacoes: helpers_1.field.integer("Quantidade de licitações relacionadas.", 8),
                }),
            },
            metrica: helpers_1.field.string("Descrição da métrica usada no cálculo."),
            observacao: helpers_1.field.string("Ressalvas sobre interpretação dos valores."),
        }),
        ...errors,
    },
};
exports.listExpensesByNatureDocs = listExpensesByNatureDocs;
const getMicroenterpriseIndicatorDocs = {
    tags,
    summary: "Indicador de microempresas",
    description: [
        "Devolve **totais consolidados** sobre a participação de microempresas (ME) nas licitações: quantas empresas, quantas licitações e participações, e quanto venceram.",
        "",
        "Todos os filtros são opcionais (município, natureza e período). Sem filtros, o indicador considera todos os dados disponíveis. `porte_considerado` lista os portes de empresa contados como microempresa.",
        upstreamNote,
    ].join("\n"),
    querystring: (0, helpers_1.toJsonSchema)(analytics_schema_1.getMicroenterpriseIndicatorQuerySchema),
    response: {
        200: (0, helpers_1.object)("Indicador consolidado.", {
            data: (0, helpers_1.object)("Totais no filtro informado.", {
                quantidade_microempresas: helpers_1.field.integer("Microempresas distintas que participaram.", 250),
                quantidade_licitacoes: helpers_1.field.integer("Licitações consideradas.", 120),
                quantidade_participacoes: helpers_1.field.integer("Participações das microempresas.", 600),
                valor_total_vencido: helpers_1.field.money("Valor vencido pelas microempresas."),
                quantidade_itens_vencidos: helpers_1.field.integer("Itens vencidos pelas microempresas.", 900),
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
exports.getMicroenterpriseIndicatorDocs = getMicroenterpriseIndicatorDocs;
const listMicroenterpriseParticipationByNatureDocs = {
    tags,
    summary: "Participação de microempresas por natureza",
    description: [
        "Para cada natureza, compara a participação das microempresas com o total: quantas licitações e participações tiveram ME, quanto foi vencido, e os **percentuais** correspondentes.",
        "",
        "Serve para descobrir em quais categorias de compra as microempresas têm mais (ou menos) espaço. Filtros opcionais: município e período.",
        upstreamNote,
    ].join("\n"),
    querystring: (0, helpers_1.toJsonSchema)(analytics_schema_1.listMicroenterpriseParticipationByNatureQuerySchema),
    response: {
        200: (0, helpers_1.object)("Participação de ME por natureza.", {
            data: {
                type: "array",
                description: "Uma linha por natureza.",
                items: (0, helpers_1.object)("Participação de ME em uma natureza.", {
                    codigo_natureza: helpers_1.field.string("Código da natureza.", "33"),
                    nome_natureza: helpers_1.field.string("Nome da natureza."),
                    quantidade_licitacoes: helpers_1.field.integer("Total de licitações.", 120),
                    licitacoes_com_me: helpers_1.field.integer("Licitações com ME.", 30),
                    percentual_licitacoes_com_me: percentual("Parcela das licitações com ME."),
                    quantidade_participacoes: helpers_1.field.integer("Total de participações.", 400),
                    participacoes_me: helpers_1.field.integer("Participações de ME.", 80),
                    percentual_participacoes_me: percentual("Parcela das participações que são de ME."),
                    valor_vencido: helpers_1.field.money("Valor total vencido na natureza."),
                    valor_vencido_me: helpers_1.field.money("Parte do valor vencida por ME."),
                    percentual_valor_vencido_me: percentual("Parcela do valor vencida por ME."),
                }),
            },
        }),
        ...errors,
    },
};
exports.listMicroenterpriseParticipationByNatureDocs = listMicroenterpriseParticipationByNatureDocs;
