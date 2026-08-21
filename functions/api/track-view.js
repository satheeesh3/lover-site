// Cloudflare Pages Function: POST /api/track-view
// Increments pages.views via a Postgres RPC using the Supabase service key,
// so the public/anon key never needs write access to the pages table.
//
// Requires these Pages environment variables/secrets (see README.md):
//   SUPABASE_URL, SUPABASE_SERVICE_KEY

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  const slug = body.slug;
  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "Missing slug" }), { status: 400 });
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/increment_page_views`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ page_slug: slug }),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Could not record view" }), { status: 502 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
