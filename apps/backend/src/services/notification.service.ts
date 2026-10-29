import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";

export interface SendApprovalEmailParams {
  toEmail: string;
  companyName: string;
  requesterName?: string;
  note?: string;
}

export interface SendRejectionEmailParams {
  toEmail: string;
  companyName: string;
  requesterName?: string;
  reason?: string;
}

let cachedTransporter: Transporter | null = null;
let usingEtherealFallback = false;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFrontendBaseUrl(): string {
  return env.FRONTEND_URL ?? env.CORS_ORIGIN[0] ?? "http://localhost:3000";
}

function getFromAddress(): string {
  if (env.SMTP_FROM) return env.SMTP_FROM;
  if (env.SMTP_USER) return `"Compras Abertas" <${env.SMTP_USER}>`;
  return '"Compras Abertas" <no-reply@comprasabertas.com.br>';
}

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (env.SMTP_USER && env.SMTP_PASS) {
    usingEtherealFallback = false;
    const host = env.SMTP_HOST ?? "smtp.gmail.com";
    const isGmail = host.includes("gmail.com");
    // O Google exibe Senhas de App com espaços (ex: "abcd efgh ijkl mnop");
    // removemos espaços automaticamente para evitar falha de autenticação.
    const pass = isGmail ? env.SMTP_PASS.replace(/\s+/g, "") : env.SMTP_PASS;

    cachedTransporter = nodemailer.createTransport({
      ...(isGmail ? { service: "gmail" } : {
        host,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      }),
      auth: {
        user: env.SMTP_USER,
        pass,
      },
    });
    return cachedTransporter;
  }

  console.warn(
    "[Email] Aviso: SMTP_USER e SMTP_PASS não estão preenchidos em apps/backend/.env. " +
      "Usando servidor de testes (Ethereal). Para enviar para o Gmail real, preencha SMTP_USER e SMTP_PASS no .env.",
  );
  usingEtherealFallback = true;
  const testAccount = await nodemailer.createTestAccount();

  cachedTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return cachedTransporter;
}

export async function sendApprovalEmail({
  toEmail,
  companyName,
  requesterName,
  note,
}: SendApprovalEmailParams) {
  try {
    const transporter = await getTransporter();
    const frontendUrl = getFrontendBaseUrl();
    const loginUrl = `${frontendUrl}/auth/login`;

    const safeCompany = escapeHtml(companyName);
    const safeGreeting = escapeHtml(requesterName || companyName);
    const trimmedNote = note?.trim();
    const safeNote = trimmedNote ? escapeHtml(trimmedNote) : null;

    const noteBlockHtml = safeNote
      ? `
        <div style="margin: 20px 0; padding: 14px 16px; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 6px;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0369a1;">
            Observação da equipe
          </p>
          <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.5;">
            ${safeNote}
          </p>
        </div>
      `
      : "";

    const noteBlockText = trimmedNote
      ? `\nObservação da equipe: ${trimmedNote}\n`
      : "";

    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: toEmail,
      subject: "Seu cadastro no Compras Abertas foi aprovado! 🎉",
      text: `Olá, ${requesterName || companyName}!\n\nTemos uma ótima notícia: a solicitação de acesso de "${companyName}" no Compras Abertas foi analisada e APROVADA com sucesso!\n${noteBlockText}\nVocê já pode acessar a plataforma com seu e-mail e senha cadastrados:\n${loginUrl}\n\nAtenciosamente,\nEquipe Compras Abertas`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; padding: 4px 10px; background-color: #dcfce7; color: #15803d; font-size: 12px; font-weight: 700; border-radius: 999px; letter-spacing: 0.04em;">
              ACESSO APROVADO
            </span>
          </div>
          <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 22px;">
            Seu cadastro foi aprovado! 🎉
          </h2>
          <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6;">
            Olá, <strong>${safeGreeting}</strong>!
          </p>
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
            A solicitação de acesso de <strong>${safeCompany}</strong> no <strong>Compras Abertas</strong> foi analisada pela nossa equipe e <strong>aprovada com sucesso</strong>.
          </p>
          ${noteBlockHtml}
          <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
            Você já pode entrar na plataforma usando o e-mail e a senha informados no cadastro:
          </p>
          <a href="${loginUrl}" style="display: inline-block; background-color: #123b5d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Acessar a plataforma
          </a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
          <p style="margin: 0; font-size: 12px; color: #64748b;">
            Este é um e-mail automático enviado pelo Compras Abertas. Por favor, não responda.
          </p>
        </div>
      `,
    });

    console.log("[Email] Notificação de aprovação enviada para %s (%s)", toEmail, info.messageId);
    if (usingEtherealFallback) {
      console.log("[Email] Preview URL (Ethereal): %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("[Email] Erro ao enviar e-mail de aprovação:", error);
  }
}

export async function sendRejectionEmail({
  toEmail,
  companyName,
  requesterName,
  reason,
}: SendRejectionEmailParams) {
  try {
    const transporter = await getTransporter();
    const frontendUrl = getFrontendBaseUrl();
    const statusOrCadastroUrl = `${frontendUrl}/auth/cadastro`;

    const safeCompany = escapeHtml(companyName);
    const safeGreeting = escapeHtml(requesterName || companyName);
    const cleanReason =
      reason?.trim() || "Não foi possível validar os dados ou documentos informados.";
    const safeReason = escapeHtml(cleanReason);

    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: toEmail,
      subject: "Atualização sobre sua solicitação de acesso — Compras Abertas",
      text: `Olá, ${requesterName || companyName}.\n\nInformamos que a solicitação de acesso de "${companyName}" no Compras Abertas foi analisada pela nossa equipe e, neste momento, NÃO FOI APROVADA.\n\nMotivo informado pela análise:\n"${cleanReason}"\n\nVocê pode revisar as informações ou documentos pendentes e realizar uma nova solicitação na plataforma:\n${statusOrCadastroUrl}\n\nAtenciosamente,\nEquipe Compras Abertas`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="margin-bottom: 20px;">
            <span style="display: inline-block; padding: 4px 10px; background-color: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 700; border-radius: 999px; letter-spacing: 0.04em;">
              SOLICITAÇÃO RECUSADA
            </span>
          </div>
          <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 22px;">
            Sua solicitação de acesso não foi aprovada
          </h2>
          <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6;">
            Olá, <strong>${safeGreeting}</strong>.
          </p>
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
            Analisamos a solicitação de cadastro referente a <strong>${safeCompany}</strong> no <strong>Compras Abertas</strong> e, neste momento, <strong>não foi possível aprovar o acesso</strong>.
          </p>
          <div style="margin: 20px 0; padding: 14px 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px;">
            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #991b1b;">
              Motivo informado pela equipe de análise
            </p>
            <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.5;">
              ${safeReason}
            </p>
          </div>
          <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6;">
            Caso deseje corrigir os dados ou reenviar a documentação atualizada, acesse a plataforma pelo botão abaixo:
          </p>
          <a href="${statusOrCadastroUrl}" style="display: inline-block; background-color: #123b5d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Ver orientações na plataforma
          </a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
          <p style="margin: 0; font-size: 12px; color: #64748b;">
            Este é um e-mail automático enviado pelo Compras Abertas. Por favor, não responda.
          </p>
        </div>
      `,
    });

    console.log("[Email] Notificação de recusa enviada para %s (%s)", toEmail, info.messageId);
    if (usingEtherealFallback) {
      console.log("[Email] Preview URL (Ethereal): %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("[Email] Erro ao enviar e-mail de recusa:", error);
  }
}
