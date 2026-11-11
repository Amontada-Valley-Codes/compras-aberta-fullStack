# /analise — endpoint correspondente à métrica do gráfico

> Substituído pelo fluxo de pagamentos confirmado pelo usuário: [FONTE-PAGAMENTOS-GRAFICOS.md](FONTE-PAGAMENTOS-GRAFICOS.md).
Estado final em 05/11/2026. Este alinhamento substitui a migração anterior de todos os gráficos para pagamentos. O escopo é somente `/analise` e sua exportação.

| Elemento | Operação da API de dados | Campo usado |
| --- | --- | --- |
| Indicador de valor vencido por ME | `/analytics/microempresas` | `data.valor_total_vencido` |
| Indicador de participações vencedoras | `/analytics/microempresas` | `data.quantidade_participacoes` |
| Indicador e percentual de ME locais | `/analytics/participacoes-me-locais` | `resumo.valor_vencido_me_local`, `resumo.percentual_valor_vencido_me_local` |
| Percentual de ME de qualquer origem | `/analytics/participacoes-me-gerais` | `resumo.valor_vencido_me`, `resumo.percentual_valor_vencido_me` |
| Dotação por natureza da despesa e destaque | `/analytics/gastos-por-natureza` | `data[].valor_total_dotacao` |
| Valor vencido por ME por natureza | `/analytics/participacao-me-por-natureza` | `data[].valor_vencido_me` |
| Participações vencedoras de ME por natureza | `/analytics/participacao-me-por-natureza` | `data[].percentual_participacoes_me` |
| Tabela e CSV de licitações com ME | `/analytics/participacoes-me-gerais` | Licitação, empresa, CNPJ, município, data, valor e itens vencidos |

## Regras aplicadas

- O conteúdo original dos gráficos foi preservado: dotação, valores vencidos e participações em licitações. Os endpoints de pagamentos não alimentam esses gráficos.
- Cada operação passa pelo service e pela validação já existentes no frontend/backend. Natureza e ano são enviados quando aceitos pela operação; operações por período recebem 01/01–31/12. Natureza é selecionada nas linhas quando o endpoint não aceita esse parâmetro.
- A URL mantém o código IBGE; o catálogo fornece o código TCE usado nas consultas. Município inválido bloqueia a consulta; sem seleção, somente operações que suportam consulta geral são chamadas.
- Valores vencidos por natureza não são somados para fabricar um total: uma licitação pode estar associada a várias naturezas. A observação da API aparece junto do gráfico, inclusive quando não há linhas.
- Os seletores de `/analise` não acrescentam naturezas ausentes com zero. Percentual nulo permanece sem base de cálculo; zero real continua válido. O comportamento dos seletores do restante do projeto não foi alterado.
- A tabela usa o endpoint que restringe o porte a ME. Não busca licitações detalhadas de todos os portes sob o título de microempresas. Natureza individual não é inventada na tabela: o endpoint aplica esse filtro, mas não retorna esse campo na linha.
- A próxima página é calculada com `resumo.participacoes_me`, inclusive com 100 linhas por página. O CSV percorre todas as páginas do mesmo filtro e mantém a proteção contra fórmulas de planilha.
- Exportações explícitas `tipo=pagamentos` continuam usando a fonte de pagamentos. `tipo=licitacoes` volta a exportar vencedoras de licitações. Cada tipo tem cabeçalhos e valores da própria métrica.
- A grade dos dois gráficos de percentual se adapta à largura do cartão, evitando sobreposição dos botões Gráfico/Tabela.

## Testes e evidências

- `npm run test:analytics --workspace=frontend`: filtros, cinco fontes distintas, campos monetários, natureza ausente, percentual nulo/zero, município inválido, consulta geral, paginação, falhas independentes e CSV de todas as páginas.
- `npm run test:analytics --workspace=backend`: contratos de pagamentos preservados e encaminhamento dos cinco endpoints de licitações usados em `/analise`, observações e rejeição de período invertido.
- Build/typecheck do backend e lint dos arquivos de `/analise` passaram.
- Typecheck global do frontend continua apontando apenas os erros preexistentes de relatórios em `GestorPublicoViews.tsx`; não foram alterados neste escopo.
- Playwright com dados reais de Amontada (IBGE 2300754, TCE 010), ano 2025: R$ 48.944.242,81 vencidos por ME, 90 participações vencedoras, R$ 3.974.446,11 de ME locais. Percentuais exibidos: 3,17% local e 38,99% geral.
- Navegador: alternância Gráfico/Tabela, ordenação, segunda página, troca para 100 linhas e última página (90 linhas, sem próxima página) verificadas. CSV com 90 registros, soma em centavos de 4.894.424.281, igual ao indicador da API. Console sem erros de aplicação.
- A API retornou `data=[]` em dotações e participação por natureza para esse recorte. A interface informa ausência de associação por natureza, sem afirmar que não existem licitações e sem substituir os dados pelos pagamentos.

Os documentos anteriores de pagamentos e auditoria são históricos; a matriz acima descreve o fluxo atual de `/analise`.
