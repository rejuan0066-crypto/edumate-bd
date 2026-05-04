# TWA (Trusted Web Activity) — Play Store Publishing Guide

আপনার PWA-কে Bubblewrap দিয়ে Android `.aab` (App Bundle) বানিয়ে Google Play Store-এ publish করার সম্পূর্ণ গাইড। এই কাজটি Lovable sandbox-এ হয় না — আপনার নিজের কম্পিউটারে Node.js ও Java JDK 17+ লাগবে।

---

## ১. পূর্বশর্ত

- **Node.js 18+** (https://nodejs.org)
- **Java JDK 17+** (https://adoptium.net) — Bubblewrap-এর প্রয়োজন
- **Android Studio** ইনস্টল না থাকলেও চলে, কিন্তু থাকলে ভালো (debug-এর জন্য)
- **Google Play Console অ্যাকাউন্ট** ($25 one-time fee)
- আপনার PWA already published: ✅ `https://subhaniabd.lovable.app`

---

## ২. Bubblewrap CLI ইনস্টল

```bash
npm install -g @bubblewrap/cli
```

ইনস্টল হয়েছে কিনা যাচাই:
```bash
bubblewrap --version
```

---

## ৩. TWA project initialize

একটা নতুন ফোল্ডার বানিয়ে ভেতরে যান:

```bash
mkdir subhaniabd-twa && cd subhaniabd-twa
bubblewrap init --manifest=https://subhaniabd.lovable.app/manifest.json
```

CLI কয়েকটা প্রশ্ন করবে — নিচের answers ব্যবহার করুন (Enter চেপে default রাখলেও চলবে):

| প্রশ্ন | উত্তর |
|---|---|
| Domain | `subhaniabd.lovable.app` |
| Application ID | `app.lovable.subhaniabd.twa` *(এটাই `assetlinks.json`-এ আছে)* |
| Display mode | `standalone` |
| Status bar color | `#0f766e` |
| Splash screen color | `#0f766e` |
| Icon URL | (auto from manifest) |
| App name | `Subhania Madrasah` |
| Short name | `Subhania` |
| Signing key | নতুন বানান (Bubblewrap auto-generate করবে), strong password দিন এবং **সাবধানে সংরক্ষণ করুন** — হারালে আর কখনো update দিতে পারবেন না |

> ⚠️ Signing key file (`android.keystore`) ও password **হারাবেন না**। এটাই আপনার app-এর identity।

---

## ৪. SHA-256 fingerprint বের করুন

```bash
bubblewrap fingerprint
```

আউটপুটে একটা SHA-256 string আসবে, যেমন:
```
SHA-256: AB:CD:EF:12:34:...:99
```

পুরো লাইনটা copy করুন (colon সহ)।

---

## ৫. assetlinks.json আপডেট করুন

Lovable প্রজেক্টে `public/.well-known/assetlinks.json` ফাইলে `REPLACE_WITH_YOUR_SIGNING_KEY_SHA256_FINGERPRINT` জায়গায় উপরের fingerprint বসান, save করুন এবং Lovable-এ **Publish/Update** চাপুন।

পরে browser-এ verify করুন:
```
https://subhaniabd.lovable.app/.well-known/assetlinks.json
```
আপনার fingerprint দেখা যাচ্ছে কিনা।

---

## ৬. App build (`.aab` for Play Store)

```bash
bubblewrap build
```

সফল হলে output পাবেন:
- `app-release-bundle.aab` ← এটা Play Store-এ upload করবেন
- `app-release-signed.apk` ← side-load testing-এর জন্য

---

## ৭. Local device-এ test (optional)

USB debugging সহ Android phone কম্পিউটারে যুক্ত করুন:

```bash
bubblewrap install
```

App ইনস্টল হবে। যদি address bar দেখায় (TWA এর বদলে Chrome custom tab), তাহলে `assetlinks.json` verify হয়নি — fingerprint আবার চেক করুন।

---

## ৮. Play Console-এ publish

1. https://play.google.com/console-এ যান
2. **Create app** → name, language, free/paid নির্বাচন করুন
3. বাম মেনু → **Production** → **Create new release**
4. **App bundle** অংশে `app-release-bundle.aab` upload করুন
5. **App content** সব পূরণ করুন (privacy policy, content rating, target audience)
6. **Store listing**: short description, full description, screenshots (অন্তত ২টা), feature graphic (1024×500)
7. Submit for review — সাধারণত 1-3 দিন

---

## ৯. App update (নতুন ভার্সন release)

PWA-এর কোডে শুধু update করলে TWA app-ও **automatically নতুন কন্টেন্ট দেখাবে** (কারণ TWA মূলত আপনার live website wrap করে)। `.aab` re-build করতে হয় শুধু তখনই যখন:
- App icon/name/splash পরিবর্তন
- Android permissions পরিবর্তন
- Bubblewrap version upgrade

ভার্সন বাড়াতে `twa-manifest.json`-এ `appVersion` ও `appVersionCode` বাড়িয়ে আবার `bubblewrap build` করুন।

---

## সমস্যা?

| সমস্যা | সমাধান |
|---|---|
| App-এ Chrome address bar দেখাচ্ছে | `assetlinks.json` verify হয়নি — fingerprint মিলিয়ে দেখুন, Lovable-এ Publish করেছেন কিনা চেক করুন |
| `bubblewrap init` fails | Java 17+ ইনস্টল করেছেন কিনা: `java -version` |
| Play Store rejects | privacy policy URL দিন, target SDK 34+ আছে কিনা চেক করুন |

---

**Lovable-এ আমার তরফ থেকে সম্পন্ন:**
- ✅ `manifest.json` TWA-ready (id, maskable icons, prefer_related_applications)
- ✅ `public/.well-known/assetlinks.json` placeholder ফাইল তৈরি — শুধু fingerprint বসিয়ে publish করুন

বাকি build/upload কাজ আপনার নিজের কম্পিউটার থেকে উপরের ধাপ অনুযায়ী করতে হবে।
