# QR Keychain Loversite

A plain HTML/CSS/JS site (no framework, no build step) where couples order a
personalized private "Loversite" page and a physical QR keychain that links
to it. Hosted on Cloudflare Pages, data in Supabase, payments via Razorpay.

## What's here

```
index.html, order.html, loversite.html   public site
legal/                                    terms / privacy / refund pages
admin/                                    admin login, dashboard, page editor + QR generator
assets/css, assets/js                     styles and client-side logic
functions/api/                            Cloudflare Pages Functions (server-side: payment, view tracking)
cron-worker/                              separate Cloudflare Worker for daily auto-expiry (see below)
sql/schema.sql                            Supabase tables + Row Level Security policies
_redirects                                /love/:slug -> loversite.html?c=:slug
```

Everything is code-complete. To actually run payments, photo uploads, and
admin data you need to plug in your own free-tier accounts — nothing here
will work live until you do the steps below.

## 1. Supabase setup

1. Create a free project at supabase.com.
2. Open the SQL Editor and run all of `sql/schema.sql`. This creates the
   `customers`, `pages`, `payments` tables, their Row Level Security
   policies, and the `increment_page_views` helper function.
3. Go to **Storage** → **New bucket** → name it `photos`, mark it **Public**.
   Then add a storage policy allowing `INSERT` (and `SELECT`) for anyone —
   the order form uploads photos before the customer has an admin account.
4. Go to **Authentication** → **Users** → **Add user** to create your admin
   login (email + password). This is the account you'll use to log into
   `/admin`. RLS policies in `schema.sql` treat any authenticated user as an
   admin, so only create accounts for people who should have admin access.
5. Go to **Project Settings** → **API** and copy:
   - `Project URL` → used as `SUPABASE_URL`
   - `anon public` key → goes in `assets/js/config.js`
   - `service_role` key → used as `SUPABASE_SERVICE_KEY` (server-side only,
     set as a Pages **secret**, never put this in client code)

## 2. Razorpay setup

1. Create a free Razorpay account and complete KYC (needed before you can
   accept live payments; test mode works immediately for development).
2. Go to **Settings → API Keys** and generate a Key ID / Key Secret.
3. `RAZORPAY_KEY_ID` goes in `assets/js/config.js` (safe to expose — it only
   identifies your account, it can't move money on its own).
4. `RAZORPAY_KEY_SECRET` is server-side only — set it as a Cloudflare Pages
   **secret**, never put it in client code.

## 3. Fill in `assets/js/config.js`

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "your anon key",
  RAZORPAY_KEY_ID: "your razorpay key id",
  SITE_BASE_URL: "https://your-site.pages.dev", // update after first deploy
  PLAN_PRICES: { monthly: 99, yearly: 999, lifetime: 1499 },
};
```

## 4. Deploy to Cloudflare Pages

1. Push this folder to a GitHub repo (or use `wrangler pages deploy .`
   directly).
2. In the Cloudflare dashboard, create a Pages project from that repo.
   Build command: none. Output directory: `/` (root).
3. In **Settings → Environment variables**, add for the **Production**
   (and Preview, if you want) environment:
   - `RAZORPAY_KEY_SECRET` (secret)
   - `SUPABASE_URL` (plain text is fine, or secret)
   - `SUPABASE_SERVICE_KEY` (secret)
4. Redeploy. Update `SITE_BASE_URL` in `assets/js/config.js` to your real
   `*.pages.dev` URL (or custom domain) once you have it, then redeploy again
   — this is what gets encoded into every QR code.

## 5. Auto-expiry cron (optional but recommended, TR-04)

Cloudflare Pages Functions can't run on a schedule — only a standalone
Worker can. `cron-worker/` is a separate small Worker that flips
`customers.status` to `expired` once a day for anyone past their
`expiry_date`.

```
cd cron-worker
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler deploy
```

Edit the cron schedule in `cron-worker/wrangler.toml` if 02:00 UTC daily
doesn't suit you.

## 6. Test end-to-end

1. Visit `/order.html`, submit the form with Razorpay in **test mode**
   (use Razorpay's published test card numbers).
2. Log into `/admin` with the user you created in Supabase Auth.
3. On the dashboard, click **Create Page** next to the new order, fill in
   the slug/start date, save — this generates the QR code and activates the
   customer.
4. Scan the QR (or visit `/love/<slug>`) to see the public Loversite page,
   and confirm the view counter increments in the dashboard.

## Notes on the admin auth model

Any user you create in Supabase Authentication is treated as an admin by
the RLS policies in `sql/schema.sql` (`auth.role() = 'authenticated'`). Only
create Supabase Auth users for people who should be able to see customer
PII and edit every Loversite page.
