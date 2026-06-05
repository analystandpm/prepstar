# PrepStar

A tailored interview-prep web app. Paste a job ad, get the likely questions, answer
scaffolds, and live coaching on your own draft answers — powered by Claude. Email
sign-in (Supabase), one free job per user, then a $12/mo subscription (Stripe).

This is a real, deployable Next.js app. Below is everything to get it live on your own URL.

---

## What's inside

```
app/
  page.jsx                  the whole UI (sign-in, prep sheet, paywall)
  layout.jsx
  api/generate/route.js     predicts questions + enforces the free/paid gate
  api/answer/route.js       builds a STAR scaffold for one question
  api/critique/route.js     scores and rewrites your draft answer
  api/stripe/checkout       starts a subscription checkout
  api/stripe/webhook        flips users to Pro when they pay
lib/
  claude.js                 server-side Claude call (your key stays hidden here)
  supabaseServer.js         reads the signed-in user; admin client for writes
  supabaseClient.js         browser auth client
supabase/schema.sql         the one table + trigger you need to run
.env.example                copy to .env.local and fill in
```

The Anthropic key lives only in server routes (`lib/claude.js`), so it is never
exposed to the browser.

---

## Setup (about a weekend, most of it accounts)

### 1. Install
```
npm install
cp .env.example .env.local
```

### 2. Supabase (accounts + the free/paid gate)
1. Create a free project at supabase.com.
2. Settings > API: copy the Project URL, the `anon` key, and the `service_role` key
   into `.env.local`.
3. SQL Editor > paste and run `supabase/schema.sql`. This creates the `usage` table
   and auto-creates a row for every new user.
4. Authentication > Providers: make sure Email is on. For zero-friction sign-in,
   "magic link" is already what the app uses.

### 3. Anthropic
1. Get an API key from console.anthropic.com and put it in `ANTHROPIC_API_KEY`.
2. `CLAUDE_MODEL` defaults to `claude-sonnet-4-6` (good and cheap). For sharper
   critique you can switch to `claude-opus-4-8`. Check the current model list at
   https://docs.claude.com/en/docs/about-claude/models/overview before deploying.

### 4. Stripe (the subscription)
1. In the Stripe Dashboard, create a Product with a $12/month recurring price.
   Copy the price ID (`price_...`) into `STRIPE_PRICE_ID`.
2. Copy your secret key (`sk_test_...` to start) into `STRIPE_SECRET_KEY`.
3. Webhook: Developers > Webhooks > add endpoint
   `https://YOUR_DOMAIN/api/stripe/webhook`, subscribe to
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`.
   - Locally, use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### 5. Run it
```
npm run dev
```
Open http://localhost:3000. Sign in, generate one job (free), generate a second
to see the paywall, pay with a Stripe test card (4242 4242 4242 4242), and confirm
the webhook flips you to Pro (your `usage` row `is_pro` becomes true).

### 6. Deploy (your shareable URL for Instagram)
1. Push to GitHub, import the repo at vercel.com.
2. Add every variable from `.env.local` into Vercel's Environment Variables.
3. Set `NEXT_PUBLIC_SITE_URL` to your real Vercel URL (or custom domain).
4. Update the Stripe webhook endpoint to your live URL.
5. In Supabase Auth > URL Configuration, add your Vercel URL as a redirect URL.

That's the link you put in your Linktree / @analystandpm bio.

---

## Notes & honest caveats

- **Version drift:** Next.js, the Supabase libraries, and the Stripe SDK all move
  fast. The code follows current conventions (App Router route handlers,
  `@supabase/ssr`, Stripe webhook raw-body verification), but if `npm install` pulls
  a newer major version with breaking changes, check that library's migration guide.
- **The gate is on generation only.** Building scaffolds and critiques is open to any
  signed-in user once they've generated a sheet. If abuse becomes a problem, add the
  same `usage` check to `answer` and `critique` routes.
- **Saved history** is listed as a Pro feature on the paywall but isn't built yet —
  it's a natural next step (a `sheets` table keyed by user). Easy to add when you
  want it.
- **Costs:** each full job is a handful of short Claude calls. On Sonnet that's
  fractions of a cent per call, so your margin on a $12/mo subscriber is very healthy
  unless someone is generating dozens of jobs a day.
- **Switch to live Stripe keys** only after you've tested the full flow with test keys.
```
