import { AppError } from "./AppError";

export const ALLOWED_MIMETYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateFile(mimetype: string, size: number): void {
  if (!ALLOWED_MIMETYPES.includes(mimetype)) {
    throw new AppError(`Tipo de arquivo não permitido. Aceito apenas: ${ALLOWED_MIMETYPES.join(", ")}`, 400);
  }
  if (size > MAX_FILE_SIZE) {
    throw new AppError("O tamanho do arquivo não pode exceder 5MB", 400);
  }
}
