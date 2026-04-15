import type { APIRoute } from "astro";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { z } from "zod";

export const prerender = false;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+0-9()\-./\s]{7,30}$/;

const payloadSchema = z.object({
  locale: z.enum(["de", "en"]).default("de"),
  name: z.string().max(120).optional(),
  email: z.string().max(254).optional(),
  phone: z.string().max(30).optional(),
  message: z.string().min(20).max(2000),
  consent: z.string().min(1),
  company: z.string().max(200).optional(),
  turnstileToken: z.string().min(1)
});

type Locale = "de" | "en";

type FieldErrors = Record<string, string>;

type ResponsePayload = {
  ok: boolean;
  error?:
    | "validation_error"
    | "forbidden"
    | "rate_limited"
    | "configuration_error"
    | "captcha_verification_failed"
    | "email_send_failed"
    | "internal_error"
    | "method_not_allowed";
  message?: string;
  fieldErrors?: FieldErrors;
};

const validationMessages = {
  de: {
    invalid: "Bitte pruefe die eingegebenen Felder.",
    emailOrPhone: "Bitte gib entweder eine E-Mail-Adresse oder Telefonnummer an.",
    email: "Bitte gib eine gueltige E-Mail-Adresse an.",
    phone: "Bitte gib eine gueltige Telefonnummer an.",
    message: "Die Nachricht muss zwischen 20 und 2000 Zeichen lang sein.",
    consent: "Bitte stimme der Datenverarbeitung zu.",
    captcha: "Bitte bestaetige den Spam-Schutz."
  },
  en: {
    invalid: "Please review the submitted fields.",
    emailOrPhone: "Please provide either an email or a phone number.",
    email: "Please provide a valid email address.",
    phone: "Please provide a valid phone number.",
    message: "Message must be between 20 and 2000 characters.",
    consent: "Please accept data processing.",
    captcha: "Please complete spam protection."
  }
} as const;

const json = (status: number, payload: ResponsePayload): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

const normalizeValue = (value: FormDataEntryValue | null): string =>
  typeof value === "string" ? value.trim() : "";

const getClientIp = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
};

const isValidRequestSource = (request: Request, requestUrl: URL): boolean => {
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return false;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return true;
  }

  try {
    return new URL(referer).origin === requestUrl.origin;
  } catch {
    return false;
  }
};

const verifyTurnstile = async (
  secret: string,
  token: string,
  ip: string
): Promise<boolean> => {
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip
  });

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body
    }
  );

  if (!response.ok) {
    throw new Error(`Turnstile verification failed with status ${response.status}`);
  }

  const result = await response.json();
  return result?.success === true;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildEmailPayload = (data: {
  locale: Locale;
  name: string;
  email: string;
  phone: string;
  message: string;
  ip: string;
  sentAt: string;
}) => {
  const subject =
    data.locale === "en"
      ? "New website contact request"
      : "Neue Kontaktanfrage von der Website";

  const displayName = data.name || (data.locale === "en" ? "Not provided" : "Nicht angegeben");
  const displayEmail = data.email || (data.locale === "en" ? "Not provided" : "Nicht angegeben");
  const displayPhone = data.phone || (data.locale === "en" ? "Not provided" : "Nicht angegeben");

  const text = [
    `Locale: ${data.locale}`,
    `Name: ${displayName}`,
    `Email: ${displayEmail}`,
    `Phone: ${displayPhone}`,
    `IP: ${data.ip}`,
    `Sent at (UTC): ${data.sentAt}`,
    "",
    "Message:",
    data.message
  ].join("\n");

  const html = [
    `<p><strong>Locale:</strong> ${escapeHtml(data.locale)}</p>`,
    `<p><strong>Name:</strong> ${escapeHtml(displayName)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(displayEmail)}</p>`,
    `<p><strong>Phone:</strong> ${escapeHtml(displayPhone)}</p>`,
    `<p><strong>IP:</strong> ${escapeHtml(data.ip)}</p>`,
    `<p><strong>Sent at (UTC):</strong> ${escapeHtml(data.sentAt)}</p>`,
    "<hr />",
    "<p><strong>Message:</strong></p>",
    `<p>${escapeHtml(data.message).replaceAll("\n", "<br />")}</p>`
  ].join("\n");

  return { subject, text, html };
};

const validatePayload = (
  locale: Locale,
  data: z.infer<typeof payloadSchema>
): FieldErrors => {
  const messages = validationMessages[locale];
  const errors: FieldErrors = {};

  if (!data.email && !data.phone) {
    errors.email = messages.emailOrPhone;
    errors.phone = messages.emailOrPhone;
  }

  if (data.email && !emailPattern.test(data.email)) {
    errors.email = messages.email;
  }

  if (data.phone && !phonePattern.test(data.phone)) {
    errors.phone = messages.phone;
  }

  if (data.message.length < 20 || data.message.length > 2000) {
    errors.message = messages.message;
  }

  if (!data.consent) {
    errors.consent = messages.consent;
  }

  if (!data.turnstileToken) {
    errors.captcha = messages.captcha;
  }

  return errors;
};

