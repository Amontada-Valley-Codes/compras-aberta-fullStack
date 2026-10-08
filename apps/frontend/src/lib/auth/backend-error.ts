import { NextResponse } from "next/server";
import axios from "axios";

// O backend já devolve mensagens prontas em pt-BR ({ message, issues? });
// repassamos exatamente o que ele respondeu. Sem resposta, é falha de rede.
export function backendErrorResponse(error: unknown) {
  if (axios.isAxiosError(error) && error.response) {
    return NextResponse.json(error.response.data, { status: error.response.status });
  }

  return NextResponse.json(
    { message: "Não foi possível conectar ao servidor. Tente novamente." },
    { status: 502 },
  );
}

export function sessionExpiredResponse() {
  return NextResponse.json(
    { message: "Sua sessão expirou. Entre novamente." },
    { status: 401 },
  );
}
