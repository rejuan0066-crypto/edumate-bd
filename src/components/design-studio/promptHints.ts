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
  { label: '🪄 Hero section', prompt: 'একটা আধুনিক হিরো সেকশন বানাও — বড় হেডলাইন, সাবটাইটেল ও একটি CTA বাটনসহ' },
  { label: '📊 Dashboard', prompt: 'একটা ৪-কার্ডের stats ড্যাশবোর্ড বানাও আধুনিক রঙে' },
  { label: '📝 Signup form', prompt: 'নাম, ইমেইল, পাসওয়ার্ড ও সাবমিট বাটনসহ একটা সাইনআপ ফর্ম যোগ করো' },
  { label: '🎨 Image: sunset', prompt: 'একটা সুন্দর পাহাড়ের উপর সূর্যাস্তের ছবি জেনারেট করে যোগ করো' },
  { label: '📋 5-col table', prompt: 'হেডার ও ৫টি রো-সহ ৫ কলামের একটা টেবিল বানাও' },
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
