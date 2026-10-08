"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = adminRoutes;
const ensure_authenticated_1 = require("../../middlewares/ensure-authenticated");
const verify_user_authorization_1 = require("../../middlewares/verify-user-authorization");
const prisma_1 = require("../../lib/prisma");
async function adminRoutes(app) {
    app.get("/admin/business-requests", {
        onRequest: [ensure_authenticated_1.ensureAuthenticated, (0, verify_user_authorization_1.verifyUserAuthorization)(["ADMIN"])],
    }, async (request, reply) => {
        const users = await prisma_1.prisma.user.findMany({
            where: { role: "BUSINESS" },
            include: { business: true },
            orderBy: { createdAt: "desc" },
        });
        const requests = users.map((u) => {
            const b = u.business;
            return {
                id: u.id,
                cnpj: b?.cnpj || "N/A",
                name: b?.name_businss || u.name,
                legalName: b?.name_businss || u.name,
                initials: (b?.name_businss || u.name)
                    .substring(0, 2)
                    .toUpperCase(),
                segment: b?.porte_empresa || "N/A",
                city: "Não informado", // Adicionar no backend dps se precisar
                sentAt: u.createdAt.toISOString(),
                documents: "4",
                status: u.isActive ? "Aprovada" : "Pendente",
                docsUrls: b ? {
                    cartao_cnpj: `/admin/business-requests/${b.cnpj}/document/cartao_cnpj`,
                    contrato_social: `/admin/business-requests/${b.cnpj}/document/contrato_social`,
                    comprovante_endereco: `/admin/business-requests/${b.cnpj}/document/comprovante_endereco`,
                    comprovante_socio: `/admin/business-requests/${b.cnpj}/document/comprovante_socio`,
                } : null
            };
        });
        return reply.send(requests);
    });
    app.patch("/admin/business-requests/:userId/status", {
        onRequest: [ensure_authenticated_1.ensureAuthenticated, (0, verify_user_authorization_1.verifyUserAuthorization)(["ADMIN"])],
    }, async (request, reply) => {
        const { userId } = request.params;
        const { status } = request.body;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: { business: true },
        });
        if (!user) {
            return reply.status(404).send({ message: "Usuário não encontrado" });
        }
        const isActive = status === "Aprovada";
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: userId },
                data: { isActive },
            }),
            ...(user.business
                ? [
                    prisma_1.prisma.business.update({
                        where: { cnpj: user.cnpj },
                        data: { isActive },
                    }),
                ]
                : []),
        ]);
        if (isActive) {
            // Import must be at the top, or inline if dynamic, but let's just add it to the top. Wait, I will use dynamic import or just add import at the top of the file in the next replacement chunk.
            // Actually, let's just add it at the top of the file using another chunk, or dynamically here. I'll add the import at the top.
            const { sendApprovalEmail } = await import("../../services/notification.service.js");
            // Dispatch in background so it doesn't block the request response
            sendApprovalEmail({
                toEmail: user.email,
                companyName: user.business?.name_businss || user.name
            });
        }
        return reply.send({ message: `Status atualizado para ${status}` });
    });
    app.get("/admin/business-requests/:cnpj/document/:docType", async (request, reply) => {
        const { cnpj, docType } = request.params;
        const business = await prisma_1.prisma.business.findUnique({
            where: { cnpj },
            select: {
                cartaoCnpjPath: true,
                cartaoCnpjMimeType: true,
                contratoSocialPath: true,
                contratoSocialMimeType: true,
                comprovanteEnderecoPath: true,
                comprovanteEnderecoMimeType: true,
                comprovanteSocioPath: true,
                comprovanteSocioMimeType: true,
            },
        });
        if (!business) {
            return reply.status(404).send({ message: "Empresa não encontrada" });
        }
        let filePath = null;
        let mimeType = "";
        switch (docType) {
            case "cartao_cnpj":
                filePath = business.cartaoCnpjPath;
                mimeType = business.cartaoCnpjMimeType;
                break;
            case "contrato_social":
                filePath = business.contratoSocialPath;
                mimeType = business.contratoSocialMimeType;
                break;
            case "comprovante_endereco":
                filePath = business.comprovanteEnderecoPath;
                mimeType = business.comprovanteEnderecoMimeType;
                break;
            case "comprovante_socio":
                filePath = business.comprovanteSocioPath;
                mimeType = business.comprovanteSocioMimeType;
                break;
            default:
                return reply.status(400).send({ message: "Tipo de documento inválido" });
        }
        if (!filePath) {
            return reply.status(404).send({ message: "Documento não encontrado" });
        }
        try {
            const { supabase } = await import("../../lib/supabase.js");
            const { data, error } = await supabase.storage.from("documentos-empresas").download(filePath);
            if (error || !data) {
                console.error("Erro ao baixar arquivo do Supabase:", error);
                return reply.status(500).send({ message: "Erro ao acessar o documento na nuvem" });
            }
            const buffer = Buffer.from(await data.arrayBuffer());
            reply.header("Content-Type", mimeType);
            reply.header("Content-Disposition", `inline; filename="${docType}"`);
            return reply.send(buffer);
        }
        catch (err) {
            console.error("Erro ao ler arquivo:", err);
            return reply.status(500).send({ message: "Erro ao acessar o documento" });
        }
    });
}
