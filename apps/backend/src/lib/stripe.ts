import Stripe from "stripe";
import { env } from "../env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia" as any,
  appInfo: {
    name: "Compras Abertas",
    version: "1.0.0",
  },
});
