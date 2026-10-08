"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phone = exports.password = exports.email = exports.cnpj = void 0;
const zod_1 = require("zod");
// Campos reutilizados por mais de um módulo. A normalização (trim, minúsculas)
// acontece aqui, na borda, para que services e repositories só recebam dados
// já no formato canônico.
const email = zod_1.z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "E-mail muito longo")
    .pipe(zod_1.z.email("E-mail inválido"));
exports.email = email;
// bcrypt só considera os primeiros 72 bytes; acima disso, senhas diferentes
// com o mesmo prefixo gerariam o mesmo hash.
const password = zod_1.z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Senha deve ter no máximo 72 bytes");
exports.password = password;
function isValidCnpj(digits) {
    if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) {
        return false;
    }
    const checkDigit = (length) => {
        const weights = length === 12
            ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    return (checkDigit(12) === Number(digits[12]) &&
        checkDigit(13) === Number(digits[13]));
}
// Aceita com ou sem máscara ("12.345.678/0001-90") e guarda só os dígitos.
const cnpj = zod_1.z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine(isValidCnpj, "CNPJ inválido");
exports.cnpj = cnpj;
// Telefone brasileiro com DDD (fixo ou celular), guardado só com dígitos.
const phone = zod_1.z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => /^\d{10,11}$/.test(value), "Telefone deve ter DDD e 10 ou 11 dígitos");
exports.phone = phone;
