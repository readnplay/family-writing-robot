// AI 선생님: 주제 만들기(topic) / 손글씨 인식 + 첨삭 + 채점(judge)
import Anthropic from "@anthropic-ai/sdk";
import { checkFamily } from "./_auth.js";

const MODEL = "claude-opus-5-5";
const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

const TEACHER = `당신은 대한민국 최고의 국어 선생님이자 논술 선생님, 문해력 선생님입니다.
한 가족(펄=엄마, 울=아빠, 밍=민결: 2017년생, 초등학교 3학년 겨울, 곧 4학년)이 같은 주제로 손글씨 글쓰기를 하고 서로 배지를 겨룹니다.
이 프로그램의 목적은 특히 밍(민결)의 글쓰기 실력과 글쓰기에 대한 흥미를 키우는 것입니다.

글의 짜임(가족이 정한 구조를 논술 이론에 맞게 다듬은 것):
- 서론(1문단): 문제 상황을 짧게 소개하고, 그 문제를 보고 느낀 점과 글의 방향을 밝힌다. (서론은 짧게)
- 본론1(원인): 문제가 왜 생겼는지 원인을 1~2가지 찾는다. 눈에 보이는 이유보다 핵심 원인을 찾을수록 좋다.
- 본론2(해결): 원인에 맞는 해결 방법을 "첫째, 둘째"로 쓰고 각각 "왜냐하면"으로 이유와 예를 붙인다(의견-이유-예-정리).
- 결론(1문단): 앞의 내용을 짧게 정리하고, 문제가 다시 생기지 않도록 앞으로 어떻게 할지 다짐한다.

수준 기준(사람마다 자기 수준에서 얼마나 잘했는지로 평가):
- 밍(민결): 2022 개정 국어 3~4학년군 쓰기 성취기준. 중심 문장과 뒷받침 문장을 갖춘 문단 쓰기, 자신의 의견과 그렇게 생각한 이유가 드러나게 쓰기, 고쳐 쓰기. 4문단 안팎 10~15문장이면 충분하다. 3학년은 자기 입장 중심으로 쓰는 것이 자연스러우니 그것을 감점하지 말고, 이유를 붙인 것을 크게 칭찬한다. 맞춤법은 초3 수준에서 흔한 실수는 가볍게만 감점한다.
- 펄(엄마), 울(아빠): 성인 논술 기준. 원인 분석의 깊이, 해결책의 구체성과 실현 가능성, 논리의 일관성, 문장력.`;

function extractJSON(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI 응답에서 JSON을 찾지 못했어요.");
  return JSON.parse(text.slice(start, end + 1));
}

