// Fill these in with your own project values (see README.md).
// SUPABASE_ANON_KEY is safe to expose in client code — it only grants the
// access defined by the RLS policies in sql/schema.sql. Never put the
// Supabase *service role* key or the Razorpay *key secret* here.
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  RAZORPAY_KEY_ID: "YOUR_RAZORPAY_KEY_ID",
  SITE_BASE_URL: "https://your-site.pages.dev",
  PLAN_PRICES: {
    monthly: 99,
    yearly: 999,
    lifetime: 1499,
  },
};
