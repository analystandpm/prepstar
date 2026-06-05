"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const CATEGORY_COLORS = {
  Behavioural: "#C8492A",
  "Role-specific": "#6E7A5E",
  Situational: "#9B6A3C",
  Strategic: "#3E5C6B",
};

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function Page() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const [view, setView] = useState("input");
  const [jobTitle, setJobTitle] = useState("");
  const [seniority, setSeniority] = useState("Mid");
  const [jd, setJd] = useState("");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [paywall, setPaywall] = useState(false);

  const [open, setOpen] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loadingAnswer, setLoadingAnswer] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [critiques, setCritiques] = useState({});
  const [loadingCritique, setLoadingCritique] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    if (!email.includes("@")) return;
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSent(true);
  }

  async function startCheckout() {
    const { data } = await post("/api/stripe/checkout", {});
    if (data.url) window.location.href = data.url;
  }

  async function generate() {
    if (!jobTitle.trim() || jd.trim().length < 40) {
      setError("Add a job title and paste at least a few lines of the job description.");
      return;
    }
    setError("");
    setView("loading");
    const { ok, status, data } = await post("/api/generate", { jobTitle, seniority, jd });
    if (status === 402) {
      setPaywall(true);
      setView("input");
      return;
    }
    if (!ok) {
      setError("Couldn't generate. Try again.");
      setView("input");
      return;
    }
    setQuestions(data.questions || []);
    setView("results");
  }

  async function buildAnswer(idx) {
    if (answers[idx]) {
      setOpen(open === idx ? null : idx);
      return;
    }
    setOpen(idx);
    setLoadingAnswer(idx);
    const { data } = await post("/api/answer", {
      jobTitle, seniority, jd, question: questions[idx].question,
    });
    setAnswers((a) => ({ ...a, [idx]: data }));
    setLoadingAnswer(null);
  }

  async function critique(idx) {
    const draft = (drafts[idx] || "").trim();
    if (draft.length < 30) return;
    setLoadingCritique(idx);
    const { data } = await post("/api/critique", {
      jobTitle, seniority, question: questions[idx].question, draft,
    });
    setCritiques((c) => ({ ...c, [idx]: data }));
    setLoadingCritique(null);
  }

  function reset() {
    setView("input");
    setQuestions([]); setAnswers({}); setDrafts({}); setCritiques({});
    setOpen(null); setJd(""); setJobTitle("");
  }

  // ---- Auth gate ----
  if (session === undefined) {
    return <div className="ps-root"><style>{CSS}</style><div className="ps-loading"><div className="ps-spinner">✦</div></div></div>;
  }

  if (!session) {
    return (
      <div className="ps-root">
        <style>{CSS}</style>
        <header className="ps-header">
          <div className="ps-brand"><span className="ps-star">✦</span> PrepStar</div>
          <div className="ps-tag">Interview answers, tailored to the job.</div>
        </header>
        <main className="ps-main">
          <div className="ps-hero">
            <div className="ps-kicker">FREE — ONE FULL JOB</div>
            <h1>Walk into the room<br /><em>already prepared.</em></h1>
            <p className="ps-sub">Sign in with your email to start. No password — we'll send a magic link.</p>
          </div>
          <div className="ps-card ps-form">
            <label className="ps-label">EMAIL</label>
            <input className="ps-input" placeholder="you@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} />
            {sent
              ? <div className="ps-mini">Check your inbox for the sign-in link.</div>
              : <button className="ps-cta" onClick={signIn}>Send me a magic link →</button>}
          </div>
        </main>
        <footer className="ps-footer">Built with Claude · @analystandpm</footer>
      </div>
    );
  }

  // ---- Signed-in app ----
  return (
    <div className="ps-root">
      <style>{CSS}</style>
      <header className="ps-header">
        <div className="ps-brand"><span className="ps-star">✦</span> PrepStar</div>
        <button className="ps-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      {view === "input" && (
        <main className="ps-main">
          <div className="ps-hero">
            <div className="ps-kicker">FREE — ONE FULL JOB</div>
            <h1>Walk into the room<br /><em>already prepared.</em></h1>
            <p className="ps-sub">Paste the job ad. Get the questions you'll actually be asked, a scaffold for each answer, and live coaching on your own drafts.</p>
          </div>
          <div className="ps-card ps-form">
            <label className="ps-label">ROLE TITLE</label>
            <input className="ps-input" placeholder="e.g. Head of Product, Product Owner, Growth PM…"
              value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <label className="ps-label">SENIORITY</label>
            <div className="ps-pills">
              {["Junior", "Mid", "Senior", "Lead / Head of"].map((s) => (
                <button key={s} className={"ps-pill" + (seniority === s ? " on" : "")}
                  onClick={() => setSeniority(s)}>{s}</button>
              ))}
            </div>
            <label className="ps-label">JOB DESCRIPTION</label>
            <textarea className="ps-textarea" placeholder="Paste the full job ad here…"
              value={jd} onChange={(e) => setJd(e.target.value)} />
            {error && <div className="ps-error">{error}</div>}
            <button className="ps-cta" onClick={generate}>Build my prep sheet →</button>
          </div>
        </main>
      )}

      {view === "loading" && (
        <main className="ps-loading">
          <div className="ps-spinner">✦</div>
          <p>Reading the job ad and predicting your questions…</p>
        </main>
      )}

      {view === "results" && (
        <main className="ps-main">
          <div className="ps-results-head">
            <div>
              <div className="ps-kicker">YOUR PREP SHEET</div>
              <h2>{jobTitle}</h2>
              <span className="ps-meta">{seniority} · {questions.length} likely questions</span>
            </div>
            <button className="ps-ghost" onClick={reset}>+ New job</button>
          </div>
          <div className="ps-qlist">
            {questions.map((q, idx) => (
              <div className="ps-qcard" key={idx}>
                <button className="ps-qhead" onClick={() => buildAnswer(idx)}>
                  <span className="ps-cat" style={{ color: CATEGORY_COLORS[q.category] || "#57544B" }}>{q.category}</span>
                  <span className="ps-q">{q.question}</span>
                  <span className="ps-why">{q.why}</span>
                  <span className="ps-chev">{open === idx ? "−" : "+"}</span>
                </button>
                {open === idx && (
                  <div className="ps-qbody">
                    {loadingAnswer === idx && <div className="ps-mini">Building your scaffold…</div>}
                    {answers[idx] && !answers[idx].error && (
                      <>
                        <div className="ps-approach">{answers[idx].approach}</div>
                        <div className="ps-star">
                          {["situation", "task", "action", "result"].map((k) => (
                            <div className="ps-starrow" key={k}>
                              <span className="ps-starlabel">{k[0].toUpperCase()}</span>
                              <div><strong>{k}</strong><p>{answers[idx].star?.[k]}</p></div>
                            </div>
                          ))}
                        </div>
                        <div className="ps-sample">
                          <span className="ps-samplelabel">SAMPLE OPENING</span>
                          {answers[idx].sampleAngle}
                        </div>
                        {answers[idx].watchouts && (
                          <ul className="ps-watch">
                            {answers[idx].watchouts.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        )}
                        <div className="ps-critique">
                          <label className="ps-label">PRACTISE — paste your answer for live coaching</label>
                          <textarea className="ps-textarea sm" placeholder="Type your answer the way you'd say it out loud…"
                            value={drafts[idx] || ""} onChange={(e) => setDrafts((d) => ({ ...d, [idx]: e.target.value }))} />
                          <button className="ps-cta sm" onClick={() => critique(idx)} disabled={loadingCritique === idx}>
                            {loadingCritique === idx ? "Coaching…" : "Score & improve my answer →"}
                          </button>
                          {critiques[idx] && !critiques[idx].error && (
                            <div className="ps-feedback">
                              <div className="ps-score">{critiques[idx].score}<span>/10</span></div>
                              <div className="ps-fbcol">
                                <div className="ps-fbblock"><strong>Strengths</strong>
                                  <ul>{(critiques[idx].strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                                <div className="ps-fbblock"><strong>Improve</strong>
                                  <ul>{(critiques[idx].improvements || []).map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                                <div className="ps-fbblock full"><strong>Tightened version</strong>
                                  <p>{critiques[idx].rewrite}</p></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {paywall && (
        <div className="ps-overlay" onClick={() => setPaywall(false)}>
          <div className="ps-paywall" onClick={(e) => e.stopPropagation()}>
            <div className="ps-kicker">YOU'VE USED YOUR FREE JOB</div>
            <h3>Keep prepping for every interview.</h3>
            <div className="ps-price">$12<span>/mo</span></div>
            <ul className="ps-plist">
              <li>Unlimited jobs & prep sheets</li>
              <li>Live answer coaching on every question</li>
              <li>Saved history across all your applications</li>
            </ul>
            <button className="ps-cta" onClick={startCheckout}>Upgrade to PrepStar Pro →</button>
            <button className="ps-ghost" onClick={() => setPaywall(false)}>Maybe later</button>
          </div>
        </div>
      )}

      <footer className="ps-footer">Built with Claude · @analystandpm</footer>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
.ps-root { --cream:#F3EEE3; --paper:#FBF8F1; --ink:#1C1B17; --soft:#57544B; --accent:#C8492A; --line:#E0D9C9;
  font-family:'Hanken Grotesk',sans-serif; color:var(--ink); background:var(--cream);
  background-image:radial-gradient(var(--line) 0.5px, transparent 0.5px); background-size:22px 22px; min-height:100vh; padding-bottom:40px; }
.ps-root * { box-sizing:border-box; }
.ps-header { display:flex; align-items:center; justify-content:space-between; padding:22px 28px; border-bottom:1px solid var(--line); flex-wrap:wrap; gap:8px; }
.ps-brand { font-family:'Fraunces',serif; font-size:24px; font-weight:600; letter-spacing:-0.5px; }
.ps-star { color:var(--accent); }
.ps-tag { font-size:13px; color:var(--soft); }
.ps-main { max-width:760px; margin:0 auto; padding:36px 24px; }
.ps-kicker { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:2px; color:var(--accent); margin-bottom:14px; }
.ps-hero h1 { font-family:'Fraunces',serif; font-weight:600; font-size:46px; line-height:1.02; letter-spacing:-1px; margin:0 0 18px; }
.ps-hero h1 em { color:var(--accent); font-style:italic; }
.ps-sub { font-size:17px; line-height:1.55; color:var(--soft); max-width:520px; margin:0 0 32px; }
.ps-card { background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:28px; }
.ps-label { display:block; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:1.5px; color:var(--soft); margin:18px 0 8px; }
.ps-label:first-child { margin-top:0; }
.ps-input, .ps-textarea { width:100%; border:1px solid var(--line); background:#fff; border-radius:10px; padding:13px 14px; font-family:inherit; font-size:15px; color:var(--ink); outline:none; transition:border-color .15s; }
.ps-input:focus, .ps-textarea:focus { border-color:var(--accent); }
.ps-textarea { min-height:150px; resize:vertical; line-height:1.5; }
.ps-textarea.sm { min-height:90px; }
.ps-pills { display:flex; gap:8px; flex-wrap:wrap; }
.ps-pill { border:1px solid var(--line); background:#fff; color:var(--soft); border-radius:999px; padding:8px 16px; font-family:inherit; font-size:14px; cursor:pointer; transition:all .15s; }
.ps-pill.on { background:var(--ink); color:var(--cream); border-color:var(--ink); }
.ps-cta { margin-top:24px; width:100%; background:var(--accent); color:#fff; border:none; border-radius:10px; padding:15px; font-family:inherit; font-size:16px; font-weight:600; cursor:pointer; transition:transform .1s, background .15s; }
.ps-cta:hover { background:#a93b20; }
.ps-cta:active { transform:translateY(1px); }
.ps-cta.sm { width:auto; padding:11px 18px; font-size:14px; margin-top:12px; }
.ps-cta:disabled { opacity:.6; cursor:default; }
.ps-error { color:var(--accent); font-size:14px; margin-top:14px; }
.ps-loading { text-align:center; padding:90px 24px; color:var(--soft); }
.ps-spinner { font-size:40px; color:var(--accent); animation:spin 1.4s linear infinite; display:inline-block; }
@keyframes spin { to { transform:rotate(360deg); } }
.ps-results-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:28px; flex-wrap:wrap; }
.ps-results-head h2 { font-family:'Fraunces',serif; font-size:30px; font-weight:600; margin:0 0 4px; letter-spacing:-0.5px; }
.ps-meta { font-size:13px; color:var(--soft); }
.ps-ghost { background:none; border:1px solid var(--line); color:var(--soft); border-radius:999px; padding:9px 16px; font-family:inherit; font-size:14px; cursor:pointer; }
.ps-ghost:hover { border-color:var(--ink); color:var(--ink); }
.ps-qlist { display:flex; flex-direction:column; gap:12px; }
.ps-qcard { background:var(--paper); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.ps-qhead { width:100%; text-align:left; background:none; border:none; cursor:pointer; padding:18px 20px; display:grid; grid-template-columns:1fr auto; grid-template-areas:"cat chev" "q chev" "why chev"; gap:4px 12px; font-family:inherit; }
.ps-cat { grid-area:cat; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; }
.ps-q { grid-area:q; font-size:17px; font-weight:600; line-height:1.3; }
.ps-why { grid-area:why; font-size:13px; color:var(--soft); }
.ps-chev { grid-area:chev; align-self:center; font-size:22px; color:var(--accent); }
.ps-qbody { padding:0 20px 22px; border-top:1px solid var(--line); }
.ps-mini { padding:16px 0; color:var(--soft); font-size:14px; }
.ps-approach { font-family:'Fraunces',serif; font-style:italic; font-size:18px; line-height:1.4; margin:18px 0 20px; }
.ps-star { display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
.ps-starrow { display:flex; gap:12px; align-items:flex-start; }
.ps-starlabel { flex:none; width:26px; height:26px; border-radius:6px; background:var(--ink); color:var(--cream); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; margin-top:2px; }
.ps-starrow strong { text-transform:capitalize; font-size:13px; }
.ps-starrow p { margin:2px 0 0; font-size:14px; color:var(--soft); line-height:1.45; }
.ps-sample { background:var(--cream); border-left:3px solid var(--accent); border-radius:0 8px 8px 0; padding:14px 16px; font-size:14.5px; line-height:1.5; margin-bottom:14px; }
.ps-samplelabel { display:block; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1.5px; color:var(--accent); margin-bottom:6px; }
.ps-watch { margin:0 0 8px; padding-left:18px; }
.ps-watch li { font-size:13.5px; color:var(--soft); line-height:1.5; margin-bottom:3px; }
.ps-critique { margin-top:22px; padding-top:20px; border-top:1px dashed var(--line); }
.ps-feedback { margin-top:18px; background:#fff; border:1px solid var(--line); border-radius:12px; padding:18px; display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap; }
.ps-score { font-family:'Fraunces',serif; font-size:42px; font-weight:600; color:var(--accent); line-height:1; }
.ps-score span { font-size:16px; color:var(--soft); }
.ps-fbcol { flex:1; min-width:220px; display:flex; flex-direction:column; gap:12px; }
.ps-fbblock strong { font-size:13px; display:block; margin-bottom:4px; }
.ps-fbblock ul { margin:0; padding-left:16px; }
.ps-fbblock li { font-size:13.5px; color:var(--soft); line-height:1.45; margin-bottom:2px; }
.ps-fbblock p { font-size:14px; line-height:1.5; margin:0; }
.ps-overlay { position:fixed; inset:0; background:rgba(28,27,23,0.55); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:24px; z-index:50; }
.ps-paywall { background:var(--paper); border-radius:18px; padding:34px; max-width:380px; text-align:center; border:1px solid var(--line); }
.ps-paywall h3 { font-family:'Fraunces',serif; font-size:26px; font-weight:600; margin:6px 0 14px; }
.ps-price { font-family:'Fraunces',serif; font-size:48px; font-weight:600; color:var(--accent); }
.ps-price span { font-size:18px; color:var(--soft); }
.ps-plist { list-style:none; padding:0; margin:18px 0; text-align:left; }
.ps-plist li { padding:8px 0 8px 26px; position:relative; font-size:15px; border-bottom:1px solid var(--line); }
.ps-plist li:before { content:"✦"; color:var(--accent); position:absolute; left:0; }
.ps-paywall .ps-ghost { margin-top:10px; width:100%; }
.ps-footer { text-align:center; font-size:12px; color:var(--soft); margin-top:40px; font-family:'JetBrains Mono',monospace; letter-spacing:1px; }
@media (max-width:560px) { .ps-hero h1 { font-size:36px; } .ps-header { padding:18px; } .ps-main { padding:26px 18px; } }
`;
