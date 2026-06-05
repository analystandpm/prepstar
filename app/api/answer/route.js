import { callClaudeJSON } from "../../../lib/claude";
import { getUser } from "../../../lib/supabaseServer";

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { jobTitle, seniority, jd, question } = await req.json();
  if (!question) return Response.json({ error: "Missing question" }, { status: 400 });

  const prompt =
    "Role: " + jobTitle + " (" + seniority + '). Question: "' + question +
    '". Job description context:\n' + (jd || "").slice(0, 1200) +
    "\n\nProduce a coaching scaffold to help the candidate build THEIR OWN strong answer. " +
    "Do NOT fabricate their experience. Return ONLY JSON: " +
    '{"approach": one sentence on how to frame it, ' +
    '"star": {"situation": guidance prompt, "task": guidance prompt, "action": guidance prompt, "result": guidance prompt}, ' +
    '"sampleAngle": a 2 sentence example opening they can adapt, "watchouts": [up to 3 short strings]}.';

  try {
    const result = await callClaudeJSON(prompt);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
