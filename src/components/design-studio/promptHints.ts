import type { fabric } from 'fabric';

export interface PromptHint {
  label: string;
  prompt: string;
}

const TYPE_LABEL: Record<string, string> = {
  'i-text': 'Text',
  text: 'Text',
  textbox: 'Text',
  image: 'Image',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  circle: 'Circle',
  triangle: 'Triangle',
  line: 'Line',
  group: 'Group',
  path: 'Path',
};

export function getSelectionTypeLabel(obj: fabric.Object | null): string | null {
  if (!obj) return null;
  return TYPE_LABEL[obj.type || ''] || (obj.type ? obj.type[0].toUpperCase() + obj.type.slice(1) : 'Object');
}

const NO_SEL_HINTS: PromptHint[] = [
  // Business templates
  { label: '💼 Visiting card', prompt: 'একটা প্রিমিয়াম ভিজিটিং কার্ড বানাও — নাম, পদবি, ফোন, ইমেইল ও লোগো প্লেসহোল্ডারসহ' },
  { label: '🧾 Invoice (A4)', prompt: 'একটা প্রফেশনাল A4 ইনভয়েস বানাও — হেডার, বিল-টু, আইটেম টেবিল ও টোটাল সেকশনসহ' },
  { label: '🧠 Letterhead', prompt: 'একটা কর্পোরেট লেটারহেড বানাও — হেডার লোগো, ঠিকানা ও ফুটারসহ' },
  { label: '💵 Money receipt', prompt: 'একটা মানি রিসিট বানাও — সিরিয়াল, তারিখ, পরিমাণ ও স্বাক্ষর লাইনসহ' },
  // Education
  { label: '🪪 ID card', prompt: 'একটা ছাত্র আইডি কার্ড বানাও — ছবি, নাম, রোল, ক্লাস ও ইনস্টিটিউশন লোগোসহ' },
  { label: '🏆 Certificate', prompt: 'একটা ল্যান্ডস্কেপ প্রশংসাপত্র বানাও — বর্ডার, টাইটেল, প্রাপকের নাম ও স্বাক্ষরসহ' },
  { label: '📅 Class routine', prompt: 'একটা সাপ্তাহিক ক্লাস রুটিন টেবিল বানাও — দিন বনাম পিরিয়ড' },
  // Social media
  { label: '📘 FB cover', prompt: 'একটা ফেসবুক কভার ব্যানার বানাও — বড় হেডলাইন, সাবটাইটেল ও CTA সহ' },
  { label: '🖼️ Poster', prompt: 'একটা ইভেন্ট পোস্টার বানাও — তারিখ, ভেন্যু ও বড় টাইটেলসহ' },
  { label: '▶️ Thumbnail', prompt: 'একটা YouTube থাম্বনেইল বানাও — বড় হেডলাইন ও কন্ট্রাস্ট ব্যাকগ্রাউন্ডসহ' },
  // Generic UI
  { label: '📊 Dashboard', prompt: 'একটা ৪-কার্ডের stats ড্যাশবোর্ড বানাও আধুনিক রঙে' },
  { label: '🃏 Card grid', prompt: 'আইকন, টাইটেল ও বর্ণনাসহ ৩-কার্ডের একটা গ্রিড বানাও' },
];

const TEXT_HINTS: PromptHint[] = [
  { label: 'Bigger', prompt: 'টেক্সটটাকে আরও বড় ও বোল্ড করো' },
  { label: 'Center align', prompt: 'টেক্সটটি কেন্দ্রে সারিবদ্ধ করো' },
  { label: 'Change color', prompt: 'টেক্সটের রং প্রাইমারি (ব্র্যান্ড) কালারে পরিবর্তন করো' },
  { label: 'Improve copy', prompt: 'এই টেক্সটটিকে আরও আকর্ষণীয় ও সংক্ষিপ্ত করো' },
];

const IMAGE_HINTS: PromptHint[] = [
  { label: '🪄 Edit image', prompt: 'এই ছবির ব্যাকগ্রাউন্ডকে নরম গ্রেডিয়েন্টে পরিবর্তন করো' },
  { label: '✂️ Remove BG', prompt: 'এই ছবির ব্যাকগ্রাউন্ড সরিয়ে ফেলো' },
  { label: 'Replace image', prompt: 'এই ছবিটি একটি আধুনিক অফিসের ছবি দিয়ে রিপ্লেস করো' },
  { label: 'Stylize', prompt: 'এই ছবিকে minimalist illustration স্টাইলে রূপান্তর করো' },
];

const SHAPE_HINTS: PromptHint[] = [
  { label: 'Soften corners', prompt: 'এই শেপের কোণগুলো গোলাকার করো (rx: 16)' },
  { label: 'Brand color', prompt: 'এই শেপের ফিল কালার প্রাইমারি ব্র্যান্ড কালারে পরিবর্তন করো' },
  { label: 'Add shadow', prompt: 'এই শেপে একটা সফট shadow যোগ করো' },
  { label: 'Resize 200×200', prompt: 'এই শেপকে ২০০x২০০ সাইজে রিসাইজ করো' },
];

const SECTION_HINTS: PromptHint[] = [
  { label: 'Replace section', prompt: 'এই সেকশনটি অন্য একটি আধুনিক ভেরিয়েন্ট দিয়ে পরিবর্তন করো' },
  { label: 'Add header', prompt: 'এই সেকশনের উপরে একটি টাইটেল ও সাবটাইটেল যোগ করো' },
  { label: 'Recolor', prompt: 'এই সেকশনের কালার স্কিম ডার্ক থিমে পরিবর্তন করো' },
];

const GROUP_HINTS: PromptHint[] = [
  { label: 'Recolor group', prompt: 'এই গ্রুপের সব এলিমেন্টের রং একটি cohesive পেলেটে পরিবর্তন করো' },
  { label: 'Resize group', prompt: 'এই গ্রুপটিকে ১.৫x বড় করো' },
];

export function getPromptHints(obj: fabric.Object | null): PromptHint[] {
  if (!obj) return NO_SEL_HINTS;
  const type = obj.type || '';
  const tag = String((obj as any).sectionTag || '').toLowerCase();

  if (tag) return SECTION_HINTS;
  if (type === 'image') return IMAGE_HINTS;
  if (['i-text', 'text', 'textbox'].includes(type)) return TEXT_HINTS;
  if (['rect', 'ellipse', 'triangle', 'line', 'circle'].includes(type)) return SHAPE_HINTS;
  if (type === 'group') return GROUP_HINTS;
  return NO_SEL_HINTS;
}
