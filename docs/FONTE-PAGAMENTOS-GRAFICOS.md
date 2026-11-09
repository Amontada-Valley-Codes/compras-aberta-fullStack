# Fonte atual dos gráficos: pagamentos

Atualização do escopo após confirmação do usuário: os valores financeiros de `/analise` e `/gestor/municipios/[id]` usam somente as operações de pagamentos. Esta decisão substitui os mapeamentos anteriores de dotações e licitações nesses dois fluxos.

## Operações usadas

- `GET /analytics/pagamentos/resumo`: total pago de controle, subtotal ME, percentual ME, valores e quantidade de pagamentos por natureza, observação, coleta, conciliação e pendências. Município TCE e exercício são obrigatórios. Não usa parâmetros de data.
- `GET /analytics/pagamentos/fornecedores`: valor pago e quantidade de pagamentos por fornecedor/natureza. Recebe o `coleta_id` do resumo. `categoria_porte=ME` mantém o recorte da tabela pública de ME; `categoria_porte=` consulta todos os portes na visão detalhada do município.

O catálogo continua sendo usado para converter o município IBGE da URL no código TCE exigido pela API. Não é uma fonte financeira adicional.

## Mapeamento

| Informação | Resposta usada |
| --- | --- |
| Compras por natureza da despesa | `resumo.data[].total_controle` |
| Valor de compra para ME por natureza | `resumo.data[].valor_me` |
| Participação de ME por natureza | `resumo.data[].percentual_me` (percentual financeiro, não número de vencedoras) |
| Total de compras analisadas | `resumo.total_controle` |
| Valor para ME | `resumo.total_me` |
| Percentual geral de ME | `resumo.percentual_me` |
| Histórico por natureza | `total_controle` da mesma natureza em cada exercício, pela coleta de cada ano |
| Tabela e CSV públicos | Fornecedores ME por natureza, na mesma coleta do resumo |
| Fornecedores da visão detalhada | Todos os portes; paginação completa e agrupamento por documento, sem duplicar o fornecedor entre naturezas |

Quando há filtro de natureza na URL, os indicadores usam a linha correspondente do resumo e o filtro é enviado à listagem/CSV. Ausência de uma natureza ou falha em um exercício não é convertida em zero; zero explicitamente retornado permanece zero.

## Fontes retiradas destes fluxos

- `/analytics/gastos-por-natureza`
- `/analytics/participacao-me-por-natureza`
- `/analytics/licitacoes-detalhadas`
- `/analytics/microempresas`
- `/analytics/participacoes-me-locais`
- `/analytics/participacoes-me-gerais`

As rotas e services legados permanecem disponíveis para outros consumidores, como relatórios, sem alteração de escopo. Os gráficos e indicadores destas duas páginas não os chamam.

## Dados que os dois endpoints não oferecem

- Cidade/UF da sede não vem nos pagamentos. O recorte local cruza os CNPJs com `/empresas` exclusivamente para obter a sede; todos os valores continuam sendo `valor_pago` da coleta, sem usar valores de licitações.
- Data de cada pagamento: não montar uma série mensal a partir da data de realização de licitações ou repartir o total anual em meses.
- Número da licitação: a tabela de pagamentos não apresenta registros como se fossem licitações.

Os títulos dos gráficos foram mantidos, com descrições identificando pagamentos efetivos. A tabela pública foi identificada como pagamentos a ME. O recorte mensal sem suporte exibe uma explicação, sem valores inventados. A sede é enriquecida pelo cadastro de empresas conforme descrito abaixo.

## Verificação

- Testes automatizados rejeitam qualquer operação financeira fora de `/analytics/pagamentos/*` nos dois carregadores.
- Verificados: código TCE, exercício, categoria ME/vazia, coleta fixa, rejeição de coleta divergente, próxima página no limite de 100, todas as páginas no detalhe e no CSV, falhas sem totais parciais, cobertura ausente versus zero, filtro de natureza e município inválido.
- Navegador, Amontada/2025: gráfico geral de sete naturezas soma R$ 100.312.702,96; gráfico ME soma R$ 24.107.313,94; CSV ME com 120 linhas reconcilia esse subtotal.
- Detalhe: 304 linhas de fornecedores agrupados por documento (incluindo grupos não identificados); soma dos fornecedores de todos os portes igual ao total pago de R$ 100.312.702,96. O indicador conta somente documentos CPF/CNPJ identificados, não todos os grupos.
- Histórico de pagamentos validado em 2024, 2025 e 2026, com troca da natureza selecionada. Layout conferido em 1440, 768 e 390 px.

## Compras com ME locais

- O carregamento consulta todas as páginas de fornecedores com `categoria_porte=ME`, mesmo que a tabela esteja em outra página ou mostre todos os portes.
- Mantém o `coleta_id` do resumo e o filtro de natureza da página.
- Reconcilia em centavos a soma de `valor_pago` com `total_me` (ou `valor_me` da natureza selecionada). Em caso de página ausente ou coleta divergente, o recorte não é publicado como completo.
- O cadastro `/empresas` é consultado pela rotina de diretório já existente, com cache compartilhado. O cruzamento usa CNPJ, município normalizado e UF; cidade homônima em outro estado não é local.
- O numerador do gráfico/card é a soma de pagamentos a ME locais identificadas. O denominador do gráfico é o total de controle de pagamentos no mesmo recorte, como no gráfico de ME em geral.
- ME com sede desconhecida são separadas, sem serem classificadas como externas. Não havendo nenhuma sede conhecida, o recorte aparece sem classificação, e não como zero local.
- O cadastro é o consultado na análise e não representa necessariamente a sede histórica na data do pagamento. Essa diferença está indicada na tela.
- Origem dos fornecedores no detalhe usa somente o subtotal ME e distingue local, fora do município e sede não identificada. Não deve ser confundida com o gráfico local em relação ao total pago de todos os portes.
- Evidência real em Amontada/2025: R$ 629.427,07 pagos a ME locais identificadas (0,63% do total de controle); R$ 3.109.861,21 de pagamentos a 18 ME com sede desconhecida no cadastro. A parcela local identificada pode estar incompleta.
- Navegador: valor do card igual ao do gráfico nas duas telas, alternância gráfico/tabela e layout em desktop/tablet/celular conferidos. Local + externo + desconhecido reconcilia o subtotal ME de R$ 24.107.313,94.
- Testes adicionais cobrem centavos exatos, normalização de município, homônimos de outros estados, CNPJ repetido em naturezas diferentes, sede desconhecida, subtotal divergente, porte incorreto e denominador sem base.
