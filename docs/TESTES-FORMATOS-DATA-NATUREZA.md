# Testes de formatos de data — gastos por natureza

Endpoint: `GET /analytics/gastos-por-natureza`, origem `https://comprasabertas.amontadavalley.com.br/api-dados`.

Município utilizado: Amontada, TCE `010`. Os 19 casos abaixo foram executados diretamente na API, sem passar pelo frontend ou backend local. O Swagger especifica `format: date` para os dois parâmetros.

| Caso | data_inicio | data_fim | HTTP | Resultado |
| --- | --- | --- | --- | --- |
| ISO documentado | `2025-01-01` | `2025-12-31` | 200 | data: [] |
| Brasileiro com barras | `01/01/2025` | `31/12/2025` | 422 | Validação rejeitou o formato |
| Brasileiro com hífens | `01-01-2025` | `31-12-2025` | 422 | Validação rejeitou o formato |
| Americano com barras | `01/01/2025` | `12/31/2025` | 422 | Validação rejeitou o formato |
| Ano primeiro com barras | `2025/01/01` | `2025/12/31` | 422 | Validação rejeitou o formato |
| Compacto AAAAMMDD | `20250101` | `20251231` | 422 | Validação rejeitou o formato |
| ISO com horário | `2025-01-01T00:00:00` | `2025-12-31T00:00:00` | 200 | data: [] |
| ISO com horário UTC | `2025-01-01T00:00:00Z` | `2025-12-31T00:00:00Z` | 200 | data: [] |
| ISO com horário e offset | `2025-01-01T00:00:00-03:00` | `2025-12-31T00:00:00-03:00` | 200 | data: [] |
| ISO com espaço e horário | `2025-01-01 00:00:00` | `2025-12-31 00:00:00` | 200 | data: [] |
| Somente ano | `2025` | `2025` | 422 | Validação rejeitou o formato |
| Somente ano e mês | `2025-01` | `2025-12` | 422 | Validação rejeitou o formato |
| Timestamp Unix segundos | `1735689600` | `1767139200` | 200 | data: [] |
| Timestamp Unix milissegundos | `1735689600000` | `1767139200000` | 200 | data: [] |
| Campos vazios | `` | `` | 422 | Validação rejeitou o formato |
| Sem datas | `omitido` | `omitido` | 200 | data: [] |
| Só data inicial ISO | `2025-01-01` | `omitido` | 200 | data: [] |
| Só data final ISO | `omitido` | `2025-12-31` | 200 | data: [] |
| Intervalo amplo ISO | `2000-01-01` | `2100-12-31` | 200 | data: [] |

Controle adicional: omitir todos os parâmetros (inclusive município) também retornou HTTP 200 e `data: []`.

Conclusão: `2025-01-01` e `2025-12-31` são aceitos e correspondem ao formato documentado. Datas brasileiras, campos vazios e formatos incompletos são rejeitados com 422. As outras representações aceitas também retornam vazio, assim como a consulta sem datas e com intervalo 2000–2100. Não há evidência de que o formato enviado pela aplicação explique a ausência de registros. Não foram alteradas as datas da aplicação, que já seguem o contrato.

Exemplo reproduzível:

```text
https://comprasabertas.amontadavalley.com.br/api-dados/analytics/gastos-por-natureza?codigo_municipio=010&data_inicio=2025-01-01&data_fim=2025-12-31
```
