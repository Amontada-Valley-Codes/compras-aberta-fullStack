# Auditoria dos usos da API de dados

> Histórico: o fluxo atual de `/analise` está em [ALINHAMENTO-GRAFICOS-ANALISE.md](ALINHAMENTO-GRAFICOS-ANALISE.md).
Conferência em 05/11/2026 do OpenAPI disponível em https://comprasabertas.amontadavalley.com.br/api-dados/openapi.json. O contrato contém 17 operações GET. Esta auditoria amplia o inventário anterior com consumidores do código e amostras reais; não significa que todas as telas foram corrigidas ou testadas de ponta a ponta.

## O que foi constatado

1. **Dados gerados no painel do gestor.** `gestor-publico-data.ts` cria valores, percentuais, fornecedores, CNPJs e datas usando `hash`, `natureBases`, `summaryFor` e `supplierRowsFor`. Esses geradores alimentam `/gestor`, `/gestor/municipios`, `/gestor/municipios/[id]`, `/gestor/fornecedores` e `/gestor/comparativos`. Nessas telas o problema antecede a escolha do endpoint: as métricas não vêm da API. Relatórios possuem um carregamento separado de dados reais; não confundir o gerador de telas com esse carregamento.
2. **Origens diferentes.** `features/dashboard/gestor/gestor-api.ts:7` mantém o padrão `https://compra-aberta-api.onrender.com`. O backend e o catálogo foram atualizados para a origem fornecida. Sem override de `ANALYTICS_API_BASE_URL`, licitações, itens, participações e empresas do gestor continuam usando a origem antiga.
3. **Pagamento e licitação são métricas diferentes.** A mudança anterior em `/analise` usa corretamente endpoints para pagamentos, mas trocou a métrica antes apresentada (valores vencidos e participações em licitações). Não é correto concluir que todos os endpoints anteriores eram errados: eram adequados aos indicadores de licitações explicitamente rotulados como tais. O contrato permite uma página com seções distintas para cada métrica. A métrica de ME locais em licitações não deve ser excluída sob a justificativa de que pagamentos não oferece esse recorte.
4. **Universos diferentes.** O comparativo de classificação inclui itens sem CNPJ e classificação desconhecida. Somar participações identificadas não reproduz necessariamente o universo completo. Esse comparativo ainda não tem service/rota no backend nem consumidor no front.
5. **Tipos desatualizados.** `DetailedBid` considera ano/natureza obrigatórios e não nulos, embora o Swagger permita ausência/null; o `cnpj` dessa resposta é obrigatório e string no contrato. `ParticipationByNatureResponse` omite `associacao`, `observacao` e métricas de itens. `ApiBidItem` considera quantidade/valores sempre string, embora o contrato permita ausência/null. Essas divergências não foram corrigidas nesta auditoria.
6. **Cobertura parcial pode parecer completa.** `getAllPages` em `gestor-api.ts` retorna silenciosamente ao atingir maxPages; `loadNatureMap` limita a 3.000 linhas. A ausência de sinalização pode produzir totais parciais em bases maiores.

## Matriz de finalidade e uso

