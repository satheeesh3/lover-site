// Standalone Cloudflare Worker (separate from the Pages site) that runs on
// a daily Cron Trigger and expires customers/pages past their expiry_date.
//
// Cloudflare Pages Functions cannot have scheduled(cron) handlers — only a
// plain Worker can — which is why this lives in its own directory and is
// deployed independently with `wrangler deploy` (see README.md).
//
// Requires these Worker secrets: SUPABASE_URL, SUPABASE_SERVICE_KEY

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(expireOverduePlans(env));
  },
  // Optional: hit this Worker's URL manually to trigger expiry outside the cron schedule.
  async fetch(request, env) {
    await expireOverduePlans(env);
    return new Response("Expiry check complete");
  },
};

async function expireOverduePlans(env) {
  const today = new Date().toISOString().slice(0, 10);
  const headers = {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  await fetch(
    `${env.SUPABASE_URL}/rest/v1/customers?status=eq.active&expiry_date=lt.${today}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "expired" }),
    }
  );
}
