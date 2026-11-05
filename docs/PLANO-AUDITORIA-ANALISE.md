# Plano de auditoria da integração de /analise

## Objetivo e escopo

Estudar todas as operações, parâmetros e schemas do Swagger fornecido e corrigir inicialmente apenas o fluxo `/analise`: filtros, indicadores, gráficos, tabela, paginação e exportações associadas. Usar nas consultas municipais somente a cidade com dados indicada pelo usuário, cujo nome começa com A; nome e códigos ainda precisam ser confirmados. Não presumir qual cidade é nem escolher um código TCE por tentativa.

Trabalhar na branch `refactor/data-dashboard`, preservando as alterações recuperadas do stash e outras alterações locais existentes.

## Evidências iniciais

- Em 04/11/2026, `https://comprasabertas.amontadavalley.com.br/api-dados/docs` retornou HTTP 404 com HTML da aplicação, sem Swagger. `/docs/` redirecionou para o endereço sem barra. Os candidatos `/api-dados/openapi.json` e `/api-dados/swagger.json` também retornaram HTTP 404.
- Uma consulta exploratória à rota `/api-dados/analytics/microempresas` também retornou a mesma página 404. Ela não valida dados municipais e não deve ser usada como evidência de ausência de dados de uma cidade.
- Em 05/11/2026 o usuário forneceu a transcrição do Swagger 1.0.0 / OAS 3.1, com 17 operações GET. O inventário e as divergências semânticas identificadas estão em [CONTRATO-API-DADOS.md](CONTRATO-API-DADOS.md). O JSON original e respostas reais de sucesso ainda não foram obtidos.
- O backend tem como padrão `API_DADOS=https://compra-aberta-api.onrender.com`. Isso é configuração padrão do código, não comprovação do endereço efetivamente usado na execução. Conferir a origem configurada sem expor segredos.

## Mapa da implementação atual

As seis rotas abaixo existem no contrato transcrito, com parâmetros compatíveis. A comparação semântica está no inventário; a validação dos valores continua pendente.

| Conteúdo em /analise | Rota /analytics atual | Filtros enviados | Campos consumidos |
| --- | --- | --- | --- |
| Valor homologado e participações de ME | `/microempresas` | `codigo_municipio`, `codigo_natureza`, `data_inicio`, `data_fim` | `data.valor_total_vencido`, `data.quantidade_participacoes` |
| Valor e percentual de compras com ME locais | `/participacoes-me-locais` | `codigo_municipio`, `codigo_natureza`, `ano`, `limit=1` | `resumo.valor_vencido_me_local`, `resumo.percentual_valor_vencido_me_local` |
| Valor e percentual de compras com ME em geral | `/participacoes-me-gerais` | `codigo_municipio`, `codigo_natureza`, `ano`, `limit=1` | `resumo.valor_vencido_me`, `resumo.percentual_valor_vencido_me` |
| Compras por natureza e destaque | `/gastos-por-natureza` | `codigo_municipio`, `data_inicio`, `data_fim` | `data[].valor_total_dotacao` |
| Participação e valor de ME por natureza | `/participacao-me-por-natureza` | `codigo_municipio`, `data_inicio`, `data_fim` | `percentual_participacoes_me`, `valor_vencido_me` por natureza |
| Tabela e CSV de licitações | `/licitacoes-detalhadas` | `codigo_municipio`, `codigo_natureza`, `ano`, `limit`, `offset` | Empresa, CNPJ, natureza, ano e valor vencido |

Pontos de entrada: `apps/frontend/src/app/analise/page.tsx`, `apps/frontend/src/features/public-data/public-data.ts`, `apps/frontend/src/features/analysis/MunicipalityAnalysisPage.tsx`, `apps/frontend/src/services/analytics/` e `apps/backend/src/modules/analytics/`.

## Sequência de execução

