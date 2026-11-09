# Refatoração de /analise — pagamentos

> Substituído pelo fluxo de pagamentos confirmado pelo usuário: [FONTE-PAGAMENTOS-GRAFICOS.md](FONTE-PAGAMENTOS-GRAFICOS.md).
> Histórico: o fluxo atual de `/analise` está em [ALINHAMENTO-GRAFICOS-ANALISE.md](ALINHAMENTO-GRAFICOS-ANALISE.md).
Contrato consultado em 05/11/2026: https://comprasabertas.amontadavalley.com.br/api-dados/docs.

OpenAPI 3.1.0, versão 1.0.0. SHA-256 do JSON: `ccaa20b8fddc1bdb10b80d0843224852d82f79af4520d66796ba2c991b9cae7f`.

## Inventário completo

| Método | Operação | Parâmetros de consulta (* obrigatório) |
| --- | --- | --- |
| GET | `/health` |  |
| GET | `/municipios` | uf (string/null); limit (integer, default=100, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/licitacoes` | codigo_municipio (string/null); codigo_natureza (string/null); data_inicio (string/null); data_fim (string/null); limit (integer, default=50, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/licitacoes/{codigo_municipio}/{numero_licitacao}/dotacoes` | limit (integer, default=100, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/licitacoes/{codigo_municipio}/{numero_licitacao}/itens` | limit (integer, default=100, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/participacoes` | codigo_municipio (string/null); porte_empresa (string/null); cnpj (string/null); limit (integer, default=50, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/empresas` | porte_empresa (string/null); cnae_principal (string/null); limit (integer, default=50, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/analytics/licitacoes-detalhadas` | codigo_municipio (string/null); codigo_natureza (string/null); ano (integer/null); limit (integer, default=100, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/analytics/participacoes-me-locais` | codigo_municipio* (string, minLength=1, maxLength=20); codigo_natureza (string/null); ano (integer/null); limit (integer, default=100, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/analytics/participacoes-me-gerais` | codigo_municipio* (string, minLength=1, maxLength=20); codigo_natureza (string/null); ano (integer/null); limit (integer, default=100, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/analytics/gastos-por-natureza` | codigo_municipio (string/null); data_inicio (string/null); data_fim (string/null) |
| GET | `/analytics/microempresas` | codigo_municipio (string/null); codigo_natureza (string/null); data_inicio (string/null); data_fim (string/null) |
| GET | `/analytics/comparativo-classificacao` | codigo_municipio (string/null); data_inicio (string/null); data_fim (string/null) |
| GET | `/analytics/participacao-me-por-natureza` | codigo_municipio (string/null); data_inicio (string/null); data_fim (string/null) |
| GET | `/analytics/pagamentos/resumo` | codigo_municipio* (string, minLength=3, maxLength=3); ano* (integer, minimum=2000, maximum=2100); coleta_id (integer/null) |
| GET | `/analytics/pagamentos/fornecedores` | codigo_municipio* (string, minLength=3, maxLength=3); ano* (integer, minimum=2000, maximum=2100); codigo_natureza (string/null); categoria_porte (string/null, default=ME); coleta_id (integer/null); limit (integer, default=100, minimum=1, maximum=100); offset (integer, default=0, minimum=0) |
| GET | `/` |  |

## Divergências corrigidas

- Origem padrão antiga no Render substituída por `/api-dados` no backend e catálogo do frontend. A configuração local `API_DADOS` também foi atualizada; ambientes publicados precisam configurar essa variável com a nova origem.
- Dotações e valores vencidos não representam pagamentos. Os indicadores e os quatro gráficos agora usam exclusivamente `/analytics/pagamentos/resumo`.
- A tabela de licitações não restringia os vencedores a ME. A nova tabela e o CSV usam `/analytics/pagamentos/fornecedores`, com `categoria_porte=ME`.
- A API exige município e exercício nos pagamentos. Sem município a página pede seleção; não inventa agregado estadual. IBGE continua na URL e é convertido para TCE pelo catálogo, preservando os três caracteres.
- O recorte de ME locais das licitações foi retirado da análise de pagamentos porque os novos endpoints não fornecem essa dimensão.
- Resumo e fornecedores usam o mesmo `coleta_id`. O CSV mantém essa coleta durante toda a exportação.
- Paginação de 100 linhas consulta a existência da linha seguinte; o seletor passa a dizer 100, em vez de Todos.
- Percentuais nulos não viram zero. Gráficos de pagamentos usam as naturezas efetivamente retornadas, sem fabricar linhas ausentes.
- O ano representa o exercício orçamentário. A observação e as referências da coleta aparecem na página para explicar pagamentos posteriores ao exercício.
- Filtro de natureza é aplicado em todos os indicadores/gráficos e enviado à tabela/CSV. O resumo da API não aceita natureza: a seleção ocorre nas linhas da resposta.

## Verificação

- Catálogo: Amontada, IBGE 2300754, TCE 010. Coleta 26, exercício 2025.
- Total pago: R$ 100.312.702,96; ME: R$ 24.107.313,94; percentual: 24,03%. HTML servido conferido com a resposta real.
- Somatórios das naturezas reconciliados em decimal com total_controle e total_me. CSV completo: 120 linhas, soma igual ao subtotal ME.
- Teste backend: rotas, parâmetros, código com zero, categoria vazia, padrão ME, cache, limites inválidos e erro upstream 502.
- Teste frontend: conversão IBGE/TCE, coleta fixa, filtro de natureza, próxima página com limite 100, município ausente/inválido, CSV completo, proteção contra fórmula e falha de resumo.
- Typecheck/build do backend e lint dos arquivos alterados passaram. Prisma foi regenerado para atualizar o cliente local.
- Verificações globais do frontend encontram erros preexistentes em GestorPublicoViews.tsx (ReportSections, DEFAULT_REPORT_SECTIONS, ReportFilters) e erros de pureza com Date.now em módulos de agenda/assistente. Não houve alterações nesses módulos.
- O teste no navegador via conector não foi autorizado pelo ambiente; a renderização foi conferida por HTTP. Interações e aparência visual dos gráficos não foram verificadas por navegador.

Os demais endpoints do inventário continuam disponíveis para seus consumidores. Dados de licitações e dados de pagamentos permanecem semanticamente distintos.
