"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAccessStatus = resolveAccessStatus;
// Quem decide se o usuário pode usar a área restrita:
// - ADMIN não passa por solicitação, então está sempre liberado;
// - BUSINESS segue a situação da sua solicitação de acesso;
// - BUSINESS sem solicitação só existe para contas criadas antes do fluxo de
//   aprovação (pelo antigo POST /users); elas continuam liberadas.
function resolveAccessStatus(user) {
    if (user.role === "ADMIN") {
        return "APPROVED";
    }
    return user.accessRequest?.status ?? "APPROVED";
}
