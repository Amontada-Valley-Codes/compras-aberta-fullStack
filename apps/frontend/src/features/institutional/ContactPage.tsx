import Link from "next/link";
import { ArrowRight, Building2, KeyRound, Landmark, Mail, MessageCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { CONTACT_CHANNELS } from "./contact-channels";

export function ContactPage() {
  const { whatsapp, email } = CONTACT_CHANNELS;
  const hasDirectChannel = Boolean(whatsapp || email);

  return (
    <div className="public-container inst-page">
      <header className="inst-heading">
        <span className="inst-eyebrow">Contato</span>
        <h1>Fale com a equipe do Compras Abertas</h1>
        <p>
          Escolha o assunto abaixo. As perguntas frequentes ajudam com dúvidas sobre a plataforma, os dados públicos e os planos.
        </p>
      </header>

      <div className="inst-cards">
        <article className="inst-card">
          <MessageCircle aria-hidden="true" />
          <h2>Dúvidas sobre a plataforma</h2>
          <p>
            Consulte as perguntas frequentes para entender como pesquisar os dados, interpretar os indicadores e acessar
            a plataforma.
          </p>
          <Link href="/#faq" className="inst-link">
            Ver perguntas frequentes <ArrowRight aria-hidden="true" />
          </Link>
        </article>

        <article className="inst-card">
          <Landmark aria-hidden="true" />
          <h2>Prefeituras e gestores públicos</h2>
          <p>
            Quer acompanhar as compras da sua prefeitura no painel do gestor? Crie a conta de gestor público com o seu
            e-mail institucional.
          </p>
          <Link href="/auth/cadastro?perfil=gestor" className="inst-link">
            Cadastro de gestor público <ArrowRight aria-hidden="true" />
          </Link>
        </article>

        <article className="inst-card">
          <Building2 aria-hidden="true" />
          <h2>Microempresas</h2>
          <p>
            Para encontrar e acompanhar oportunidades de licitação, cadastre a sua microempresa. A equipe analisa os
            documentos e libera o acesso.
          </p>
          <Link href="/auth/cadastro?perfil=me" className="inst-link">
            Cadastro de microempresa <ArrowRight aria-hidden="true" />
          </Link>
        </article>

        <article className="inst-card" id="acesso">
          <KeyRound aria-hidden="true" />
          <h2>Problemas de acesso</h2>
          <p>
            Esqueceu a senha ou o cadastro ainda não foi aprovado? A recuperação automática de senha ainda não está
            disponível. Consulte a situação do cadastro. Nunca envie a sua senha.
          </p>
          <Link href="/acesso/status" className="inst-link">
            Ver situação do cadastro <ArrowRight aria-hidden="true" />
          </Link>
        </article>
      </div>

      {hasDirectChannel && (
        <section className="inst-direct" aria-label="Canais diretos">
          <h2>Canais diretos</h2>
          <div>
            {whatsapp && (
              <a className="button inst-direct-button" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                <FaWhatsapp aria-hidden="true" /> WhatsApp
              </a>
            )}
            {email && (
              <a className="button inst-direct-button" href={`mailto:${email}`}>
                <Mail aria-hidden="true" /> {email}
              </a>
            )}
          </div>
        </section>
      )}

      <p className="inst-footnote">
        Ao entrar em contato, os dados que você enviar são usados só para responder ao seu pedido. Veja os{" "}
        <Link href="/termos#privacidade">termos e a política de privacidade</Link>.
      </p>

    </div>
  );
}
