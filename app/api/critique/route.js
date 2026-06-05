import { callClaudeJSON } from "../../../lib/claude";
import { getUser } from "../../../lib/supabaseServer";

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { jobTitle, seniority, question, draft } = await req.json();
  if (!draft || draft.length < 30) {
    return Response.json({ error: "Draft too short" }, { status: 400 });
  }

  const prompt =
    "Role: " + jobTitle + " (" + seniority + '). Question: "' + question +
    '". Candidate\'s draft answer:\n' + draft +
    "\n\nGive specific, honest coaching feedback. Return ONLY JSON: " +
    '{"score": number 1-10, "strengths": [up to 3 short strings], ' +
    '"improvements": [up to 3 short strings], ' +
    '"rewrite": a tightened STAR version in 4-6 sentences}.';

  try {
    const result = await callClaudeJSON(prompt);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
