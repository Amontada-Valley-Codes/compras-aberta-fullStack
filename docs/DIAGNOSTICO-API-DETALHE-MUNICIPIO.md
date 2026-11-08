# Diagnóstico e integração da visão detalhada do município

Verificação ao vivo em 08/11/2026 do Swagger e de respostas da origem `https://comprasabertas.amontadavalley.com.br/api-dados`.

## Causas identificadas

1. A visão detalhada estava usando `getMunicipalitySummaries` e `getSupplierSummaries` de `gestor-publico-data.ts`, geradores do protótipo. Ajustes de layout não conectavam esses gráficos à API. A descrição anterior de validação visual referia-se à apresentação, não à existência de integração real.
2. As operações `/analytics/gastos-por-natureza` e `/analytics/participacao-me-por-natureza` estão acessíveis, mas retornam HTTP 200 com `data=[]` para Amontada nos anos 2024, 2025 e 2026 e também sem nenhum filtro. Esse dado ausente na origem não pode ser criado pela interface.
3. O contrato distingue dotação vinculada à licitação, valor vencido e pagamento efetivo. A existência de pagamentos por natureza não comprova que a API tenha as dotações das licitações.

## Evidência por exercício — Amontada, IBGE 2300754, TCE 010

| Ano | Dotações por natureza | Participação por natureza | ME vencedoras distintas | Participações vencedoras ME | Valor vencido por ME | Pagamentos por natureza | Total pago |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2024 | 0 linhas | 0 linhas | 51 | 62 | R$ 20.653.658,72 | 7 linhas | R$ 82.698.951,93 |
| 2025 | 0 linhas | 0 linhas | 77 | 90 | R$ 48.944.242,81 | 7 linhas | R$ 100.312.702,96 |
| 2026 | 0 linhas | 0 linhas | 37 | 43 | R$ 9.595.752,22 | 7 linhas | R$ 76.617.551,12 |

O total de pagamentos é por orçamento do exercício e janela de referências da coleta. Não é uma série de pagamentos feitos apenas entre janeiro e dezembro daquele ano. As observações da API e os metadados da coleta precisam acompanhar a visualização.

## Correção aplicada somente ao detalhe municipal

- `/gestor/municipios/[id]` resolve o IBGE pelo catálogo e carrega dados pelo backend e pelos services existentes. Os geradores de números e fornecedores foram retirados desse fluxo.
- O ano passa pela URL e provoca nova consulta no servidor. A compatibilidade da antiga página `/gestor-publico/municipios/[id]` foi mantida; o controle de acesso existente não foi alterado.
- Compras analisadas e participação ME: resumo de `/analytics/participacoes-me-gerais`. Compras locais: resumo de `/analytics/participacoes-me-locais`, explicitamente apenas ME locais. Contagem de fornecedores ME: `/analytics/microempresas`.
- A lista de ME vencedoras é paginada até `resumo.participacoes_me`; falha em uma página resulta em indisponibilidade da agregação, em vez de total parcial apresentado como completo.
- Evolução mensal: valor vencido por ME, agrupado pelo mês de realização da licitação. Não são pagamentos mensais. Registros sem data não são distribuídos artificialmente entre meses.
- Origem dos fornecedores: sede das ME na própria resposta da API, separando local, outro município do Ceará, outro estado e origem desconhecida. Não utiliza a classificação regional inventada pelo protótipo.
- “Compras por natureza da despesa” mantém o título e disponibiliza um seletor explícito de base: **Dotações associadas às licitações** ou **Pagamentos efetivos**. A opção inicial é dotação. Se não houver dotações, mostra a ausência de dados e oferece um botão para escolher os pagamentos disponíveis. Não há substituição silenciosa.
- Histórico de natureza usa a mesma base escolhida no seletor. Falha ou natureza ausente em um ano é `null`/indisponível; zero retornado pela fonte permanece zero.
- Pagamentos exibem observação, coleta, referências, conciliação e pendências. Os indicadores de licitações não mudam de universo ao trocar a base do gráfico.

## Validação

- Testes automatizados do detalhe: separação das bases, código TCE, paginação de mais de 100 registros, agregação mensal, origem local, ausência versus zero, falha parcial de paginação e falhas independentes das fontes.
- Testes existentes de `/analise` continuaram passando.
- Lint dos arquivos novos/alterados de integração passou.
- Validação no navegador em prévia temporária do componente com dados reais: 7 naturezas de pagamento somando R$ 100.312.702,96; 77 fornecedores ME agrupados; soma mensal ME igual a R$ 48.944.242,81 em 2025; histórico de pagamentos com os anos 2024, 2025 e 2026. A prévia não altera nem contorna a autenticação das rotas de gestor e foi removida após os testes.
- A indisponibilidade das dotações continua sendo uma limitação da API externa. Confirmar coleta/importação ausente ou defeito de JOIN/filtro exige acesso ao código ou banco da API de dados, que não está neste repositório.

## Configuração local de APIs

- Backend `.env`: `API_DADOS=https://comprasabertas.amontadavalley.com.br/api-dados`, `PORT=3333`.
- Frontend `.env`: `API_BASE_URL=http://localhost:3333` e `ANALYTICS_API_BASE_URL=https://comprasabertas.amontadavalley.com.br/api-dados` (adicionada explicitamente).
- O endereço padrão antigo no Render em `gestor-api.ts` foi substituído pela origem atual. Sem essa correção, algumas telas do gestor podiam consultar uma origem diferente do catálogo/backend.
- Comparados os JSONs da API externa e do backend local para gastos-por-natureza e pagamentos/resumo de Amontada/2025: idênticos. O retorno vazio de dotações é da origem, não do encaminhamento local.
- As variáveis do servidor de produção não foram inspecionadas. O template systemd usa porta interna 3001 para o backend; isso é uma configuração de implantação, distinta da porta local 3333.
- Typecheck global continua bloqueado pelos nomes ausentes de relatórios já existentes em `GestorPublicoViews.tsx`; não restaram erros de tipos nos novos módulos do detalhe.
