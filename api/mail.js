// A5 PDF를 메일로 보내기 (Resend). 환경변수: RESEND_API_KEY, MAIL_TO
import { checkFamily } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!checkFamily(req, res)) return;
  const key = process.env.RESEND_API_KEY;
  const to = process.env.MAIL_TO;
  if (!key || !to) return res.status(503).json({ error: "메일 설정(RESEND_API_KEY, MAIL_TO)이 아직 없어요.", notConfigured: true });

  const { subject, html, pdf, filename } = req.body || {};
  if (!pdf) return res.status(400).json({ error: "PDF가 없어요." });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "또박이 <onboarding@resend.dev>",
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject: String(subject || "또박이 가족 글쓰기").slice(0, 150),
      html: String(html || ""),
      attachments: [{ filename: String(filename || "writing.pdf").replace(/[\\/:*?"<>|]/g, "_"), content: pdf }],
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return res.status(502).json({ error: "메일 보내기 실패: " + (data.message || r.status) });
  return res.json({ ok: true, id: data.id });
}
