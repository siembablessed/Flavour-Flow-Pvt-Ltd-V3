import crypto from "node:crypto";

export type PaynowState = {
  reference: string;
  pollUrl: string;
  amount: number;
  orderNumber?: string;
  exp: number;
};

const COOKIE_NAME = "paynow_state";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

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

export function getStateCookieName(): string {
  return COOKIE_NAME;
}

export function serializeStateCookie(state: PaynowState, secret: string): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(state));
  const signature = sign(encodedPayload, secret);
  const token = `${encodedPayload}.${signature}`;

  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200`;
}

export function clearStateCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readStateFromCookie(cookieHeader: string | undefined, secret: string): PaynowState | null {
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
    const parsed = JSON.parse(base64UrlDecode(payload)) as PaynowState;
    if (Date.now() > parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
