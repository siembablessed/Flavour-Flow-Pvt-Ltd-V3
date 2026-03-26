import crypto from "node:crypto";

const COOKIE_NAME = "anon_cart_sid";

type SessionToken = {
  sid: string;
  exp: number;
};

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function parseCookies(headerValue: string | undefined): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  return headerValue.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || rawValue.length === 0) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
}

export function createAnonymousSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function serializeAnonymousSessionCookie(sessionId: string, ttlSeconds: number, secret: string): string {
  const tokenPayload = Buffer.from(JSON.stringify({ sid: sessionId, exp: Date.now() + ttlSeconds * 1000 }), "utf8").toString("base64url");
  const signature = sign(tokenPayload, secret);
  const token = `${tokenPayload}.${signature}`;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttlSeconds}`;
}

export function readAnonymousSessionId(cookieHeader: string | undefined, secret: string): string | null {
  const cookies = parseCookies(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload, secret);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionToken;
    if (!decoded?.sid || Date.now() > decoded.exp) {
      return null;
    }
    return decoded.sid;
  } catch {
    return null;
  }
}

export function clearAnonymousSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
