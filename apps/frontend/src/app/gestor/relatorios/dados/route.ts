import { getGestorAccess, getMunicipalityOptions } from "@/features/dashboard/gestor/gestor-context";
import { buildGestorReport, ReportDataError, type ReportRequest } from "@/features/dashboard/gestor-publico/relatorios/report-data";
import { gestorReportQuerySchema } from "@/schemas/analytics/gestor-report.schema";

// Conteúdo do relatório do gestor (JSON). O arquivo (PDF, PNG…) é desenhado no
// navegador a partir desta resposta. O proxy.ts já barra quem não é gestor nem
// administrador; aqui o perfil é confirmado no backend, como no layout.

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  const access = await getGestorAccess();
  if (!access) return fail(401, "Sua sessão expirou. Entre novamente para gerar o relatório.");
  if (access.kind === "error") return fail(503, "Não conseguimos confirmar os dados da sua conta agora. Tente novamente em instantes.");

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = gestorReportQuerySchema.safeParse(params);
  if (!parsed.success) return fail(400, "Confira o município, o ano, a natureza da despesa e o modelo escolhidos.");

  const municipalities = await getMunicipalityOptions();
  if (!municipalities.data) return fail(502, "Não foi possível carregar a lista de municípios agora. Tente novamente em instantes.");
  const municipality = municipalities.data.find((item) => item.ibgeCode === parsed.data.municipio);
  if (!municipality) return fail(400, "Município não encontrado.");

  try {
    const report = await buildGestorReport({
      model: parsed.data.modelo as ReportRequest["model"],
      municipality,
      year: parsed.data.ano,
      natureCode: parsed.data.natureza,
    });
    return Response.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ReportDataError) return fail(error.status, error.message);
    console.error("Falha ao montar o relatório do gestor", error);
    return fail(500, "Não foi possível montar o relatório agora. Tente novamente em instantes.");
  }
}
