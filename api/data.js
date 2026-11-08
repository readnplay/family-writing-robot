// 가족 글쓰기 기록 저장소 (Upstash Redis). 설정이 없으면 configured:false 를 돌려주고
// 화면은 이 기기(localStorage)에만 저장합니다.
import { Redis } from "@upstash/redis";
import { checkFamily } from "./_auth.js";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const KEY = "fwr:sessions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!checkFamily(req, res)) return;
  const { action, session, id } = req.body || {};

  if (action === "ping") return res.json({ ok: true, configured: !!redis });
  if (!redis) return res.json({ configured: false, sessions: [] });

  try {
    if (action === "list") {
      const all = (await redis.hgetall(KEY)) || {};
      const sessions = Object.values(all).map((v) => (typeof v === "string" ? JSON.parse(v) : v));
      return res.json({ configured: true, sessions });
    }
    if (action === "get") {
      const v = await redis.hget(KEY, id);
      return res.json({ configured: true, session: typeof v === "string" ? JSON.parse(v) : v || null });
    }
    if (action === "save") {
      if (!session || !session.id) return res.status(400).json({ error: "session.id 필요" });
      await redis.hset(KEY, { [session.id]: JSON.stringify(session) });
      return res.json({ configured: true, ok: true });
    }
    if (action === "publish") {
      const post = req.body.post;
      if (!post || !post.id) return res.status(400).json({ error: "post.id 필요" });
      await redis.hset("fwr:posts", { [post.id]: JSON.stringify(post) });
      return res.json({ configured: true, ok: true });
    }
    if (action === "unpublish") {
      await redis.hdel("fwr:posts", id);
      return res.json({ configured: true, ok: true });
    }
    if (action === "meta-get") {
      return res.json({ configured: true, meta: (await redis.get("fwr:meta")) || {} });
    }
    if (action === "meta-set") {
      await redis.set("fwr:meta", req.body.meta || {});
      return res.json({ configured: true, ok: true });
    }
    if (action === "delete") {
      await redis.hdel(KEY, id);
      return res.json({ configured: true, ok: true });
    }
    return res.status(400).json({ error: "알 수 없는 action" });
  } catch (e) {
    return res.status(500).json({ error: "저장소 오류: " + (e && e.message) });
  }
}
