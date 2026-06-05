import { getUser, getSupabaseAdmin } from "../../../lib/supabaseServer";

// GET: list the signed-in user's saved sheets (newest first).
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("sheets")
    .select("id, title, seniority, jd, questions, answers, critiques, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: "Failed" }, { status: 500 });
  return Response.json({ sheets: data || [] });
}

// POST: create a new sheet (no id) or update an existing one (id provided).
export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const body = await req.json();

  const row = {
    user_id: user.id,
    title: body.title || "Untitled role",
    seniority: body.seniority || null,
    jd: body.jd || null,
    questions: body.questions || [],
    answers: body.answers || {},
    critiques: body.critiques || {},
  };

  if (body.id) {
    const { error } = await admin
      .from("sheets")
      .update(row)
      .eq("id", body.id)
      .eq("user_id", user.id);
    if (error) return Response.json({ error: "Failed" }, { status: 500 });
    return Response.json({ id: body.id });
  }

  const { data, error } = await admin
    .from("sheets")
    .insert(row)
    .select("id")
    .single();
  if (error) return Response.json({ error: "Failed" }, { status: 500 });
  return Response.json({ id: data.id });
}
