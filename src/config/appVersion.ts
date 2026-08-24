/**
 * কেন্দ্রীয় অ্যাপ ভার্শন কনফিগ।
 * ভবিষ্যতে ভার্শন আপডেট করতে শুধু এই ফাইলটি পরিবর্তন করুন।
 */

export const APP_NAME = 'Madrasa Managment';
export const APP_VERSION = '2.0.0';

/** সংক্ষিপ্ত প্রদর্শনযোগ্য ভার্শন, যেমন: v2.0.0 */
export const APP_VERSION_SHORT = `v${APP_VERSION}`;

/** নাম সহ পূর্ণ লেবেল, যেমন: Madrasa Managment 2.0.0 */
export const APP_VERSION_LABEL = `${APP_NAME} ${APP_VERSION}`;

/** সর্বশেষ রিলিজের তারিখ (YYYY-MM-DD) */
export const APP_RELEASE_DATE = '2026-08-24';

export const appVersionInfo = {
  name: APP_NAME,
  version: APP_VERSION,
  short: APP_VERSION_SHORT,
  label: APP_VERSION_LABEL,
  releaseDate: APP_RELEASE_DATE,
} as const;

export default appVersionInfo;
