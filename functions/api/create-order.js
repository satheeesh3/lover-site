// Cloudflare Pages Function: POST /api/create-order
// Creates a Razorpay order server-side. Never expose RAZORPAY_KEY_SECRET to
// the browser — that's why this has to run here, not in assets/js/order.js.
//
// Requires these Pages environment variables/secrets (see README.md):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

const PLAN_PRICES_INR = {
  monthly: 99,
  yearly: 999,
  lifetime: 1499,
};
const KEYCHAIN_ADDON_INR = 299;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const plan = body.plan;
  if (!PLAN_PRICES_INR[plan]) {
    return jsonError("Invalid plan", 400);
  }

  let amountInr = PLAN_PRICES_INR[plan];
  if (body.keychain_addon) amountInr += KEYCHAIN_ADDON_INR;
  const amountPaise = amountInr * 100;

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return jsonError("Payment is not configured yet", 500);
  }

  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { plan, keychain_addon: String(!!body.keychain_addon) },
    }),
  });

  if (!rzpRes.ok) {
    const errText = await rzpRes.text();
    return jsonError("Could not create payment order: " + errText, 502);
  }

  const order = await rzpRes.json();

  return new Response(
    JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