1. **Obter e registrar o contrato.** Confirmar endereço acessível do Swagger ou receber o arquivo OpenAPI. Inventariar todas as operações com método, caminho, finalidade, autenticação, parâmetros obrigatórios/opcionais, tipos, formatos, enums, defaults, limites, paginação, schemas de sucesso e erros. Registrar versão ou hash do documento. Distinguir rotas relevantes para análise das demais rotas documentadas.
2. **Fixar o município de referência.** Confirmar nome, código IBGE e código TCE pelo catálogo. A URL da página usa IBGE e a integração atual converte para TCE. Confirmar qual identificador cada rota exige e quais anos realmente têm dados. Não tratar retorno vazio em ano sem cobertura como erro de integração.
3. **Construir a matriz de divergências.** Para cada indicador, registrar texto da interface, métrica pretendida, operação correta do Swagger, filtros, campo de resposta, unidade, população considerada, período e divergência comprovada. Registrar também quando o mapeamento atual estiver correto.
4. **Consultar a API e guardar evidências.** Executar somente operações de leitura relevantes a `/analise`, com a cidade confirmada. Cobrir todos os tipos de parâmetros aplicáveis e todos os códigos de natureza documentados. Registrar requisição, status, duração, resumo da resposta e resultado esperado/observado. Não executar operações de escrita só porque aparecem no Swagger.
5. **Corrigir a integração.** Ajustar rotas, validações e tipos do frontend/backend conforme o contrato; depois carregamento, seletores e textos da tela. Se módulos compartilhados forem alterados, verificar seus outros consumidores para evitar regressões fora de `/analise`.
6. **Conferir a tela e exportações.** Comparar cada valor exibido com a resposta capturada para o mesmo município, período e natureza. Validar tabela, filtros, paginação, CSV e exportação dos gráficos quando disponíveis. Executar as verificações de tipos/build apropriadas e testes focados nas divergências corrigidas.

## Matriz de testes

| Grupo | Casos | Conferência |
| --- | --- | --- |
| Município | Cidade confirmada; IBGE → TCE; identificador inválido em validação local | Código exigido pelo contrato; filtro não pode desaparecer e ampliar a consulta silenciosamente |
| Período | Cada ano disponível; limites de datas; período vazio; datas invertidas em validação local | Se `ano` e intervalo de datas usam o mesmo evento temporal; sem comparação entre bases diferentes |
| Natureza | Todas juntas e cada código documentado | Filtro aplicado conforme suporte da operação; sem limitar a enum aos sete códigos atuais sem conferir o contrato |
| Paginação | Primeira, intermediária e última página; offsets e limites suportados | Sem perdas ou duplicações; próxima página e CSV completos |
| Resumo | Mesmos filtros com `limit=1` e outro limite permitido | Confirmar se `resumo` cobre o conjunto filtrado ou apenas a página |
| Métricas | Valores, participações, licitações e empresas distintas | Unidades e denominadores corretos; ME, EPP e MPE conforme definição da API |
| Ausência e erros | Zero real, array vazio, percentual nulo, erro HTTP e timeout | Distinguir ausência de cobertura, zero e falha de consulta; não mascarar erro como valor financeiro zero |
| Interface | Filtro → requisição → resposta → indicador/gráfico/tabela → exportação | Mesmo recorte e mesma métrica em todo o fluxo |

## Hipóteses a verificar

- A tela chama dotação orçamentária de “compras”: verificar se há operação de gasto efetivo/homologado mais adequada ou se o texto precisa explicitar orçamento.
- Algumas operações recebem `ano`, outras recebem datas. Conferir qual data/evento rege cada filtro antes de reconciliar totais.
- A tabela é apresentada como vencedoras microempresas, mas usa licitações detalhadas sem filtro explícito de porte. Verificar se a operação já restringe o porte.
- Os gráficos acrescentam naturezas ausentes com zero. Confirmar se ausência de linha significa zero ou informação indisponível.
- Os resumos locais e gerais são solicitados com `limit=1`. Verificar o escopo das agregações.
- O filtro de natureza é aplicado localmente em alguns gráficos e enviado para outras operações. Conferir a consistência do recorte, inclusive no destaque de maior dotação.
- Não exigir igualdade entre somas de endpoints sem confirmar mesma população, deduplicação, datas e abrangência de naturezas. Depois disso, reconciliar valores com a precisão monetária e arredondamento documentados.

## Critérios de conclusão

- Todas as operações do Swagger inventariadas; operações relevantes a `/analise` com mapeamento justificado.
- Cidade e período de referência confirmados; consultas reproduzíveis e resultados registrados.
- Cada divergência confirmada corrigida e verificada; limitações da API identificadas separadamente.
- Indicadores, gráficos, tabela e exportações consistentes com a fonte para o mesmo recorte.
- Nenhuma alteração de integração baseada apenas em hipótese; verificações apropriadas concluídas e pendências explícitas.

## Pendências atuais

O inventário das 17 operações e a comparação inicial com a implementação estão registrados. Confirmar o endereço funcional da API e o nome da cidade com dados para executar as consultas municipais e validar as correções. A transcrição já permite preparar o alinhamento de tipos e textos; alterações de fonte de dados precisam preservar a distinção entre dotação, valor vencido e pagamento efetivo.