async function ask({ system, content, effort }) {
  const base = {
    model: MODEL,
    max_tokens: 16000,
    system,
    output_config: { effort },
    messages: [{ role: "user", content }],
  };
  let response;
  try {
    response = await client.beta.messages.create({
      ...base,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (e) {
    // 대체 모델 옵션을 받지 않는 계정이면 옵션 없이 다시 시도
    if (e instanceof Anthropic.BadRequestError) response = await client.messages.create(base);
    else throw e;
  }
  if (response.stop_reason === "refusal") throw new Error("AI가 이 요청을 처리하지 못했어요. 다른 사진으로 다시 시도해 주세요.");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return extractJSON(text);
}

async function makeTopic({ answers, recentTopics, date }) {
  const system = `${TEACHER}

지금 할 일: 가족의 오늘 인터뷰 답변을 보고, 세 사람이 같은 주제로 쓸 "오늘의 글쓰기 주제"를 하나 정합니다.
- 주제는 반드시 "문제 → 원인 → 해결 → 재발 방지" 구조로 쓸 수 있는 생활 속 문제여야 합니다.
- 가족의 답변(날씨, 기분, 관심사, 겪은 일)에서 실마리를 찾아 연결하세요. 밍이 직접 겪어 봤거나 쉽게 상상할 수 있어야 합니다.
- 답변이 한 사람 것뿐이어도 괜찮습니다. 그 답변만으로 세 사람 모두 쓸 수 있는 주제를 만드세요. from_answers에는 누구의 답에서 골랐는지 적으세요.
- 너무 무겁거나 무서운 주제(죽음, 범죄, 재난 등)는 피하고, 최근 주제와 겹치지 않게 하세요.
- 배지는 오늘 주제를 상징하는 하나뿐인 디자인입니다. 이모지 1개, 어울리는 색 2개(#RRGGBB), 모양, 짧은 배지 이름(8자 이내)을 정하세요.

반드시 아래 JSON 하나만 출력하세요. 다른 말은 쓰지 마세요.
{
  "title": "주제 (예: 겨울 아침에 일어나기 힘든 문제)",
  "question": "글쓰기 질문 한 문장 (예: 겨울 아침에 일어나기 힘든 까닭은 무엇이고, 어떻게 하면 좋을까요?)",
  "situation": "문제 상황 설명 2~3문장",
  "from_answers": "가족 답변 중 어떤 이야기에서 이 주제를 뽑았는지 1~2문장",
  "kid_explain": "밍(초3)에게 쉬운 말로 주제를 설명하는 2문장",
  "guide": {
    "intro": ["서론에서 생각할 질문 2개"],
    "cause": ["원인을 찾는 질문 2개"],
    "solution": ["해결 방법을 찾는 질문 2개"],
    "conclusion": ["결론(재발 방지 다짐)을 위한 질문 2개"]
  },
  "words": ["글에 쓰면 좋은 낱말 5개"],
  "badge": { "name": "배지 이름", "emoji": "이모지 1개", "color1": "#RRGGBB", "color2": "#RRGGBB", "shape": "circle|shield|star|hexagon|flower", "motto": "배지에 새길 짧은 말(12자 이내)" }
}`;
  const text = `오늘 날짜: ${date}
최근 주제(겹치지 않게): ${(recentTopics || []).join(" / ") || "없음"}

가족 인터뷰 답변:
${JSON.stringify(answers, null, 2)}`;
  return ask({ system, content: [{ type: "text", text }], effort: "low" });
}

async function judge({ person, topic, images }) {
  const level = person === "밍" ? "밍(민결, 2017년생 초3 겨울) — 초등 3~4학년 기준" : `${person === "펄" ? "펄(엄마)" : "울(아빠)"} — 성인 기준`;
  const system = `${TEACHER}

지금 할 일: 사진 속 손글씨 글을 읽고(글자 인식), 첨삭하고, 점수를 매깁니다.
1) 글자 인식: 사진의 손글씨를 보이는 그대로 옮겨 적으세요. 맞춤법이나 띄어쓰기를 고치지 마세요(채점해야 하므로). 읽을 수 없는 글자나 낱말은 [?]로 표시하세요. 문단이 바뀌면 줄을 바꾸세요. 사진에 글이 없거나 거의 읽을 수 없으면 readable을 false로 하세요.
2) 채점(합계 100점). 반드시 글쓴이의 수준 기준에 맞춰, 그 수준에서 얼마나 잘했는지로 점수를 주세요.
   - structure(25): 서론·본론(원인, 해결)·결론 짜임이 있는가
   - content(25): 원인 찾기, 해결 방법과 그 이유, 재발 방지 다짐이 알찬가, 주제에 맞는가
   - sentence(20): 문단(중심 문장+뒷받침 문장)과 문장이 자연스러운가
   - spelling(15): 맞춤법과 띄어쓰기
   - handwriting(15): 다른 사람이 읽기 쉬운 글씨인가. [?]가 많을수록 감점. 거의 못 읽으면 0~3점.
3) 첨삭: 잘한 점은 구체적으로 칭찬하고, 고칠 점은 꼭 필요한 것만 짚으세요. ${person === "밍" ? "밍에게는 초3이 이해할 수 있는 다정하고 쉬운 존댓말로, 용기를 주는 말투로 쓰세요." : "어른에게는 정확하고 간결하게 쓰세요."}

반드시 아래 JSON 하나만 출력하세요. 다른 말은 쓰지 마세요.
{
  "readable": true,
  "transcript": "인식한 글 원문 그대로",
  "unreadable_count": 0,
  "parts": { "intro": "있음|약함|없음", "cause": "있음|약함|없음", "solution": "있음|약함|없음", "conclusion": "있음|약함|없음" },
  "scores": { "structure": 0, "content": 0, "sentence": 0, "spelling": 0, "handwriting": 0 },
  "total": 0,
  "praise": ["잘한 점 2~3개"],
  "improve": ["고칠 점 1~3개"],
  "corrections": [{ "from": "틀린 표현", "to": "고친 표현", "why": "짧은 이유" }],
  "rewrite_example": "글 중 한 부분을 더 좋게 고쳐 쓴 예시 1~3문장",
  "next_mission": "다음 글쓰기에서 해 볼 한 가지",
  "teacher_comment": "선생님의 한마디 (2~3문장)"
}`;
  const content = [];
  for (const img of images.slice(0, 4)) {
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(img);
    if (!m) continue;
    content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  if (!content.length) throw new Error("사진이 없어요.");
  content.push({
    type: "text",
    text: `글쓴이: ${level}
오늘의 주제: ${topic.title}
글쓰기 질문: ${topic.question}
사진 ${content.length}장은 순서대로 이어지는 한 편의 글입니다.`,
  });
  const result = await ask({ system, content, effort: "medium" });
  const s = result.scores || {};
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  result.scores = {
    structure: clamp(s.structure, 25),
    content: clamp(s.content, 25),
    sentence: clamp(s.sentence, 20),
    spelling: clamp(s.spelling, 15),
    handwriting: clamp(s.handwriting, 15),
  };
  result.total = Object.values(result.scores).reduce((a, b) => a + b, 0);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!checkFamily(req, res)) return;
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY가 아직 설정되지 않았어요." });
  const { task } = req.body || {};
  try {
    if (task === "topic") return res.json(await makeTopic(req.body));
    if (task === "judge") return res.json(await judge(req.body));
    return res.status(400).json({ error: "알 수 없는 task" });
  } catch (e) {
    let msg = e && e.message ? e.message : String(e);
    if (e instanceof Anthropic.AuthenticationError) msg = "Claude API 키가 올바르지 않아요.";
    else if (e instanceof Anthropic.RateLimitError) msg = "요청이 많아요. 잠시 뒤 다시 시도해 주세요.";
    else if (e instanceof Anthropic.APIError) msg = `AI 서버 오류(${e.status}). 잠시 뒤 다시 시도해 주세요.`;
    return res.status(500).json({ error: msg });
  }
}
