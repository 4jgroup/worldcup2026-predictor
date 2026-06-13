/* Acceso centralizado y tipado a variables de entorno.
   Nada aquí expone secretos al cliente: las server-only solo se leen en
   código de servidor (rutas API). Las NEXT_PUBLIC_* son seguras. */

export const clientEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const serverEnv = {
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePriceId: process.env.STRIPE_PRICE_ID ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  apifyToken: process.env.APIFY_TOKEN ?? "",
  cronSecret: process.env.CRON_SECRET ?? "",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "",
};

export const hasSupabase = () => !!serverEnv.supabaseUrl && !!serverEnv.supabaseServiceRoleKey;
export const hasStripe = () => !!serverEnv.stripeSecretKey && !!serverEnv.stripePriceId;
export const hasApify = () => !!serverEnv.apifyToken;
