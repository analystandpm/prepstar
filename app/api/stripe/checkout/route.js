import Stripe from "stripe";
import { getUser, getSupabaseAdmin } from "../../../../lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const admin = getSupabaseAdmin();

  // Reuse an existing Stripe customer if we have one.
  const { data: usage } = await admin
    .from("usage")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = usage?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("usage").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: site + "/?upgraded=1",
    cancel_url: site + "/",
    metadata: { user_id: user.id },
  });

  return Response.json({ url: session.url });
}
