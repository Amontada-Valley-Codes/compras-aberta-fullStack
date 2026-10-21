import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      role: string;
      accessStatus: "PENDING" | "APPROVED" | "REJECTED";
    };
  }
}
