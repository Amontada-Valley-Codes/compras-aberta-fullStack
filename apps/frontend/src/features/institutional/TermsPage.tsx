import Link from "next/link";

const UPDATED_AT = "27 de outubro de 2026";

const SECTIONS: Array<[id: string, title: string]> = [
  ["sobre", "Sobre a plataforma"],
  ["dados", "De onde vêm os dados"],
  ["uso", "Uso da plataforma"],
  ["contas", "Contas e acesso"],
  ["privacidade", "Privacidade e proteção de dados"],
  ["acessibilidade", "Acessibilidade"],
  ["compromissos", "Nossos compromissos"],
  ["alteracoes", "Alterações destes termos"],
];

export function TermsPage() {
  return (
    <div className="public-container inst-page">
      <header className="inst-heading">
        <span className="inst-eyebrow">Institucional</span>
        <h1>Termos e compromissos</h1>
        <p>
          As regras de uso do Compras Abertas e o que nos comprometemos a fazer por quem usa a plataforma. Ao navegar ou
          criar uma conta, você concorda com estes termos.
        </p>
        <small>Última atualização: {UPDATED_AT}</small>
      </header>

      <div className="inst-terms">
        <nav className="inst-toc" aria-label="Nesta página">
          <b>Nesta página</b>
          {SECTIONS.map(([id, title]) => (
            <a key={id} href={`#${id}`}>{title}</a>
          ))}
        </nav>

        <article className="inst-terms-body">
          <section id="sobre">
            <h2>1. Sobre a plataforma</h2>
            <p>
              O Compras Abertas reúne, em um só lugar, dados públicos de compras governamentais dos municípios do Ceará.
              O objetivo é facilitar a consulta para três públicos: o cidadão, que quer acompanhar como a sua cidade
              compra; a microempresa, que procura oportunidades de licitação; e o gestor público, que acompanha as compras
              da prefeitura.
            </p>
            <p>
              O Compras Abertas não é um canal oficial do governo e não substitui os portais oficiais de transparência e
              de contratações públicas.
            </p>
          </section>

          <section id="dados">
            <h2>2. De onde vêm os dados</h2>
            <p>As informações exibidas vêm de fontes públicas:</p>
            <ul>
              <li><b>PNCP</b> (Portal Nacional de Contratações Públicas): editais, contratações, contratos e planos de contratação.</li>
              <li><b>TCE-CE</b> (Tribunal de Contas do Estado do Ceará): licitações municipais, vencedores e valores.</li>
              <li><b>OpenCNPJ</b> (dados da Receita Federal): razão social, porte e cidade das empresas.</li>
              <li><b>IBGE</b>: lista e mapas dos municípios.</li>
            </ul>
            <p>
              Os dados são mostrados como foram publicados por essas fontes e podem ter atrasos, lacunas ou erros de
              origem. Valor homologado ou contratado não significa valor pago. As informações servem para consulta e não
              substituem os documentos oficiais: antes de participar de uma licitação, confira sempre o edital no portal
              oficial do órgão.
            </p>
          </section>

          <section id="uso">
            <h2>3. Uso da plataforma</h2>
            <p>Você pode consultar, compartilhar e citar as informações da plataforma, indicando a fonte. Não é permitido:</p>
            <ul>
              <li>usar a plataforma para fins ilegais ou para prejudicar terceiros;</li>
              <li>tentar acessar áreas, contas ou dados sem autorização;</li>
              <li>fazer coletas automatizadas em volume que prejudique o funcionamento do serviço;</li>
              <li>alterar os dados e apresentá-los como se fossem do Compras Abertas ou das fontes oficiais.</li>
            </ul>
            <p>
              A plataforma não presta assessoria jurídica e não garante habilitação, vitória ou contratação em nenhuma
              licitação. As decisões tomadas a partir dos dados são de responsabilidade de quem as toma.
            </p>
          </section>

          <section id="contas">
            <h2>4. Contas e acesso</h2>
            <p>
              A consulta aos dados públicos é aberta. As áreas da microempresa e do gestor público exigem conta. Ao se
              cadastrar, você se compromete a informar dados verdadeiros e a manter a sua senha em sigilo; a conta é
              pessoal e não deve ser compartilhada.
            </p>
            <p>
              O cadastro de microempresa passa pela análise da equipe, que confere os documentos enviados antes de
              liberar o acesso. Contas usadas em desacordo com estes termos podem ser suspensas.
            </p>
          </section>

          <section id="privacidade">
            <h2>5. Privacidade e proteção de dados</h2>
            <p>
              Tratamos dados pessoais de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Coletamos
              apenas o necessário para o funcionamento da conta:
            </p>
            <ul>
              <li><b>Gestor público:</b> nome, e-mail e senha (guardada de forma protegida, sem que a equipe consiga lê-la).</li>
              <li>
                <b>Microempresa:</b> nome e e-mail do responsável, senha, CNPJ, razão social e os documentos enviados para
                validação (cartão CNPJ, contrato social, comprovante de endereço e comprovante do sócio).
              </li>
            </ul>
            <p>
              Esses dados são usados para criar e proteger a conta, validar a empresa e enviar avisos sobre o cadastro.
              Não vendemos nem cedemos dados pessoais para publicidade. Os dados de empresas e de compras exibidos na
              plataforma são públicos e vêm das fontes oficiais citadas acima.
            </p>
            <p>
              Você pode pedir acesso, correção ou exclusão dos seus dados pela <Link href="/contato">página de contato</Link>.
            </p>
          </section>

          <section id="acessibilidade">
            <h2>6. Acessibilidade</h2>
            <p>
              Queremos que qualquer pessoa consiga usar a plataforma. Por isso seguimos boas práticas de acessibilidade
              digital: navegação pelo teclado, contraste adequado, textos alternativos em imagens e gráficos, linguagem
              simples e telas que se adaptam ao celular.
            </p>
            <p>
              Ainda podemos ter barreiras que não identificamos. Se encontrar alguma dificuldade, conte para a equipe pela{" "}
              <Link href="/contato">página de contato</Link>.
            </p>
          </section>

          <section id="compromissos">
            <h2>7. Nossos compromissos</h2>
            <ul>
              <li><b>Transparência:</b> indicar sempre a fonte de cada informação.</li>
              <li><b>Linguagem simples:</b> explicar os dados de compras públicas sem jargão.</li>
              <li><b>Imparcialidade:</b> não favorecer nenhuma empresa, órgão ou município.</li>
              <li><b>Segurança:</b> proteger as contas e os documentos enviados.</li>
              <li><b>Melhoria contínua:</b> corrigir erros apontados e evoluir a plataforma com quem a usa.</li>
            </ul>
          </section>

          <section id="alteracoes">
            <h2>8. Alterações destes termos</h2>
            <p>
              Estes termos podem ser atualizados para acompanhar mudanças na plataforma ou na legislação. A data da última
              atualização fica no topo da página. Em caso de dúvida, <Link href="/contato">fale com a equipe</Link>.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
