# iOS App Store Publishing Guide (Capacitor wrapper)

iOS-এ TWA-এর equivalent নেই — Apple WebView-based wrapper বাধ্য করে। সবচেয়ে ভালো ও Apple-approved পথ হলো **Capacitor** দিয়ে আপনার live PWA-কে wrap করে `.ipa` বানিয়ে App Store-এ publish করা।

> ⚠️ iOS app build করতে **Mac (macOS) + Xcode 15+** বাধ্যতামূলক। Windows/Linux থেকে iOS `.ipa` বানানো যায় না (Apple-এর policy)।

---

## ১. পূর্বশর্ত

- **Mac computer** (macOS Sonoma 14+)
- **Xcode 15+** (App Store থেকে free)
- **Apple Developer Account** ($99/year) — https://developer.apple.com/programs/
- **Node.js 18+**
- **CocoaPods**: `sudo gem install cocoapods`
- আপনার PWA already published: ✅ `https://subhaniabd.lovable.app`

---

## ২. প্রজেক্ট GitHub-এ export

Lovable editor-এর top-right-এ **GitHub → Connect to GitHub → Create Repository**। তারপর Mac-এ:

```bash
git clone https://github.com/<your-username>/<repo>.git
cd <repo>
npm install
```

---

## ৩. Capacitor ইনস্টল

```bash
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
npx cap init
```

প্রশ্নগুলোর উত্তর:
| প্রশ্ন | উত্তর |
|---|---|
| App name | `Subhania Madrasah` |
| App ID | `app.lovable.8564078b79b940ef8f5b8322e217d011` |
| Web dir | `dist` |

---

## ৪. `capacitor.config.ts` configure

প্রজেক্ট root-এ `capacitor.config.ts` ফাইলটা এভাবে রাখুন (live website wrap করতে):

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8564078b79b940ef8f5b8322e217d011',
  appName: 'Subhania Madrasah',
  webDir: 'dist',
  server: {
    url: 'https://subhaniabd.lovable.app',
    cleartext: false,
    iosScheme: 'https'
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0f766e'
  }
};

export default config;
```

> এই config থাকলে app সবসময় আপনার live website লোড করবে — মানে Lovable-এ update করলেই iOS app-ও update হবে, App Store re-submission লাগবে না (শুধু icon/name/permission পাল্টালে লাগবে)।

---

## ৫. iOS platform যোগ করুন

```bash
npm run build
npx cap add ios
npx cap sync ios
```

এটা একটা `ios/` ফোল্ডার বানাবে।

---

## ৬. Xcode-এ open করুন

```bash
npx cap open ios
```

Xcode খুলবে। বাম panel-এ App target-এ ক্লিক করে:

### ৬.১ Signing & Capabilities
- **Team**: আপনার Apple Developer team select করুন
- **Bundle Identifier**: `app.lovable.8564078b79b940ef8f5b8322e217d011` (অথবা reverse-domain যেমন `bd.subhania.app`)
- **Automatically manage signing**: ✓

### ৬.২ App Icon
`ios/App/App/Assets.xcassets/AppIcon.appiconset/` ফোল্ডারে 1024×1024 PNG রাখুন (Apple সব size auto-generate করবে নতুন Xcode-এ)। অথবা https://www.appicon.co দিয়ে set বানিয়ে drag-drop করুন।

### ৬.৩ Display Name & Version
- **Display Name**: `Subhania`
- **Version**: `1.0.0`
- **Build**: `1`

### ৬.৪ Info.plist (privacy permissions)
যদি camera/photos/notifications use করেন, `ios/App/App/Info.plist`-এ add করুন:

```xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to capture documents and photos.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>This app accesses photos to upload student/staff images.</string>
```

না হলে App Store reject করবে।

---

## ৭. Simulator-এ test

Xcode-এ top-bar থেকে একটা iPhone simulator (যেমন iPhone 15) select করে **▶ Play** চাপুন। app চললে আপনার live website লোড হবে।

---

## ৮. Real device-এ test

iPhone কে USB দিয়ে Mac-এ যুক্ত করুন → top-bar-এ device select করুন → ▶ Play। প্রথমবার iPhone-এ **Settings → General → VPN & Device Management → Trust** করতে হবে।

---

## ৯. Archive & App Store upload

1. Xcode top-bar-এ device dropdown-এ **Any iOS Device (arm64)** select করুন
2. Menu → **Product → Archive** (5-10 মিনিট লাগবে)
3. Archive window খুলবে → **Distribute App** → **App Store Connect** → **Upload**
4. Apple আপনার build process করবে (15-30 মিনিট)

---

## ১০. App Store Connect-এ submit

1. https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**
2. Bundle ID select করুন (Xcode থেকে registered হবে)
3. App information পূরণ:
   - **Name**: Subhania Madrasah
   - **Subtitle**: Islamic Education Management
   - **Category**: Education
   - **Privacy Policy URL**: আপনার `/privacy` পেজ
4. **Pricing**: Free
5. **App Privacy**: কী data collect করেন declare করুন (email, name ইত্যাদি)
6. **Screenshots**: iPhone 6.7" + iPhone 6.5" + iPad 12.9" — অন্তত ৩টা করে (Simulator থেকে Cmd+S দিয়ে নিতে পারেন)
7. **Description**: app সম্পর্কে 4000 character পর্যন্ত লেখা
8. **Build**: যেটা step 9-এ upload হলো select করুন
9. **Submit for Review** — সাধারণত 24-48 ঘণ্টায় approve/reject

---

## ১১. App update

PWA কোডে update করলে iOS app **automatically নতুন কন্টেন্ট দেখাবে** (server.url config-এর কারণে)। `.ipa` re-build করতে হয় শুধু:
- App icon/name/version পরিবর্তন
- নতুন native permission যোগ (camera, location, ইত্যাদি)
- Capacitor version upgrade

ভার্সন বাড়াতে Xcode-এ Version `1.0.1` করে আবার Archive → Upload।

---

## সাধারণ rejection reasons

| Reason | সমাধান |
|---|---|
| "App is just a website" (Guideline 4.2) | offline mode, push notifications, native UI elements থাকলে accept করে। আপনার PWA-তে service worker + push আছে — usually safe |
| Privacy policy missing | `/privacy` route বানান, App Store Connect-এ link দিন |
| Permission descriptions missing | Info.plist-এ usage strings যোগ করুন |
| Login required without account creation | App Store Connect-এ test reviewer-এর জন্য demo account credentials দিন |

---

## Push notifications (optional, পরে)

iOS-এ web push কাজ করে না — Capacitor-এর `@capacitor/push-notifications` plugin ও Apple Push Notification service (APNs) সেটআপ লাগবে। এটা আলাদা একটা ধাপ, পরে দরকার হলে গাইড দেবো।

---

**Summary**:
- Android: TWA (`.aab`) → Bubblewrap → Play Store ✅ আগের গাইড
- iOS: Capacitor (`.ipa`) → Xcode → App Store ✅ এই গাইড

দুটোই same live website wrap করে, তাই Lovable-এ update করলে দুই app-ই sync থাকবে।
