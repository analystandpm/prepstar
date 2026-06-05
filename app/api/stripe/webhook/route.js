import Stripe from "stripe";
import { getSupabaseAdmin } from "../../../../lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body required for signature check

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response("Webhook signature failed", { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Set is_pro true when a subscription becomes active, false when it ends.
  async function setProByCustomer(customerId, isPro) {
    await admin.from("usage").update({ is_pro: isPro }).eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.metadata?.user_id) {
        await admin.from("usage").update({ is_pro: true }).eq("user_id", s.metadata.user_id);
      } else if (s.customer) {
        await setProByCustomer(s.customer, true);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const active = sub.status === "active" || sub.status === "trialing";
      await setProByCustomer(sub.customer, active);
      break;
    }
    case "customer.subscription.deleted": {
      await setProByCustomer(event.data.object.customer, false);
      break;
    }
    default:
      break;
  }

  return Response.json({ received: true });
}
