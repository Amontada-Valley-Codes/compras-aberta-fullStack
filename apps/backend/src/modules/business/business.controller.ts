import type { FastifyReply, FastifyRequest } from "fastify";
import { registerBusinessSchema } from "./business.schema";
import { businessService } from "./business.service";
import { AppError } from "../../utils/AppError";

export const businessController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const parts = request.parts();
    const fields: Record<string, any> = {};
    const files: Record<string, any> = {};

    try {
      for await (const part of parts) {
        if (part.type === "file") {
          if (part.file?.truncated) {
            throw new AppError(
              `O arquivo "${part.filename || 'enviado'}" excede o tamanho máximo permitido de 5 MB.`,
              400,
            );
          }
          const buffer = await part.toBuffer();
          if (part.file?.truncated) {
            throw new AppError(
              `O arquivo "${part.filename || 'enviado'}" excede o tamanho máximo permitido de 5 MB.`,
              400,
            );
          }
          files[part.fieldname] = {
            filename: part.filename,
            mimetype: part.mimetype,
            data: buffer,
          };
        } else if (part.type === "field") {
          fields[part.fieldname] = part.value;
        }
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (
        err?.code === "FST_REQ_FILE_TOO_LARGE" ||
        err?.message?.toLowerCase()?.includes("file too large")
      ) {
        throw new AppError(
          "Um dos arquivos selecionados excede o tamanho máximo permitido de 5 MB.",
          400,
        );
      }
      throw err;
    }

    const requiredFiles = [
      "cartao_cnpj",
      "contrato_social",
      "comprovante_endereco",
      "comprovante_socio",
    ];

    const missingFiles = requiredFiles.filter((f) => !files[f]);
    if (missingFiles.length > 0) {
      throw new AppError(`Arquivos obrigatórios faltando: ${missingFiles.join(", ")}`, 400);
    }

    const data = registerBusinessSchema.parse(fields);

    const result = await businessService.register(data, files as any);

    return reply.status(201).send(result);
  },
};
