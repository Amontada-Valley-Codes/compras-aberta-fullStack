# Compra Aberta API — inventário e comparação

Fonte: transcrição do Swagger enviada pelo usuário em 05/11/2026. Versão 1.0.0, OpenAPI 3.1. Caminhos relativos ao servidor da API. A transcrição informa `/api-dados/openapi.json`, mas não inclui o JSON original, defaults completos nem declaração de segurança. Não presumir defaults omitidos ou ausência de autenticação.

## Regras comuns

- Todas as 17 operações fornecidas são GET. Operações com parâmetros documentam 200 e 422; `/` e `/health` documentam 200.
- Listas paginadas retornam `{ limit, offset, data }`. `limit` é inteiro entre 1 e 100; `offset` é inteiro ≥ 0. O contrato transcrito não informa total nem ordenação estável.
- `codigo_municipio` é string: preservar zeros à esquerda. Nos indicadores antigos o máximo é 20 caracteres; nas rotas de pagamentos o tamanho exigido é exatamente 3. Confirmar a correspondência com o catálogo antes de enviar.
- `codigo_natureza`, quando aceito, tem exatamente 2 caracteres. O texto menciona sete naturezas, mas não fornece enum dos códigos.
- `ano` é inteiro de 2000 a 2100. Datas são strings no formato de data. Não há equivalência explícita entre ano e intervalo de datas no texto fornecido.
- Valores monetários são strings. Percentuais podem ser nulos; não converter nulo em zero. Diversos campos cadastrais e datas também podem ser nulos.
- Erros 422 possuem `detail[]` com `loc`, `msg` e `type`.

## Todas as operações

`?` indica parâmetro opcional. Todos os parâmetros são query, exceto os dois identificadores explicitamente marcados como path. Em parâmetros opcionais, a transcrição também admite null; isso não especifica como serializar null na URL.

| GET | Parâmetros | Resposta e finalidade |
| --- | --- | --- |
| `/health` | Nenhum | Objeto com propriedades string; disponibilidade |
| `/municipios` | `uf?` string de 2 caracteres; `limit`, `offset` | Catálogo paginado: código do município, nome, UF, IBGE e Geonames; os dois últimos podem ser nulos |
| `/licitacoes` | `codigo_municipio?` ≤20; `codigo_natureza?`; `data_inicio?`, `data_fim?`; `limit`, `offset` | Licitações paginadas com identificador, município, número, data, valor total, contagens de empresas/itens, atualização e naturezas |
| `/licitacoes/{codigo_municipio}/{numero_licitacao}/dotacoes` | Ambos obrigatórios no path; `limit`, `offset` | Dotações paginadas, exercício, classificações orçamentárias, fonte, valor documental e referência |
| `/licitacoes/{codigo_municipio}/{numero_licitacao}/itens` | Ambos obrigatórios no path; `limit`, `offset` | Itens paginados, sequência, vencedor/CNPJ/porte, descrição, unidade, quantidade, valor unitário, valor vencedor e data |
| `/participacoes` | `codigo_municipio?` ≤20; `porte_empresa?` ≤100; `cnpj?` ≤14; `limit`, `offset` | Participações paginadas: licitação, empresa, CNAE, valor e itens vencidos, data. Não aceita ano ou datas no contrato fornecido |
| `/empresas` | `porte_empresa?` ≤100; `cnae_principal?` ≤20; `limit`, `offset` | Cadastro paginado, situação, CNAE, porte, localização, consulta OpenCNPJ e atualização |
| `/analytics/licitacoes-detalhadas` | `codigo_municipio?` ≤20; `codigo_natureza?`; `ano?`; `limit`, `offset` | Licitação × natureza × empresa vencedora. Não promete restringir a ME; não aceita filtro de porte |
| `/analytics/participacoes-me-locais` | `codigo_municipio` obrigatório, 1–20; `codigo_natureza?`; `ano?`; `limit`, `offset` | ME vencedoras sediadas no município; `data` e `resumo` com licitações, participações, valores, itens e percentuais locais |
| `/analytics/participacoes-me-gerais` | `codigo_municipio` obrigatório, 1–20; `codigo_natureza?`; `ano?`; `limit`, `offset` | Todas as ME vencedoras no município; `data` e `resumo` com licitações, participações, valores, itens e percentuais de ME |
| `/analytics/gastos-por-natureza` | `codigo_municipio?` ≤20; `data_inicio?`, `data_fim?` | Dotação associada à contratação por natureza, contagens, `metrica` e `observacao`. Não é pagamento efetivo |
| `/analytics/microempresas` | `codigo_municipio?` ≤20; `codigo_natureza?`; `data_inicio?`, `data_fim?` | ME vencedoras: empresas distintas, licitações, participações, valor e itens vencidos; `porte_considerado` |
| `/analytics/comparativo-classificacao` | `codigo_municipio?` ≤20; `data_inicio?`, `data_fim?` | `universo` e `por_classificacao`: itens, licitações e valor. Universo inclui itens sem CNPJ; classificação não verificável/desatualizada é desconhecida |
| `/analytics/participacao-me-por-natureza` | `codigo_municipio?` ≤20; `data_inicio?`, `data_fim?` | Licitações, participações, valores e itens, totais e de ME, com percentuais por natureza; `associacao`, `observacao`. Associação no nível da licitação |
| `/analytics/pagamentos/resumo` | `codigo_municipio` obrigatório, 3 caracteres; `ano` obrigatório; `coleta_id?` inteiro ≥1 | Pagamentos da Prefeitura nas sete naturezas: `coleta`, `data`, `total_controle`, `total_me`, `percentual_me`, `pendencias`, `observacao` |
| `/analytics/pagamentos/fornecedores` | `codigo_municipio` obrigatório, 3 caracteres; `ano` obrigatório; `codigo_natureza?`; `categoria_porte?` ≤40; `coleta_id?` ≥1; `limit`, `offset` | Pagamento por fornecedor e natureza; `coleta_id` e lista paginada. Por padrão somente ME; enviar categoria vazia para todas as categorias |
| `/` | Nenhum | String de identificação |

