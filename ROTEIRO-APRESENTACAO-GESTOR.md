# Roteiro de apresentação: Painel do Gestor Público

Passo a passo para demonstrar o painel `/gestor` do Compras Abertas: o que fazer na tela e o que dizer em cada momento. O exemplo usa a Prefeitura de Amontada/CE com os números de 2025.

| Duração | Passos | Conta usada | Ano principal |
|---|---|---|---|
| 10 min | 10 (2 opcionais) | gestor de Amontada | 2025 |

---

## Antes de começar

Faça isto 30 minutos antes da apresentação.

- [ ] **Conferir se a API de dados tem licitações.** Se o valor vier `"0"`, a fonte está vazia: use o [plano B](#plano-b-se-a-api-estiver-sem-dados).
  ```bash
  curl "https://compra-aberta-api.onrender.com/analytics/participacoes-me-locais?codigo_municipio=010&ano=2025&limit=1"
  ```
- [ ] **Subir o backend e o frontend juntos**, na raiz do projeto. O painel abre em `http://localhost:3000`.
  ```bash
  npm run dev
  ```
- [ ] **Criar a conta do gestor da demonstração**, dentro de `apps/backend`. Troque a senha e apague a conta depois da apresentação.
  ```bash
  npx tsx prisma/create-gestor.ts --nome "Gestor Amontada" --email gestor.amontada@demo.com --senha "TroqueEstaSenha" --municipio 2300754
  ```
- [ ] **Entrar uma vez antes, para "acordar" a API.** A API externa fica no Render e pode demorar na primeira consulta. Abra o painel, troque para 2025 e saia.
- [ ] **Deixar o navegador pronto:** janela anônima (sem sessão antiga), zoom em 100% e uma aba já em `localhost:3000/auth/login`. Tenha também a conta de admin à mão para o passo 9.

---

## Roteiro

Use as falas como guia; não precisa decorar.

### 1. Abertura: o problema · `00:00–00:45`

**Na tela**
- Tela de login aberta, ainda sem entrar.

**O que dizer**
> "Todo prefeito e todo secretário fazem três perguntas: quanto a prefeitura gastou em compras no ano? Quanto desse dinheiro ficou com os comerciantes da cidade? E quem são os fornecedores da prefeitura?"
>
> "Esses dados são públicos, no TCE-CE, mas espalhados em milhares de registros. O Painel do Gestor responde às três perguntas numa tela só."

### 2. Entrar como gestor · `00:45–01:45`

**Na tela**
- Entre com a conta do gestor de Amontada.
- Mostre a mensagem "Você entrou no painel do gestor".
- Aponte o cabeçalho: "Prefeitura de Amontada/CE".

**O que dizer**
> "O gestor usa o mesmo login da plataforma. A conta já está ligada ao município dele, então ele cai direto no painel da própria prefeitura."
>
> "Ele não escolhe município. Vê só a prefeitura dele, mesmo se tentar mudar o endereço da página."

### 3. A frase de resumo · `01:45–02:15`

**Na tela**
- No seletor **Ano**, escolha **2025**.
- Leia a frase logo abaixo do título.

**O que dizer**
> "A primeira coisa que o prefeito lê é uma frase: em 2025, a prefeitura homologou R$ 140,8 milhões em compras, e 2,97% desse valor ficou com microempresas de Amontada."

⚠️ A tela abre no ano atual (2026). Troque para 2025 antes de falar, porque é o ano mais completo.

### 4. Os quatro indicadores · `02:15–04:00`

**Na tela**
- Passe pelos cards da esquerda para a direita.
- Pare no card amarelo, o **Termômetro de evasão**, e leia a dica.

**Números para destacar**

| Total | Ficou na cidade | Saiu | MEs vencedoras |
|---|---|---|---|
| R$ 140.823.515 | R$ 4.176.961 (2,97%) | R$ 136.646.554 (97,03%) | 82 (5 locais) |

**O que dizer**
> "De cada R$ 100 que a prefeitura comprou em 2025, menos de R$ 3 ficaram com microempresas daqui. Os outros R$ 97 foram para empresas de fora ou para empresas maiores."
>
> "Das 82 microempresas que venceram licitações em Amontada, só 5 são da cidade. Esse é o tamanho da oportunidade: capacitar fornecedores locais para disputar e reter mais dinheiro no município."

### 5. Para onde vai o dinheiro · `04:00–05:30`

**Na tela**
- Passe o mouse na fatia verde do donut.
- No gráfico de barras, passe o mouse na primeira barra.

**Números para destacar:** Serviços de terceiros **R$ 59,1 mi** · Obras **R$ 13,6 mi** · Equipamentos **R$ 11,5 mi**

**O que dizer**
> "O termômetro mostra a mesma informação dos cards de forma visual: a fatia verde é o que ficou com microempresas da cidade."
>
> "Ao lado está onde a prefeitura mais gasta. Em Amontada, o maior valor previsto é em 'Outros serviços de terceiros', R$ 59,1 milhões. Isso ajuda a escolher em que setor vale a pena preparar os fornecedores locais primeiro."

⚠️ Se perguntarem: as barras mostram a **dotação prevista** no orçamento, não o pagamento efetivo.

### 6. Quem são os fornecedores · `05:30–07:00`

**Na tela**
- Role até "Principais fornecedores da prefeitura".
- Mostre a 1ª linha, com a etiqueta cinza e a cidade.
- Mostre a 10ª linha, com a etiqueta verde.
- Aponte o CNPJ parcialmente oculto.

**O que dizer**
> "Aqui estão as 10 empresas que mais receberam da prefeitura no ano, de 185 fornecedores. A maior foi uma microempresa de Itatira, com R$ 13,9 milhões."
>
> "A etiqueta verde marca o fornecedor local. Em 2025, o maior fornecedor da própria cidade aparece em 10º lugar, com R$ 3,6 milhões."
>
> "O CNPJ aparece parcialmente oculto, para respeitar a privacidade das empresas. Quem quiser a lista completa clica em 'Ver todas as licitações'."

### 7. Trocar o ano · `07:00–07:45`

**Na tela**
- No seletor **Ano**, escolha **2026**.
- Mostre que tudo atualiza na hora.

**Números para destacar:** 2026 até agora **R$ 62.696.211** · ficou na cidade **0,02%**

**O que dizer**
> "Em 2026, até agora, foram R$ 62,7 milhões em compras, e só 0,02% ficou com microempresas de Amontada: cerca de R$ 11 mil. O painel mostra o problema no ano em curso, a tempo de agir."

### 8. Relatório para a reunião · `07:45–08:45`

**Na tela**
- Volte para 2025.
- Clique em **Imprimir relatório executivo**.
- Mostre a pré-visualização: 3 páginas A4, sem botões, com data de geração.
- Cancele a impressão.

**O que dizer**
> "Com um clique, o painel vira um relatório de três páginas para levar à reunião do secretariado: indicadores, gráficos e fornecedores. Dá para imprimir ou salvar em PDF."

### 9. Celular e visão do administrador (opcional) · `08:45–09:30`

**Na tela**
- Abra o modo celular do navegador (F12 e depois Ctrl+Shift+M) e role a página.
- Ou: saia, entre como admin e abra `/gestor`. Mostre o seletor de município e escolha Fortaleza.

**O que dizer**
> "O painel funciona no celular, para o prefeito consultar fora do gabinete."
>
> "A equipe da plataforma também vê o painel de qualquer município, para dar suporte. Em Fortaleza, por exemplo, foram R$ 5,3 bilhões em 2025, e 4,52% ficou com microempresas da capital."

### 10. Fechamento · `09:30–10:00`

**Na tela**
- Volte para os quatro cards de 2025.

**O que dizer**
> "Com dados públicos, o gestor sabe quanto comprou, quanto ficou na cidade e com quem. O próximo passo é usar isso para trazer mais comerciantes locais para as licitações. O Compras Abertas já tem a área da microempresa para isso."

---

## Números de referência

Valores homologados em licitações.

| Município e ano | Total homologado | Ficou com MEs locais | % local | MEs vencedoras |
|---|---:|---:|---:|---:|
| Amontada 2025 | R$ 140.823.515 | R$ 4.176.961 | 2,97% | 82 (5 locais) |
| Amontada 2026 (parcial) | R$ 62.696.211 | R$ 10.971 | 0,02% | 38 (1 local) |
| Fortaleza 2025 | R$ 5.283.838.718 | R$ 238.572.112 | 4,52% | 216 (90 locais) |

Fonte: API Compra Aberta (dados do TCE-CE), consultada em 15/10/2026. Se a fonte for atualizada, os números da tela podem mudar.

---

## Perguntas prováveis

**De onde vêm os dados?**
Das licitações públicas dos municípios cearenses no TCE-CE, organizadas pela API Compra Aberta. O painel não usa nenhum dado inventado ou digitado à mão.

**"Ficou no município" conta as empresas grandes da cidade?**
Não. Conta só as microempresas sediadas na cidade, porque a fonte só informa a cidade das microempresas. O rodapé da tela explica isso.

**Por que alguns fornecedores aparecem com "Origem não informada"?**
Pelo mesmo motivo: para empresas de outros portes, a fonte não diz a cidade. Preferimos não adivinhar em vez de marcar como "de fora" uma empresa que pode ser local.

**O gráfico de gastos é o que a prefeitura pagou?**
Não. É a dotação prevista no orçamento para cada tipo de compra. O valor pago de fato pode ser diferente.

**Como uma prefeitura ganha acesso?**
A equipe do Compras Abertas cria a conta do gestor já ligada ao município. Hoje isso é feito por um comando no servidor; a tela de cadastro no painel do administrador é o próximo passo.

**Um gestor consegue ver outra prefeitura?**
No painel, não: ele vê só a prefeitura vinculada à conta, mesmo se mudar o endereço da página. Os números em si são dados públicos e também aparecem na página de análise aberta a todos.

**Tem dados de 2024?**
Ainda não. A fonte cobre 2025 e 2026.

**O que é o "Termômetro de evasão"?**
É o valor homologado para empresas de fora da cidade ou que não são microempresas locais. Mostra quanto dinheiro de compras não ficou na economia local.

---

## Plano B: se a API estiver sem dados

Isso já aconteceu em 15/10/2026: a API externa ficou sem licitações para todo o Ceará, e o painel passou a mostrar "Nenhum dado encontrado". Por isso o primeiro item do checklist é verificar a API.

Se a fonte estiver vazia no dia:
1. Faça os passos 1 e 2 normalmente (abertura e login), para mostrar o acesso do gestor.
2. Explique que a fonte de dados pública está sendo atualizada.
3. Conte a história com os [números de referência](#números-de-referência) e com capturas de tela do painel com dados, se o grupo tiver salvo alguma.
