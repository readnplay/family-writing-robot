// 가족 코드 확인 (환경변수 FAMILY_CODE)
export function checkFamily(req, res) {
  const expected = process.env.FAMILY_CODE;
  if (!expected) {
    res.status(500).json({ error: "서버에 FAMILY_CODE(가족 코드)가 아직 설정되지 않았어요." });
    return false;
  }
  const given = String((req.body && req.body.code) || "").trim();
  if (given !== String(expected).trim()) {
    res.status(401).json({ error: "가족 코드가 맞지 않아요." });
    return false;
  }
  return true;
}
