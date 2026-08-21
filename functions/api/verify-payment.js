// Cloudflare Pages Function: POST /api/verify-payment
// Verifies the Razorpay payment signature server-side, then writes the
// customer + payment rows using the Supabase *service role* key (RLS blocks
// the anon key from writing to customers/payments — see sql/schema.sql).
//
// Requires these Pages environment variables/secrets (see README.md):
//   RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY

const PLAN_PRICES_INR = { monthly: 99, yearly: 999, lifetime: 1499 };

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customer } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !customer) {
    return jsonError("Missing payment details", 400);
  }
  if (!PLAN_PRICES_INR[customer.plan]) {
    return jsonError("Invalid plan", 400);
  }

  const isValid = await verifySignature(
    `${razorpay_order_id}|${razorpay_payment_id}`,
    razorpay_signature,
    env.RAZORPAY_KEY_SECRET
  );
  if (!isValid) {
    return jsonError("Payment signature verification failed", 400);
  }

  const supabaseHeaders = {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    Prefer: "return=representation",
  };

  // 1. Create the customer record (status stays "pending" until an admin
  //    creates the actual Loversite page).
  const customerRes = await fetch(`${env.SUPABASE_URL}/rest/v1/customers`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify([
      {
        couple_name: customer.couple_name,
        email: customer.email,
        phone: customer.phone,
        plan: customer.plan,
        status: "pending",
        photo_url: customer.photo_url,
        message: customer.message,
      },
    ]),
  });

  if (!customerRes.ok) {
    return jsonError("Could not save your order: " + (await customerRes.text()), 502);
  }
  const [customerRow] = await customerRes.json();

  // 2. Record the payment.
  const paymentRes = await fetch(`${env.SUPABASE_URL}/rest/v1/payments`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify([
      {
        customer_id: customerRow.id,
        amount: PLAN_PRICES_INR[customer.plan],
        plan: customer.plan,
        status: "success",
        razorpay_order_id,
        razorpay_payment_id,
      },
    ]),
  });

  if (!paymentRes.ok) {
    return jsonError("Order saved, but recording payment failed: " + (await paymentRes.text()), 502);
  }

  return new Response(JSON.stringify({ success: true, customer_id: customerRow.id }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function verifySignature(payload, signature, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const computed = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(computed, signature);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
