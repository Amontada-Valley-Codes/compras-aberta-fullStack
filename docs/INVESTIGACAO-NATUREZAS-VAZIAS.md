# Por que /analise mostra ausência de dados por natureza

Verificação direta em 05/11/2026, usando a origem configurada no backend: `https://comprasabertas.amontadavalley.com.br/api-dados`.

## Conclusão comprovada

A API de dados retorna HTTP 200 com `data: []` nas operações que dependem da associação de licitações a dotações/naturezas. O backend local repassa a mesma resposta; não há transformação local removendo naturezas. O frontend exibe o estado vazio porque não recebeu linhas para construir as séries.

O contrato descreve `/analytics/gastos-por-natureza` como agregação de dotações associadas à contratação e `/analytics/participacao-me-por-natureza` como associação no nível da licitação. As duas operações precisam de dados de classificação associados às licitações.

## Consultas de controle

| Consulta | Resultado |
| --- | --- |
| `/health` | HTTP 200, status ok |
| `/municipios?limit=100` | Amontada = IBGE 2300754, TCE 010 |
| `/analytics/gastos-por-natureza?codigo_municipio=010&data_inicio=2025-01-01&data_fim=2025-12-31` | HTTP 200, data vazio |
| Mesma operação, período 2026 | HTTP 200, data vazio |
| Mesma operação, município 010 sem período | HTTP 200, data vazio |
| `/analytics/gastos-por-natureza` sem filtros | HTTP 200, data vazio |
| `/analytics/participacao-me-por-natureza?codigo_municipio=010&data_inicio=2025-01-01&data_fim=2025-12-31` | HTTP 200, data vazio |
| `/analytics/participacao-me-por-natureza` sem filtros | HTTP 200, data vazio |
| `/licitacoes` de Amontada, período 2025, limit=100, offset=0 e 100 | 186 licitações retornadas; todas com naturezas_despesa vazio |
| `/licitacoes` de Amontada/2025 com codigo_natureza=30 | HTTP 200, data vazio |
| `/licitacoes/010/{numero}/dotacoes` para as cinco primeiras licitações de 2025 | HTTP 200, data vazio nas cinco |
| `/analytics/microempresas` de Amontada/2025 | 77 ME, 90 participações vencedoras, R$ 48.944.242,81 vencidos |
| `/analytics/pagamentos/resumo?codigo_municipio=010&ano=2025` | 7 linhas de natureza; coleta 26; total_controle R$ 100.312.702,96 |
| Backend local: gastos-por-natureza com os mesmos filtros de 2025 | JSON idêntico ao da API externa |
| Backend local: participacao-me-por-natureza com os mesmos filtros de 2025 | JSON idêntico ao da API externa |

As cinco licitações verificadas individualmente: `301201202502`, `291201202508`, `291201202505`, `231201202505`, `231201202502`. Todas retornaram a listagem de dotações vazia. A ordenação/dados da API podem ser atualizados após esta verificação.

## Interpretação

- Não é apenas um ano sem cobertura: retirar período e município continua retornando vazio.
- Não é troca IBGE/TCE: o catálogo confirma 010 e as operações de licitações/ME retornam dados nesse código.
- Não é cache ou filtro do frontend: a resposta direta da origem já está vazia e o backend local retorna o mesmo JSON.
- Ter pagamentos classificados por natureza não implica ter dotações associadas a licitações. São operações e métricas diferentes. Usar valores pagos nos gráficos de valores vencidos ou dotações produziria informação incorreta.
- A frase “Quando uma licitacao possui varias naturezas...” vem do campo `observacao` retornado junto com `data: []`. É uma ressalva metodológica da operação, não a explicação do retorno vazio.

## Onde investigar a correção na fonte

A evidência indica ausência de dotações/associações disponíveis pela API. Verificar a rotina de coleta/importação de dotações, a persistência de `codigo_natureza` e o vínculo por município/número da licitação nas consultas da API externa. A API pública sozinha não permite distinguir tabela ainda não alimentada de erro de importação ou de JOIN/filtro no serviço.

Este repositório contém o proxy Fastify e a interface, mas não a implementação da API de dados nem suas tabelas de dotações. Por isso não foi aplicada uma correção especulativa nos gráficos. Nenhum processo de desenvolvimento foi iniciado ou encerrado nesta investigação.
