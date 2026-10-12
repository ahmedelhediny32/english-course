import crypto from "crypto";

const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function createAdminToken(email) {
  const key = secret();
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify({ role: "teacher", email, exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS })).toString("base64url");
  const signature = crypto.createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token) {
  const key = secret();
  if (!key || typeof token !== "string") return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = crypto.createHmac("sha256", key).update(payload).digest();
  let provided;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.role === "teacher" && typeof claims.email === "string" && claims.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}