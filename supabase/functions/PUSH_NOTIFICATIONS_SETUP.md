# Web Push Notifications — Setup Guide

This document explains how to configure and deploy the push notification system end-to-end.

---

## 1. `deno.json` configuration

Deno-only edge functions in this project rely on remote ESM imports (no `npm:` specifiers). You generally do **not** need a `deno.json` per function. If you add one, keep it minimal:

```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2.45.0",
    "web-push": "https://esm.sh/web-push@3.6.7?target=deno"
  }
}
```

> ⚠️ Do **not** use `npm:web-push` or `npm:openai` style specifiers — the Supabase Edge Runtime cannot resolve them without a `node_modules` directory. Always import via `https://esm.sh/...?target=deno`.

If a function fails with `Could not find a matching package for 'npm:...'`, switch the import to the `esm.sh` equivalent.

---

## 2. Required Supabase Secrets (VAPID keys)

The push system uses VAPID (Voluntary Application Server Identification) for authenticating with browser push services. Three secrets are required:

| Secret name          | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `VAPID_PUBLIC_KEY`   | Base64url-encoded P-256 public key (65 bytes uncompressed). Sent to browser. |
| `VAPID_PRIVATE_KEY`  | Base64url-encoded P-256 private scalar (32 bytes). **Server-only.**         |
| `VAPID_SUBJECT`      | Contact URI, e.g. `mailto:admin@yourdomain.com`. Required by RFC 8292.      |

### How to generate VAPID keys

1. In the admin panel, open **Push Notifications** (`/admin/push-notifications`).
2. Click **Generate VAPID Keys** — this calls the `generate-vapid` edge function which uses Web Crypto (`ECDSA P-256`) to produce a fresh key pair.
3. Copy the `publicKey` and `privateKey` values.
4. Save them in the project secrets:
   - `VAPID_PUBLIC_KEY` = `<publicKey>`
   - `VAPID_PRIVATE_KEY` = `<privateKey>`
   - `VAPID_SUBJECT` = `mailto:you@yourdomain.com`

> 🔒 The private key never leaves the server. Only the public key is exposed to the browser when subscribing.

---

## 3. Required Edge Functions

These functions must be deployed for push notifications to work:

| Function          | Purpose                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| `generate-vapid`  | One-time VAPID key pair generator. No secrets required to run.                       |
| `send-push`       | Sends a notification to all or a specific user's active subscriptions. Requires `VAPID_*` secrets + `SUPABASE_SERVICE_ROLE_KEY`. |

### Database tables used

- `push_subscriptions` — stores `endpoint`, `p256dh`, `auth`, `user_id`, `is_active`.
- `push_notification_log` — records delivery stats (`sent_count`, `failed_count`).

---

## 4. End-to-end flow

1. **Browser** registers `public/sw.js` as a service worker.
2. Browser calls `pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })`.
3. App stores the resulting subscription (endpoint + keys) in `push_subscriptions`.
4. Admin triggers a notification → frontend calls `supabase.functions.invoke('send-push', { body: { title, body, link } })`.
5. `send-push` signs each request with the VAPID private key and POSTs the encrypted payload to each subscription's `endpoint`.
6. Expired subscriptions (HTTP 404 / 410) are auto-marked `is_active = false`.

---

## 5. Quick verification checklist

- [ ] `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` set in project secrets
- [ ] `generate-vapid` and `send-push` deployed
- [ ] `public/sw.js` exists and is reachable at `/sw.js`
- [ ] User has clicked **Enable Notifications** at least once (creates a row in `push_subscriptions`)
- [ ] Test broadcast from `/admin/push-notifications` returns `sent > 0`
