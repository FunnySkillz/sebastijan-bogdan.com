# sebastijan-bogdan.com (Astro)

Personal blog and portfolio with DE/EN routing, content collections, and a secured contact workflow.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Contact feature

- Public routes: `/contact`, `/en/contact`
- API route: `POST /api/contact`
- Fields: `name` (optional), `email` (optional), `phone` (optional), `message` (required), `consent` (required)
- Validation: email-or-phone required, message length 20-2000, server-side schema checks
- Spam controls: honeypot, Turnstile verification, Upstash rate limits (2/5min + 3/day per IP with 6h cooldown after the second accepted request)
- Delivery: Resend email to mailbox (`CONTACT_TO_EMAIL`)

## Environment variables

Copy `.env.example` to `.env` and fill values:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `PLAUSIBLE_DOMAIN` (or `PUBLIC_PLAUSIBLE_DOMAIN`)
- `GOOGLE_SITE_VERIFICATION` (or `PUBLIC_GOOGLE_SITE_VERIFICATION`)

## Deploy (Vercel)

1. Connect repo to Vercel.
2. Add all environment variables in Vercel Project Settings.
3. Configure domain and DNS.
4. Deploy.

## External services to configure

- **Resend**: verify sending domain and from address.
- **Cloudflare Turnstile**: create widget and add site/secret keys.
- **Upstash Redis**: create REST database and add URL/token.
- **Plausible**: add domain and keep `PLAUSIBLE_DOMAIN` synced.
- **Google Search Console**: add site, verify ownership, submit sitemap:
  - `https://sebastijan-bogdan.com/sitemap-index.xml`

