import { callClaudeJSON } from "../../../lib/claude";
import { getUser, getSupabaseAdmin } from "../../../lib/supabaseServer";

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: usage } = await admin
    .from("usage")
    .select("free_used, is_pro")
    .eq("user_id", user.id)
    .single();

  // Gate: pro users are unlimited; free users get exactly one job.
  if (!usage?.is_pro && usage?.free_used) {
    return Response.json({ error: "upgrade_required" }, { status: 402 });
  }

  const { jobTitle, seniority, jd } = await req.json();
  if (!jobTitle || !jd || jd.length < 40) {
    return Response.json({ error: "Missing job title or description" }, { status: 400 });
  }

  const prompt =
    "Role title: " + jobTitle + ". Seniority: " + seniority +
    ". Job description:\n" + jd.slice(0, 1500) +
    "\n\nGenerate the 6 most likely interview questions for THIS specific role. " +
    "Mix behavioural, role-specific, situational and strategic questions, drawn from the job description where possible. " +
    "Return ONLY a JSON array. Each item: " +
    '{"question": string, "category": one of ["Behavioural","Role-specific","Situational","Strategic"], ' +
    '"why": one concise sentence on why an interviewer asks this for this role}.';

  try {
    const result = await callClaudeJSON(prompt);
    const questions = Array.isArray(result) ? result : result.questions || [];

    // Burn the free job (only for non-pro users).
    if (!usage?.is_pro) {
      await admin.from("usage").update({ free_used: true }).eq("user_id", user.id);
    }

    return Response.json({ questions });
  } catch (e) {
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