const runRateLimit = async (
  ip: string,
  userAgent: string,
  env: {
    upstashUrl: string;
    upstashToken: string;
  }
): Promise<{ success: boolean }> => {
  const redis = new Redis({
    url: env.upstashUrl,
    token: env.upstashToken
  });

  const safeUserAgent =
    userAgent.replaceAll(/\s+/g, " ").trim().slice(0, 120) || "anonymous";

  const identifier =
    ip === "unknown"
      ? `unknown:${safeUserAgent}`
      : ip;

  const shortWindow = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: false,
    prefix: "contact:15m"
  });

  const dailyWindow = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 d"),
    analytics: false,
    prefix: "contact:1d"
  });

  const shortResult = await shortWindow.limit(identifier);
  if (!shortResult.success) {
    return { success: false };
  }

  const dailyResult = await dailyWindow.limit(identifier);
  if (!dailyResult.success) {
    return { success: false };
  }

  return { success: true };
};

export const GET: APIRoute = async () =>
  json(405, { ok: false, error: "method_not_allowed" });

export const POST: APIRoute = async ({ request, url }) => {
  if (!isValidRequestSource(request, url)) {
    return json(403, { ok: false, error: "forbidden" });
  }

  try {
    const formData = await request.formData();
    const locale = (normalizeValue(formData.get("locale")) === "en"
      ? "en"
      : "de") as Locale;

    const submitted = {
      locale,
      name: normalizeValue(formData.get("name")),
      email: normalizeValue(formData.get("email")),
      phone: normalizeValue(formData.get("phone")),
      message: normalizeValue(formData.get("message")),
      consent: normalizeValue(formData.get("consent")),
      company: normalizeValue(formData.get("company")),
      turnstileToken: normalizeValue(formData.get("cf-turnstile-response"))
    };

    if (submitted.company) {
      return json(403, { ok: false, error: "forbidden" });
    }

    const parsed = payloadSchema.safeParse(submitted);
    if (!parsed.success) {
      const messages = validationMessages[locale];
      const fieldErrors: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "message") {
          fieldErrors.message = messages.message;
        }
        if (issue.path[0] === "turnstileToken") {
          fieldErrors.captcha = messages.captcha;
        }
        if (issue.path[0] === "consent") {
          fieldErrors.consent = messages.consent;
        }
      }

      return json(400, {
        ok: false,
        error: "validation_error",
        message: messages.invalid,
        fieldErrors
      });
    }

    const fieldErrors = validatePayload(locale, parsed.data);
    if (Object.keys(fieldErrors).length > 0) {
      return json(400, {
        ok: false,
        error: "validation_error",
        message: validationMessages[locale].invalid,
        fieldErrors
      });
    }

    const resendApiKey = import.meta.env.RESEND_API_KEY;
    const contactToEmail = import.meta.env.CONTACT_TO_EMAIL;
    const contactFromEmail = import.meta.env.CONTACT_FROM_EMAIL;
    const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY;
    const upstashUrl = import.meta.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

    if (
      !resendApiKey ||
      !contactToEmail ||
      !contactFromEmail ||
      !turnstileSecret ||
      !upstashUrl ||
      !upstashToken
    ) {
      return json(500, {
        ok: false,
        error: "configuration_error"
      });
    }

    const clientIp = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";

    const limitResult = await runRateLimit(clientIp, userAgent, {
      upstashUrl,
      upstashToken
    });

    if (!limitResult.success) {
      return json(429, {
        ok: false,
        error: "rate_limited"
      });
    }

    let captchaValid = false;
    try {
      captchaValid = await verifyTurnstile(
        turnstileSecret,
        parsed.data.turnstileToken,
        clientIp
      );
    } catch {
      return json(500, {
        ok: false,
        error: "captcha_verification_failed"
      });
    }

    if (!captchaValid) {
      return json(403, {
        ok: false,
        error: "forbidden"
      });
    }

    const resend = new Resend(resendApiKey);
    const preparedEmail = buildEmailPayload({
      locale,
      name: parsed.data.name ?? "",
      email: parsed.data.email ?? "",
      phone: parsed.data.phone ?? "",
      message: parsed.data.message,
      ip: clientIp,
      sentAt: new Date().toISOString()
    });

    const response = await resend.emails.send({
      from: contactFromEmail,
      to: [contactToEmail],
      replyTo: parsed.data.email ? [parsed.data.email] : undefined,
      subject: preparedEmail.subject,
      text: preparedEmail.text,
      html: preparedEmail.html
    });

    if (response.error) {
      return json(500, {
        ok: false,
        error: "email_send_failed"
      });
    }

    return json(200, { ok: true });
  } catch {
    return json(500, {
      ok: false,
      error: "internal_error"
    });
  }
};
