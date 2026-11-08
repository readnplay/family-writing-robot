/* 앱(index.html)과 블로그(blog.html)가 함께 쓰는 코드: 배지 그림, 블로그 글, A5 인쇄 문서 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function safeColor(c, d) { return /^#[0-9a-fA-F]{6}$/.test(c || "") ? c : d; }

const ROBOT_NAME = "또박이";
const FAMILY = [
  { id: "울", role: "아빠" },
  { id: "펄", role: "엄마" },
  { id: "밍", role: "민결" },
];
const AWARD_TEXT = { gold: "🥇 금메달", silver: "🥈 은메달", bronze: "🥉 동메달" };

/* ---------- 배지 그림 ---------- */
const TIER = { gold: { c: "#f5b301", t: "1등" }, silver: { c: "#a9b4bf", t: "2등" }, challenge: { c: "#3fb57a", t: "도전" } };
function starPts(cx, cy, R, r, n = 5) { const p = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n; const rad = i % 2 ? r : R; p.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`); } return p.join(" "); }
function badgeSVG(b, tier, size = 110) {
  b = b || {}; const id = "g" + Math.random().toString(36).slice(2, 9);
  const c1 = safeColor(b.color1, "#ffb86b"), c2 = safeColor(b.color2, "#ff7a45");
  const T = TIER[tier] || null; const ring = T ? T.c : "#d9cbb8";
  const shapes = {
    circle: `<circle cx="60" cy="56" r="42"/>`,
    hexagon: `<polygon points="60,12 98,34 98,78 60,100 22,78 22,34"/>`,
    shield: `<path d="M60 12 L98 25 V56 C98 80 81 94 60 102 C39 94 22 80 22 56 V25 Z"/>`,
    star: `<polygon points="${starPts(60, 58, 48, 30)}"/>`,
    flower: `<g>${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${(60 + 24 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(56 + 24 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="20"/>`).join("")}<circle cx="60" cy="56" r="26"/></g>`,
  };
  const shape = shapes[b.shape] || shapes.circle;
  return `<svg width="${size}" height="${size * 1.18}" viewBox="0 0 120 142" role="img" aria-label="${esc((b.name || "배지") + (T ? " " + T.t : ""))}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    ${T ? `<path d="M40 88 L30 136 L46 126 L56 138 L60 94 Z" fill="${ring}" opacity=".9"/><path d="M80 88 L90 136 L74 126 L64 138 L60 94 Z" fill="${ring}" opacity=".75"/>` : ""}
    <g fill="${ring}" transform="translate(60 56) scale(1.13) translate(-60 -56)">${shape}</g>
    <g fill="url(#${id})">${shape}</g>
    <text x="60" y="70" text-anchor="middle" font-size="40">${esc(b.emoji || "✏️")}</text>
    ${T ? `<rect x="36" y="${b.shape === "star" ? 98 : 92}" width="48" height="20" rx="10" fill="#fff" stroke="${ring}" stroke-width="3"/><text x="60" y="${b.shape === "star" ? 113 : 107}" text-anchor="middle" font-size="12" font-weight="700" fill="#333" font-family="Jua, sans-serif">${T.t}</text>` : ""}
  </svg>`;
}

/* ---------- 완료된 글쓰기 → 블로그 글 (인터뷰 답은 넣지 않음) ---------- */
function postFromSession(s) {
  const rankOf = (id) => (s.ranking || []).findIndex((r) => r.id === id);
  return {
    id: s.id,
    date: s.date,
    season: s.season || null, game: s.game || null, mult: s.event?.mult || 1,
    publishedAt: Date.now(),
    topic: { title: s.topic.title, question: s.topic.question, situation: s.topic.situation, badge: s.topic.badge },
    people: FAMILY.filter((p) => s.entries?.[p.id]?.result).map((p) => {
      const r = s.entries[p.id].result;
      return {
        id: p.id, role: p.role, rank: rankOf(p.id) + 1, medal: s.medals?.[p.id] || null, points: s.points?.[p.id] || 0, award: s.awards?.[p.id] === "gold" ? "gold" : null,
        total: r.total, scores: r.scores, transcript: r.transcript || "",
        praise: r.praise || [], improve: r.improve || [], corrections: r.corrections || [],
        rewrite_example: r.rewrite_example || "", next_mission: r.next_mission || "", teacher_comment: r.teacher_comment || "",
        comments: r.comments || [], revision_task: r.revision_task || null, last_mission_check: r.last_mission_check || "",
      };
    }),
  };
}

const SCORE_NAMES = { structure: "짜임", content: "내용", sentence: "문단·문장", spelling: "맞춤법", handwriting: "글씨" };
const markUnknown = (t) => esc(t).replace(/\[\?\]/g, '<span style="background:#ffd8a8;border-radius:3px">[?]</span>');
const list = (arr) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");

/* 블로그·네이버 블로그 복사용 본문 (인라인 스타일만 사용) */
function postBodyHTML(post) {
  const t = post.topic;
  return `<div style="font-size:16px;line-height:1.8;color:#2b2622">
  <p style="color:#7a6f66;margin:0">${esc(post.date)} · ${post.season ? `시즌 ${post.season} 제${post.game}편 · ` : ""}${ROBOT_NAME}와 함께한 가족 글쓰기</p>
  <h2 style="margin:6px 0">${esc(t.title)}</h2>
  <p style="margin:0 0 6px"><b>❓ ${esc(t.question)}</b></p>
  ${t.situation ? `<p style="margin:0 0 10px">${esc(t.situation)}</p>` : ""}
  <p style="margin:0 0 14px">오늘의 배지: ${esc(t.badge?.emoji || "")} <b>${esc(t.badge?.name || "")}</b> “${esc(t.badge?.motto || "")}”</p>
  ${post.people.map((p) => `
  <hr style="border:0;border-top:2px dashed #eadfce;margin:18px 0">
  <h3 style="margin:0 0 4px">✏️ ${esc(p.id)} (${esc(p.role)}) — ${p.medal ? "· " + AWARD_TEXT[p.medal] : ""}${p.award ? " · 🏅 배지" : ""}</h3>
  <div style="white-space:pre-wrap;background:#fffdf6;border:1px solid #eadfce;border-radius:8px;padding:12px;margin:8px 0">${markUnknown(p.transcript)}</div>
  <p style="margin:6px 0"><b>👩‍🏫 선생님 한마디</b><br>${esc(p.teacher_comment)}</p>
  ${p.praise.length ? `<p style="margin:6px 0 0"><b>👍 잘한 점</b></p>${list(p.praise)}` : ""}
  ${p.improve.length ? `<p style="margin:6px 0 0"><b>🔧 고칠 점</b></p>${list(p.improve)}` : ""}
  ${p.revision_task?.how ? `<p style="margin:6px 0"><b>🔄 고쳐 쓰기 미션</b> ${esc(p.revision_task.how)}</p>` : ""}
  ${p.next_mission ? `<p style="margin:6px 0"><b>🎯 다음 미션</b> ${esc(p.next_mission)}</p>` : ""}`).join("")}
</div>`;
}

/* ---------- A5 인쇄 문서 (한 사람당 한 장) ---------- */
const A5_CSS = `
.a5doc{font-family:"Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#2b2622}
.a5page{width:148mm;min-height:209mm;padding:9mm 10mm;box-sizing:border-box;background:#fff;font-size:10.5pt;line-height:1.65;page-break-after:always;break-after:page;position:relative}
.a5page:last-child{page-break-after:auto;break-after:auto}
.a5head{display:flex;gap:4mm;align-items:center;border-bottom:2px solid #ffd2b8;padding-bottom:3mm;margin-bottom:3mm}
.a5head .t{font-family:Jua,sans-serif;font-size:15pt;line-height:1.25}
.a5head .d{font-size:8.5pt;color:#7a6f66}
.a5q{font-size:9.5pt;margin:0 0 3mm}
.a5who{font-family:Jua,sans-serif;font-size:14pt;margin:0 0 1mm}
.a5score{font-size:8.5pt;color:#7a6f66;margin-bottom:2mm}
.a5text{white-space:pre-wrap;border:1px solid #eadfce;border-radius:3mm;padding:3mm;background:#fffdf6;margin-bottom:3mm}
.a5page h4{font-family:Jua,sans-serif;font-weight:400;font-size:11pt;margin:2.5mm 0 1mm}
.a5page ul{margin:0;padding-left:5mm}
.a5foot{position:absolute;bottom:5mm;right:10mm;font-size:7.5pt;color:#b3a89d}
@page{size:A5;margin:0}
`;
function a5HTML(post) {
  const t = post.topic;
  return `<div class="a5doc">${post.people.map((p) => `
  <section class="a5page">
    <div class="a5head">${p.award ? badgeSVG(t.badge, "gold", 52) : `<div style="font-size:34pt;line-height:1">${({ gold: "🥇", silver: "🥈", bronze: "🥉" })[p.medal] || "✏️"}</div>`}
      <div><div class="d">${esc(post.date)} · ${ROBOT_NAME} 가족 글쓰기</div><div class="t">${esc(t.title)}</div></div></div>
    <p class="a5q"><b>❓ ${esc(t.question)}</b></p>
    <div class="a5who">✏️ ${esc(p.id)} (${esc(p.role)}) ${p.medal ? "· " + AWARD_TEXT[p.medal] : ""}</div>
    <div class="a5score">${Object.entries(SCORE_NAMES).map(([k, n]) => `${n} ${p.scores?.[k] ?? "-"}`).join(" · ")}</div>
    <h4>📄 내가 쓴 글</h4>
    <div class="a5text">${markUnknown(p.transcript)}</div>
    <h4>👩‍🏫 선생님 한마디</h4><div>${esc(p.teacher_comment)}</div>
    ${p.praise.length ? `<h4>👍 잘한 점</h4>${list(p.praise)}` : ""}
    ${p.improve.length ? `<h4>🔧 고칠 점</h4>${list(p.improve)}` : ""}
    ${(p.comments || []).length ? `<h4>📝 선생님 메모</h4><ul>${p.comments.slice(0, 4).map((c) => `<li>${c.quote ? `“${esc(c.quote)}” — ` : ""}${esc(c.text)}</li>`).join("")}</ul>` : ""}
    ${p.corrections.length ? `<h4>✏️ 맞춤법·문장 교정</h4><ul>${p.corrections.map((c) => `<li><s>${esc(c.from)}</s> → <b>${esc(c.to)}</b></li>`).join("")}</ul>` : ""}
    ${p.revision_task?.how ? `<h4>🔄 고쳐 쓰기 미션</h4><div>${p.revision_task.target ? `“${esc(p.revision_task.target)}” → ` : ""}${esc(p.revision_task.how)}</div>` : ""}
    ${p.next_mission ? `<h4>🎯 다음 미션</h4><div>${esc(p.next_mission)}</div>` : ""}
    <div class="a5foot">${ROBOT_NAME} · ${esc(post.date)}</div>
  </section>`).join("")}</div>`;
}

/* A5 PDF 만들기 (html2pdf 필요). base64 문자열을 돌려줌 */
async function a5PdfBase64(post, { save = false } = {}) {
  if (!window.html2pdf) throw new Error("PDF 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-10000px;top:0;width:148mm;background:#fff";
  holder.innerHTML = `<style>${A5_CSS}</style>${a5HTML(post)}`;
  document.body.appendChild(holder);
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const worker = window.html2pdf().set({
      margin: 0,
      filename: `${post.date}_${post.topic.title}.pdf`,
      image: { type: "jpeg", quality: 0.88 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a5", orientation: "portrait" },
      pagebreak: { mode: ["css"] },
    }).from(holder.querySelector(".a5doc"));
    if (save) { await worker.save(); return null; }
    const uri = await worker.outputPdf("datauristring");
    return uri.split(",")[1];
  } finally {
    holder.remove();
  }
}
