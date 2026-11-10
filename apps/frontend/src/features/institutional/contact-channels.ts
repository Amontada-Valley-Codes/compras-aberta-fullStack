// Canais oficiais de contato da equipe. Podem ser definidos no .env via
// NEXT_PUBLIC_CONTACT_WHATSAPP e NEXT_PUBLIC_CONTACT_EMAIL.
export const CONTACT_CHANNELS: {
  // Só os dígitos, com DDI e DDD. Ex.: "5588999999999".
  whatsapp: string | null;
  email: string | null;
} = {
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || null,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
};
