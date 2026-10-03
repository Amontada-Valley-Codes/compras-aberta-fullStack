const apiDescription = `
API do **Compras Abertas**: plataforma de transparência que ajuda microempresas
a encontrar oportunidades em licitações públicas e permite acompanhar como os
municípios do Ceará gastam com compras públicas.

## Como a API é organizada

| Grupo | O que faz | Precisa de login? |
| --- | --- | --- |
| **Autenticação** | Cadastro de usuários e login (emissão de token JWT). | Não |
| **Microempresa** | Cadastro de microempresas com upload de documentos. | Não |
| **Municípios** | Catálogo de municípios do Ceará (código IBGE e nome). | Não |
| **Analytics** | Indicadores e licitações públicas. | Não |

As rotas de **Analytics** não têm banco próprio: o backend consulta uma API
externa de dados (variável \`API_DADOS\`) e repassa o resultado, aplicando
validação dos filtros, cache e tentativas automáticas.

## Autenticação

### Cadastro simples (apenas usuário)
1. Crie a conta em \`POST /users\` (o papel é sempre \`BUSINESS\`).
2. Faça login em \`POST /sessions\`.

### Cadastro de microempresa (usuário + empresa)
1. Cadastre a empresa em \`POST /business/register\` enviando os dados do
   usuário, da empresa e os 4 documentos obrigatórios via \`multipart/form-data\`.
2. Faça login em \`POST /sessions\` e guarde o \`token\` e o \`refreshToken\`.

### Uso do token
3. Envie o token nas rotas protegidas no cabeçalho
   \`Authorization: Bearer <token>\`.
4. Quando o token expirar, chame \`POST /sessions/refresh\` com o
   \`refreshToken\` para obter um novo par. Ao sair, chame
   \`POST /sessions/logout\`.

O token é um **JWT (HS256)** com validade de **15 minutos**. O \`sub\` é o id
do usuário e o \`role\` é \`ADMIN\` ou \`BUSINESS\`. O **refresh token** é
opaco, dura **7 dias** e é de uso único (cada refresh devolve um novo).
Usuários desativados (\`isActive = false\`) não conseguem fazer login nem
renovar a sessão, e as rotas protegidas os rejeitam com 401 mesmo com um
token ainda dentro da validade.

Hoje todas as rotas expostas são públicas. O middleware de autenticação e de
autorização por papel já existe e será usado nas rotas restritas; use o botão
**Authorize** para informar o token quando elas forem adicionadas.

## Limite de requisições (rate limit)

Rotas sensíveis têm limite por IP. Ao excedê-lo a resposta é **429**.

| Rota | Limite |
| --- | --- |
| \`POST /sessions\` | 5 requisições por minuto |
| \`POST /sessions/refresh\` e \`/sessions/logout\` | 20 requisições por minuto |
| \`POST /users\` | 3 requisições a cada 10 minutos |
| \`POST /business/register\` | 3 requisições a cada 10 minutos |

## Cache e resiliência (Analytics)

- As respostas de sucesso ficam em **cache em memória** por alguns minutos
  (padrão 5 min, configurável em \`ANALYTICS_CACHE_TTL_SECONDS\`). A chave é a
  rota + filtros, então a mesma consulta repetida não chega à API externa.
- Se a API externa falhar (erro de rede, 5xx ou timeout), o backend tenta de
  novo até **2 vezes**. Persistindo a falha, responde **502**.

## Formato dos erros

Todo erro tem o corpo \`{ "message": "..." }\`.

| Status | Quando acontece |
| --- | --- |
| 400 | Parâmetros inválidos. Traz também \`issues\` com o detalhe por campo. |
| 401 | Credenciais ou token inválidos. |
| 403 | Sem permissão (ex.: usuário desativado). |
| 409 | Conflito (ex.: e-mail ou CNPJ já cadastrado). |
| 429 | Limite de requisições excedido. |
| 502 | API externa de dados indisponível. |
| 500 | Erro inesperado no servidor. |

## Convenções

- **Códigos de município:** o catálogo (\`GET /municipios\`) devolve o código
  **IBGE**. As rotas de analytics usam o código **TCE-CE** em
  \`codigo_municipio\`. São códigos diferentes.
- **Valores monetários** vêm como *string decimal* (ex.: \`"1250000.50"\`).
- **Datas** de filtro usam \`AAAA-MM-DD\`.
- **Paginação** das listas usa \`limit\` (máx. 100) e \`offset\`.
- **ME** significa *microempresa*.
- **Upload de documentos** usa \`multipart/form-data\`. Formatos aceitos:
  PDF, JPG, PNG (máx 5 MB por arquivo).
`;

export { apiDescription };
