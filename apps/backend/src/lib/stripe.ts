import Stripe from "stripe";
import { env } from "../env";

export const isStripeConfigured = Boolean(env.STRIPE_SECRET_KEY);

export const stripe = new Stripe(
  env.STRIPE_SECRET_KEY || "sk_test_placeholder_not_configured",
  {
    apiVersion: "2025-02-24.acacia" as any,
    appInfo: {
      name: "Compras Abertas",
      version: "1.0.0",
    },
  },
);
