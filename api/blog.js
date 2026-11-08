// 공개 블로그 글 목록 (누구나 읽기 가능, 쓰기는 /api/data 의 publish 로만)
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

export default async function handler(req, res) {
  if (!redis) return res.json({ posts: [] });
  try {
    const all = (await redis.hgetall("fwr:posts")) || {};
    const posts = Object.values(all)
      .map((v) => (typeof v === "string" ? JSON.parse(v) : v))
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.publishedAt || 0) - (a.publishedAt || 0));
    res.setHeader("Cache-Control", "no-store");
    return res.json({ posts });
  } catch (e) {
    return res.status(500).json({ error: "블로그를 불러오지 못했어요." });
  }
}
