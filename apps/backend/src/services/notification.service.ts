import nodemailer from "nodemailer";

interface SendApprovalEmailParams {
  toEmail: string;
  companyName: string;
}

export async function sendApprovalEmail({ toEmail, companyName }: SendApprovalEmailParams) {
  try {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || testAccount.user, // generated ethereal user se não tiver env
        pass: process.env.SMTP_PASS || testAccount.pass, // generated ethereal password se não tiver env
      },
    });

    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: '"Compras Abertas" <no-reply@comprasabertas.com.br>',
      to: toEmail,
      subject: "Seu cadastro foi aprovado! 🎉",
      text: `Olá ${companyName},\n\nSeu cadastro no Compras Abertas foi aprovado com sucesso! Você já pode acessar a plataforma e ver as licitações disponíveis para o seu negócio.\n\nAcesse: https://comprasabertas.com.br/me\n\nAtenciosamente,\nEquipe Compras Abertas`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7;">Cadastro Aprovado! 🎉</h2>
          <p>Olá <strong>${companyName}</strong>,</p>
          <p>Seu cadastro no Compras Abertas foi analisado e <strong>aprovado com sucesso!</strong></p>
          <p>Você já pode acessar a plataforma e conferir as licitações disponíveis e compatíveis com o seu negócio.</p>
          <a href="http://localhost:3000/me" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Acessar meu painel</a>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #64748b;">Este é um e-mail automático. Por favor, não responda.</p>
        </div>
      `,
    });

    console.log("Notificação enviada: %s", info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL do E-mail (Teste Gratuito Ethereal): %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Erro ao enviar e-mail de notificação:", error);
  }
}