| Operação GET | Dado apropriado | Uso encontrado / conclusão |
| --- | --- | --- |
| `/health` | Disponibilidade da API | Não alimenta métricas; ausência de consumidor de negócio é normal. |
| `/municipios` | Catálogo e conversão IBGE/TCE | `listMunicipalityCodesService`; finalidade correta. Backend `/municipios` é outra fonte, com IDs IBGE; não confundir os dois contratos. |
| `/licitacoes` | Processos, valores de licitação e data de realização | `loadBids`: adequado para listagens e relatórios de licitações. Não é fonte de valor pago. |
| `/licitacoes/{codigo_municipio}/{numero_licitacao}/dotacoes` | Dotações de uma licitação | Sem consumidor encontrado. Não é obrigatório consumir todas as operações. |
| `/licitacoes/{codigo_municipio}/{numero_licitacao}/itens` | Itens da licitação e vencedores informados | `loadBidItems`: adequado para detalhes. Tipos de campos opcionais precisam alinhamento; comportamento de números com barra exige teste específico da API. |
| `/participacoes` | Vencedores e valores vencidos identificados | `loadParticipations` e `loadParticipationsByCnpj`: adequados para histórico de vitórias e fornecedores. Não representa todos os participantes da disputa nem pagamento; ano é filtrado localmente. |
| `/empresas` | Cadastro de fornecedores | `loadCompanyDirectory`: adequado para nomes, porte e localização cadastrada. Não contém pagamentos; classificação não equivale automaticamente à classificação verificada do comparativo. |
| `/analytics/licitacoes-detalhadas` | Licitação, natureza e vencedora na mesma linha | Backend/service e `loadNatureMap`: adequado para associação, quando disponível. Não restringe porte a ME e não deve ser somado entre naturezas como total sem deduplicação. Tabela anterior de /analise usava essa rota sob título de ME. |
| `/analytics/participacoes-me-locais` | ME vencedoras sediadas no município e resumo | Relatórios: finalidade correta para licitações. Não representa dinheiro efetivamente pago a ME locais. |
| `/analytics/participacoes-me-gerais` | Todas as ME vencedoras no município e resumo | Relatórios: finalidade correta para licitações; não inclui EPP automaticamente. |
| `/analytics/gastos-por-natureza` | Dotação associada por natureza | Gestor e relatórios: adequado quando rotulado como dotação. O nome “gastos” da rota não autoriza tratá-lo como pagamento. |
| `/analytics/microempresas` | Contagens e valores vencidos de ME | Service disponível; sem chamada ativa encontrada após a mudança em /analise. É fonte adequada para indicadores de ME vencedoras. |
| `/analytics/comparativo-classificacao` | Universo de itens e divisão ME/MEI/EPP/outros/desconhecidos | Não integrado. É a operação documentada para comparação de classificações de vencedores, incluindo desconhecidos; não para composição dos pagamentos. |
| `/analytics/participacao-me-por-natureza` | Presença de ME nas licitações por natureza | Relatórios: finalidade correta; valores se repetem nas naturezas associadas. Não é uma distribuição exclusiva nem financeiro pago. |
| `/analytics/pagamentos/resumo` | Total pago e subtotal ME por natureza, coleta e pendências | /analise refatorada: adequado para indicadores e gráficos de pagamentos. Município e exercício obrigatórios. |
| `/analytics/pagamentos/fornecedores` | Pagamento por fornecedor e natureza | /analise e CSV: adequado; default ME, categoria vazia retorna todas. Não tem número da licitação nem localização do fornecedor. |
| `/` | Raiz do serviço | Não alimenta métricas. |

## Amostras reais: Amontada, TCE 010, exercício/ano 2025

Consultadas dez operações de dados de licitação/classificação, além das evidências de pagamentos da refatoração anterior. Todas as dez responderam HTTP 200 via curl. Não foi feita varredura completa de empresas, itens ou participações.

- `/analytics/microempresas`: 77 ME distintas; 73 licitações; 90 participações; R$ 48.944.242,81 vencidos; 969 itens.
- `/analytics/participacoes-me-gerais`, limit=1: resumo com os mesmos 90 registros e R$ 48.944.242,81 de ME, total vencido identificado de R$ 125.542.949,35; o resumo não se restringe à linha retornada.
- `/analytics/participacoes-me-locais`, limit=1: 8 participações de ME locais; R$ 3.974.446,11; 3,17% do valor vencido identificado.
- `/analytics/comparativo-classificacao`: universo R$ 126.441.749,35, incluindo itens não abrangidos pelas participações identificadas; ME R$ 48.944.242,81. O denominador não é igual ao resumo de participações.
- `/analytics/licitacoes-detalhadas`, `/analytics/gastos-por-natureza` e `/analytics/participacao-me-por-natureza`: `data=[]` para esse município/ano, apesar de haver licitações e pagamentos. Arrays vazios não comprovam ausência de compras: existe diferença de cobertura/associação por natureza.
- A evidência anterior dos pagamentos: R$ 100.312.702,96 total; R$ 24.107.313,94 de ME; 24,03%, com referências de pagamentos 202501–202610. Esses números não devem coincidir com os valores vencidos nas licitações de 2025.

## Limites da auditoria

A escolha do endpoint depende da pergunta do indicador: dotação, valor vencido, pagamento, classificação ou sede da vencedora. Não se deve migrar toda a aplicação para pagamentos indiscriminadamente. A prioridade para uma próxima implementação é substituir os geradores das telas do gestor, unificar a origem e preservar as métricas de licitações em seções identificadas. Nenhuma alteração adicional de comportamento foi feita neste turno; os achados foram documentados para separar auditoria de correção.