## Comparação com /analise

As seis rotas analíticas atuais existem no contrato fornecido e os nomes dos parâmetros enviados são compatíveis. Não há evidência de caminho incorreto nessas seis operações. Há divergências de significado e lacunas de integração:

| Situação | Conclusão pelo contrato | Ação planejada |
| --- | --- | --- |
| Gráfico “Compras por natureza” usa `valor_total_dotacao` | É dotação associada à contratação; não comprova valor pago e não significa necessariamente previsão de todo o orçamento municipal | Identificar explicitamente como dotação; se a métrica desejada é pagamento, usar o resumo de pagamentos em uma apresentação própria |
| Gráfico de valor de ME por natureza | Uma licitação aparece em todas as naturezas associadas, sem rateio dos valores por item | Exibir essa limitação; não somar categorias para construir um total geral nem apresentar como alocação exclusiva de recursos |
| Tabela “Licitações com microempresas” usa licitações detalhadas | A rota promete empresas vencedoras em geral, sem restrição documentada de porte | Corrigir a promessa da tabela ou usar uma fonte restrita a ME. Não filtrar apenas a página recebida: isso quebra completude e paginação |
| Participação por natureza | A resposta possui `itens_vencidos`, `itens_vencidos_me`, `percentual_itens_vencidos_me`, `associacao` e `observacao` ausentes dos tipos locais | Incluir esses campos ao alinhar os tipos e apresentar os metadados relevantes |
| Tipos de licitações detalhadas | `ano_licitacao`, `codigo_natureza` e `nome_natureza` admitem null nos schemas transcritos | Ajustar tipos e consumidores, inclusive ordenação, filtros e exportação |
| Comparativo de classificação | Não está integrado na tela atual | Usar para validar cobertura/classificação dos vencedores, sem confundir valor vencido com valor pago |
| Pagamentos | As duas rotas não estão integradas | Criar schemas, serviços e proxy conforme necessário para a métrica de pagamento; conservar contexto da coleta e reconciliação |

## Regras para integrar pagamentos

1. Usar `total_controle`, `total_me`, `percentual_me` e `data[].valor_me` para indicadores explicitamente de **pagamento**. Não substituir silenciosamente métricas de vencedores/participações por pagamentos.
2. Preservar `coleta_id` do resumo nas consultas de fornecedores, evitando comparar coletas diferentes. Confirmar em respostas reais qual coleta é escolhida quando o parâmetro é omitido.
3. Exibir contexto de cobertura: exercício, intervalos de empenhos/pagamentos, órgãos excluídos, regra MEI, fonte e referência cadastral.
4. Considerar `status`, `reconciliado`, `quantidade_pendencias`, `finalizado_em`, pendências e observação. `reconciliado` da coleta pode ser nulo; não tratar como verdadeiro.
5. O resumo define ME como porte 01. Não ampliar para EPP/MPE ou inferir inclusão de MEI; respeitar a regra declarada na coleta.
6. A listagem pode incluir documento que não é CNPJ. Usar `tipo_documento` antes de formatar; conservar classificação e situação cadastral sem inferência por nome.
7. Testar categoria omitida versus string vazia: vazia significa todas as categorias, portanto não pode ser removida inadvertidamente por normalização de query.
8. Reconciliar somas monetárias com precisão decimal. Totais de fornecedores e categorias só são comparáveis com a mesma coleta, natureza, categoria e universo.

## Testes ainda necessários

- Confirmar município de referência e obter endereço de API funcional. O exemplo do próprio usuário mostra `/api-dados/health` retornando HTML 404 do Next.js. Isso é compatível com roteamento para o frontend, mas a configuração de proxy/implantação precisa ser inspecionada para confirmar a causa.
- Não é possível validar valores, cobertura, defaults ausentes, ordenação ou escopo de `resumo` a partir dos exemplos genéricos do Swagger.
- Executar a matriz do plano de auditoria e testar também `coleta_id`, categoria omitida/vazia, documentos de fornecedores e reconciliação. A indisponibilidade de pagamento não deve virar fallback silencioso para dotação ou valor vencido.
