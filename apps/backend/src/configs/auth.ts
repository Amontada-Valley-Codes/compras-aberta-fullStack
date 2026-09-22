import { env } from "../env";

const authConfig = {
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: "15m" as const,
  },
  refreshToken: {
    expiresInDays: 7,
  },
};

export { authConfig };
