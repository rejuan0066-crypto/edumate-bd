import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { bijoyCharToUnicode, isBijoyKey } from '@/lib/bijoyKeymap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Plus, Trash2, Printer, ArrowLeft, Check, X, Clock, Eye, Keyboard, Type, ChevronDown, ChevronUp, GripVertical, FileCheck, AlertCircle, Settings2, Columns, RotateCcw, Bold, Italic, Underline, Hash, ScanLine, Loader2, Sparkles, Upload } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import AIQuestionGeneratorDialog from '@/components/admin/AIQuestionGeneratorDialog';
import QuestionImportDialog, { ImportedQuestion } from '@/components/admin/QuestionImportDialog';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';

// ─── Arabic Virtual Keyboard Layout (IBM PC Arabic Keyboard) ───
const ARABIC_ROWS_NORMAL = [
  ['ذ', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠', '-', '='],
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د', '\\'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'],
];
const ARABIC_ROWS_SHIFTED = [
  ['ّ', '!', '@', '#', '$', '%', '^', '&', '*', ')', '(', '_', '+'],
  ['َ', 'ً', 'ُ', 'ٌ', 'لإ', 'إ', '\'', '÷', '×', '؛', '<', '>', '|'],
  ['ِ', 'ٍ', ']', '[', 'لأ', 'أ', 'ـ', '،', '/', ':', '"'],
  ['~', 'ْ', '{', '}', 'لآ', 'آ', '\'', ',', '.', '؟'],
];

const PHYSICAL_CODE_TO_ARABIC: Record<string, string> = {
  'Backquote': 'ذ',
  'Digit1': '١', 'Digit2': '٢', 'Digit3': '٣', 'Digit4': '٤', 'Digit5': '٥',
  'Digit6': '٦', 'Digit7': '٧', 'Digit8': '٨', 'Digit9': '٩', 'Digit0': '٠',
  'Minus': '-', 'Equal': '=',
  'KeyQ': 'ض', 'KeyW': 'ص', 'KeyE': 'ث', 'KeyR': 'ق', 'KeyT': 'ف',
  'KeyY': 'غ', 'KeyU': 'ع', 'KeyI': 'ه', 'KeyO': 'خ', 'KeyP': 'ح',
  'BracketLeft': 'ج', 'BracketRight': 'د', 'Backslash': '\\',
  'KeyA': 'ش', 'KeyS': 'س', 'KeyD': 'ي', 'KeyF': 'ب', 'KeyG': 'ل',
  'KeyH': 'ا', 'KeyJ': 'ت', 'KeyK': 'ن', 'KeyL': 'م',
  'Semicolon': 'ك', 'Quote': 'ط',
  'KeyZ': 'ئ', 'KeyX': 'ء', 'KeyC': 'ؤ', 'KeyV': 'ر', 'KeyB': 'لا',
  'KeyN': 'ى', 'KeyM': 'ة', 'Comma': 'و', 'Period': 'ز', 'Slash': 'ظ',
};

const PHYSICAL_CODE_TO_ARABIC_SHIFTED: Record<string, string> = {
  'Backquote': 'ّ',
  'Digit1': '!', 'Digit2': '@', 'Digit3': '#', 'Digit4': '$', 'Digit5': '%',
  'Digit6': '^', 'Digit7': '&', 'Digit8': '*', 'Digit9': ')', 'Digit0': '(',
  'Minus': '_', 'Equal': '+',
  'KeyQ': 'َ', 'KeyW': 'ً', 'KeyE': 'ُ', 'KeyR': 'ٌ', 'KeyT': 'لإ',
  'KeyY': 'إ', 'KeyU': '\'', 'KeyI': '÷', 'KeyO': '×', 'KeyP': '؛',
  'BracketLeft': '<', 'BracketRight': '>', 'Backslash': '|',
  'KeyA': 'ِ', 'KeyS': 'ٍ', 'KeyD': ']', 'KeyF': '[', 'KeyG': 'لأ',
  'KeyH': 'أ', 'KeyJ': 'ـ', 'KeyK': '،', 'KeyL': '/',
  'Semicolon': ':', 'Quote': '"',
  'KeyZ': '~', 'KeyX': 'ْ', 'KeyC': '{', 'KeyV': '}', 'KeyB': 'لآ',
  'KeyN': 'آ', 'KeyM': '\'', 'Comma': ',', 'Period': '.', 'Slash': '؟',
};

const ARABIC_TO_PHYSICAL: Record<string, string> = {};
for (const [code, ar] of Object.entries(PHYSICAL_CODE_TO_ARABIC)) {
  ARABIC_TO_PHYSICAL[ar] = code;
}

// ─── Arabic Tashkeel / Harakat Quick Reference ───
export interface TashkeelItem {
  char: string;
  nameBn: string;
  nameEn: string;
  shortcut: string;
  sample: string;
}

const ARABIC_TASHKEEL: TashkeelItem[] = [
  { char: '\u064E', nameBn: 'যবর (ফাতহাহ)', nameEn: 'Fatha', shortcut: 'Shift+Q', sample: 'بَ' },
  { char: '\u0650', nameBn: 'যের (কাসরাহ)', nameEn: 'Kasra', shortcut: 'Shift+A', sample: 'بِ' },
  { char: '\u064F', nameBn: 'পেশ (দাম্মাহ)', nameEn: 'Damma', shortcut: 'Shift+E', sample: 'بُ' },
  { char: '\u064B', nameBn: 'দুই যবর (তানভীন)', nameEn: 'Tanween Fath', shortcut: 'Shift+W', sample: 'باً' },
  { char: '\u064D', nameBn: 'দুই যের (তানভীন)', nameEn: 'Tanween Kasr', shortcut: 'Shift+S', sample: 'بٍ' },
  { char: '\u064C', nameBn: 'দুই পেশ (তানভীন)', nameEn: 'Tanween Damm', shortcut: 'Shift+R', sample: 'بٌ' },
  { char: '\u0652', nameBn: 'জযম / সুকূন', nameEn: 'Sukun', shortcut: 'Shift+X', sample: 'بْ' },
  { char: '\u0651', nameBn: 'তাশদীদ', nameEn: 'Shaddah', shortcut: 'Shift+~', sample: 'بّ' },
  { char: '\u0670', nameBn: 'খাড়া যবর', nameEn: 'Dagger Alif', shortcut: 'Shift+B', sample: 'بٰ' },
  { char: '\u0651\u064E', nameBn: 'তাশদীদ + যবর', nameEn: 'Shaddah + Fatha', shortcut: '', sample: 'بَّ' },
  { char: '\u0651\u0650', nameBn: 'তাশদীদ + যের', nameEn: 'Shaddah + Kasra', shortcut: '', sample: 'بِّ' },
  { char: '\u0651\u064F', nameBn: 'তাশদীদ + পেশ', nameEn: 'Shaddah + Damma', shortcut: '', sample: 'بُّ' },
  { char: '\u0653', nameBn: 'মাদ্দাহ চিহ্ন', nameEn: 'Maddah', shortcut: 'Shift+Z', sample: 'آ' },
  { char: 'ء', nameBn: 'হামযাহ', nameEn: 'Hamza', shortcut: 'X', sample: 'ء' },
];

// ─── Quick Symbols ───
const QUICK_SYMBOLS = {
  tashkeel: ARABIC_TASHKEEL.map(t => t.char),
  arabic: ['بسم الله الرحمن الرحيم', 'ﷺ', 'ﷻ', '﷽', 'ؐ', '۞', '۩', '﴿', '﴾', '،', '؛', '؟'],
  math: ['±', '×', '÷', '≠', '≤', '≥', '√', '∞', 'π', '∑', '∫', '°', '²', '³', '½', '¼', '¾', '%'],
  bengali: ['৳', '।', '॥', '্', 'ঃ', 'ং', 'ঁ', '়'],
};

// ─── Arabic Keyboard Component ───
const ArabicKeyboard = ({
  onKeyPress, onClose, highlightedKey,
}: {
  onKeyPress: (char: string) => void; onClose: () => void; highlightedKey: string | null;
}) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [position, setPosition] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(8, (window.innerWidth - 520) / 2) : 100,
    y: typeof window !== 'undefined' ? Math.max(60, window.innerHeight - 320) : 300,
  }));
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [shifted, setShifted] = useState(false);
  const kbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    if ((e.target as HTMLElement).closest('button')) return;
    setDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [dragging, dragOffset]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShifted(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShifted(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const rows = shifted ? ARABIC_ROWS_SHIFTED : ARABIC_ROWS_NORMAL;

  // Press handler that works on both touch & mouse without losing focus or double firing
  const pressKey = (char: string) => (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onKeyPress(char);
  };

  const containerStyle: React.CSSProperties = isMobile
    ? { left: 4, right: 4, bottom: 4, cursor: 'default' }
    : { left: position.x, top: position.y, cursor: dragging ? 'grabbing' : 'grab', minWidth: 520 };

  const keyboardUi = (
    <div
      ref={kbRef}
      data-arabic-keyboard="true"
      className={`fixed z-[100] bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl select-none ${isMobile ? 'p-2' : 'p-3'}`}
      style={containerStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-muted-foreground">⌨️ Arabic Keyboard</span>
        <div className="flex items-center gap-2">
          {shifted && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">SHIFT</span>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      {/* Dedicated Tashkeel / Harakat Palette Bar */}
      <div className="mb-2 p-1 bg-muted/40 rounded-xl border border-border/40">
        <div className="flex items-center justify-between px-1 mb-1 text-[10px] text-muted-foreground font-medium">
          <span>হরকত / যের-যবর (Tashkeel):</span>
          <span className="text-[9px] opacity-75">অক্ষরের পর ক্লিক করুন</span>
        </div>
        <div className="flex flex-wrap gap-1 justify-center" dir="rtl">
          {ARABIC_TASHKEEL.map((t, ti) => (
            <button
              key={ti}
              type="button"
              className="h-8 min-w-[2.2rem] px-1.5 rounded-lg bg-secondary/90 hover:bg-primary/20 hover:text-primary active:scale-95 text-sm font-bold border border-border/40 transition-all flex flex-col items-center justify-center leading-none"
              title={`${t.nameBn} ${t.shortcut ? `(${t.shortcut})` : ''}`}
              onTouchStart={pressKey(t.char)}
              onMouseDown={(e) => { if (isMobile) return; pressKey(t.char)(e); }}
            >
              <span className="text-base font-bold text-primary">{t.sample}</span>
              <span className="text-[8px] text-muted-foreground font-normal leading-none mt-0.5" dir="ltr">{t.nameBn.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {rows.map((row, ri) => (
        <div key={ri} className={`flex justify-center mb-1 ${isMobile ? 'gap-[3px]' : 'gap-1'}`} dir="rtl">
          {ri === 3 && (
            <button
              className={`${isMobile ? 'h-10 px-2 text-[10px]' : 'h-9 px-3 text-[10px]'} rounded-lg font-bold transition-all shrink-0 ${shifted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/20'}`}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); setShifted(s => !s); }}
              onMouseDown={(e) => { if (isMobile) return; e.preventDefault(); e.stopPropagation(); setShifted(s => !s); }}
            >Shift</button>
          )}
          {row.map((char) => {
            const isHighlighted = highlightedKey === char;
            return (
              <button
                key={`${ri}-${char}`}
                className={`${isMobile ? 'h-10 flex-1 min-w-0 px-0.5 text-sm' : 'h-9 min-w-[2.2rem] px-1.5 text-base'} rounded-lg font-medium transition-all duration-100
                  ${isHighlighted
                    ? 'bg-primary text-primary-foreground scale-110 shadow-md'
                    : 'bg-secondary/80 hover:bg-primary/20 hover:text-primary active:scale-95'
                  }`}
                onTouchStart={pressKey(char)}
                onMouseDown={(e) => { if (isMobile) return; pressKey(char)(e); }}
              >
                {char}
              </button>
            );
          })}
          {ri === 0 && (
            <button
              type="button"
              className={`${isMobile ? 'h-10 px-3 text-xs' : 'h-9 px-3 text-xs'} rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold shrink-0 transition-colors flex items-center justify-center gap-1 active:scale-95`}
              title="মুছুন (Backspace / ⌫)"
              onTouchStart={pressKey('BACKSPACE')}
              onMouseDown={(e) => { if (isMobile) return; pressKey('BACKSPACE')(e); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onKeyPress('BACKSPACE'); }}
            >
              <span>⌫</span>
              <span className="text-[10px] hidden sm:inline">মুছুন</span>
            </button>
          )}
          {ri === 2 && (
            <button
              className={`${isMobile ? 'h-10 px-2 text-[10px]' : 'h-9 px-3 text-[10px]'} rounded-lg bg-muted text-muted-foreground font-bold shrink-0`}
              onTouchStart={pressKey('\n')}
              onMouseDown={(e) => { if (isMobile) return; pressKey('\n')(e); }}
            >Enter ↵</button>
          )}
        </div>
      ))}
      <div className="flex gap-1 justify-center mt-1">
        <button
          className={`${isMobile ? 'h-10' : 'h-9'} flex-1 max-w-[280px] rounded-lg bg-secondary/80 hover:bg-primary/20 text-sm transition-colors`}
          onTouchStart={pressKey(' ')}
          onMouseDown={(e) => { if (isMobile) return; pressKey(' ')(e); }}
        >Space</button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return keyboardUi;

  return createPortal(keyboardUi, document.body);
};

// ─── Quick Symbols Bar ───
const QuickSymbolsBar = ({ onInsert, activeInputRef }: { onInsert: (char: string) => void; activeInputRef: HTMLInputElement | HTMLTextAreaElement | null }) => {
  const [category, setCategory] = useState<'tashkeel' | 'arabic' | 'math' | 'bengali'>('tashkeel');
  const symbols = QUICK_SYMBOLS[category];

  const handleInsert = (sym: string) => {
    if (!activeInputRef) return;
    const el = activeInputRef;
    el.focus();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const newVal = el.value.slice(0, start) + sym + el.value.slice(end);
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(el, newVal);
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    const newPos = start + sym.length;
    requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
  };

  return (
    <div className="flex items-center gap-1 flex-wrap bg-muted/50 rounded-xl px-2 py-1.5 border border-border/40 shadow-sm">
      <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex gap-0.5 mr-1">
        {(['tashkeel', 'arabic', 'math', 'bengali'] as const).map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${category === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-primary/20'}`}>
            {cat === 'tashkeel' ? 'হরকত (যের-যবর)' : cat === 'arabic' ? 'আরবি' : cat === 'math' ? 'গণিত (∑)' : 'বাংলা'}
          </button>
        ))}
      </div>
      <div className="flex gap-0.5 flex-wrap">
        {category === 'tashkeel' ? (
          ARABIC_TASHKEEL.map((t, i) => (
            <button
              key={i}
              onClick={() => handleInsert(t.char)}
              className="h-7 min-w-[2.2rem] px-1.5 rounded bg-secondary/80 hover:bg-primary/20 hover:text-primary text-xs font-bold transition-colors inline-flex items-center gap-1"
              title={`${t.nameBn} ${t.shortcut ? `(${t.shortcut})` : ''}`}
            >
              <span className="text-sm font-bold text-primary">{t.sample}</span>
              <span className="text-[9px] text-muted-foreground">{t.nameBn.split(' ')[0]}</span>
            </button>
          ))
        ) : (
          symbols.map((sym, i) => (
            <button key={i} onClick={() => handleInsert(sym)}
              className="h-7 min-w-[1.8rem] px-1 rounded bg-secondary/80 hover:bg-primary/20 hover:text-primary text-xs font-medium transition-colors"
              title={sym}>
              {sym.length > 4 ? sym.slice(0, 4) + '…' : sym}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const QUESTION_TYPES = [
  { value: 'descriptive', labelBn: 'বর্ণনামূলক', labelEn: 'Descriptive' },
  { value: 'mcq', labelBn: 'বহুনির্বাচনী (MCQ)', labelEn: 'MCQ' },
  { value: 'short', labelBn: 'সংক্ষিপ্ত', labelEn: 'Short Answer' },
  { value: 'fill_blank', labelBn: 'শূন্যস্থান পূরণ', labelEn: 'Fill in the Blank' },
  { value: 'true_false', labelBn: 'সত্য/মিথ্যা', labelEn: 'True/False' },
  { value: 'matching', labelBn: 'মিলকরণ', labelEn: 'Matching' },
];

const STATUS_CONFIG: Record<string, { label: string; labelBn: string; color: string; icon: any }> = {
  pending: { label: 'Pending', labelBn: 'অপেক্ষমান', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approved', labelBn: 'অনুমোদিত', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  rejected: { label: 'Rejected', labelBn: 'প্রত্যাখ্যাত', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: X },
  revision: { label: 'Needs Revision', labelBn: 'সংশোধন প্রয়োজন', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle },
};

const FONT_PRESETS = {
  arabic: [
    { value: 'Amiri', label: 'Amiri' },
    { value: 'Traditional Arabic', label: 'Traditional Arabic' },
    { value: 'Noto Naskh Arabic', label: 'Noto Naskh Arabic' },
    { value: 'Scheherazade New', label: 'Scheherazade New' },
  ],
  bengali: [
    { value: 'SutonnyOMJ', label: 'SutonnyOMJ (Unicode)' },
    { value: 'SutonnyMJ', label: 'SutonnyMJ (ASCII/Bijoy)' },
    { value: 'Noto Sans Bengali', label: 'Noto Sans Bengali' },
    { value: 'Hind Siliguri', label: 'Hind Siliguri' },
  ],
  english: [
    { value: 'Arial', label: 'Arial' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Georgia', label: 'Georgia' },
  ],
};

const HEADER_STYLES = [
  { value: 'compact', labelBn: 'আঁটসাঁট (কম্প্যাক্ট - ২ লাইন)', labelEn: 'Compact (2-Line)' },
  { value: 'ultra_compact', labelBn: 'অতি স্লিম (১ লাইন - সর্বোচ্চ স্পেস সেভিং)', labelEn: 'Ultra Slim (1-Line)' },
  { value: 'simple', labelBn: 'সাধারণ স্লিম', labelEn: 'Simple Slim' },
  { value: 'classic', labelBn: 'ক্লাসিক ERP', labelEn: 'Classic ERP' },
  { value: 'decorative', labelBn: 'ডেকোরেটিভ বক্স', labelEn: 'Decorative Box' },
];

interface FontConfig {
  arabic: string;
  bengali: string;
  english: string;
  fontSize: number;
}

interface HeaderConfig {
  showLogo: boolean;
  showInstitutionName: boolean;
  centered: boolean;
}

interface LayoutSettings {
  orientation: 'portrait' | 'landscape';
  columns: 1 | 2;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  lineSpacing: number;
  watermark: boolean;
  headerStyle: 'compact' | 'ultra_compact' | 'simple' | 'decorative' | 'classic';
  headerPlacement: 'dual' | 'single'; // 'dual': Word booklet style (header on both parts when 2 columns)
  columnFlow: 'fill_first' | 'balanced' | 'auto';
  columnBreakIndex?: number;
  questionLabelBn: string;
  questionLabelEn: string;
  showQuestionMarks: boolean;
}

const DEFAULT_LAYOUT: LayoutSettings = {
  orientation: 'portrait',
  columns: 1,
  marginTop: 6,
  marginBottom: 6,
  marginLeft: 8,
  marginRight: 8,
  lineSpacing: 1.2,
  watermark: false,
  headerStyle: 'compact',
  headerPlacement: 'dual',
  columnFlow: 'fill_first',
  questionLabelBn: 'প্রশ্ন (বাংলা/আরবি)',
  questionLabelEn: 'Question (BN/AR)',
  showQuestionMarks: true,
};

interface Question {
  id?: string;
  question_text: string;
  question_text_bn: string;
  question_type: string;
  marks: number;
  sort_order: number;
  group_label: string;
  group_label_bn: string;
  group_marks: number | null;
  options: any;
  answer: string;
  custom_label?: string;
  column_break?: boolean; // When true, starts Column 2 (Right side)
}

const toBengaliNum = (n: number): string => {
  const digits = '০১২৩৪৫৬৭৮৯';
  return String(n).replace(/[0-9]/g, d => digits[parseInt(d)]);
};

const BENGALI_MCQ_LABELS = ['(ক)', '(খ)', '(গ)', '(ঘ)', '(ঙ)', '(চ)', '(ছ)', '(জ)'];
const BENGALI_MCQ_DOT_LABELS = ['ক.', 'খ.', 'গ.', 'ঘ.', 'ঙ.', 'চ.', 'ছ.', 'জ.'];
const ROMAN_MCQ_LABELS = ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)', '(vii)', '(viii)'];
const ROMAN_MCQ_DOT_LABELS = ['i.', 'ii.', 'iii.', 'iv.', 'v.', 'vi.', 'vii.', 'viii.'];
const ROMAN_UPPER_MCQ_LABELS = ['(I)', '(II)', '(III)', '(IV)', '(V)', '(VI)', '(VII)', '(VIII)'];
const ENGLISH_MCQ_LABELS = ['(A)', '(B)', '(C)', '(D)', '(E)', '(F)', '(G)', '(H)'];
const ENGLISH_MCQ_DOT_LABELS = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.'];

const getOptionPrefix = (opt: any, index: number, isBn: boolean = true) => {
  if (opt?.label && String(opt.label).trim()) {
    return String(opt.label).trim();
  }
  if (opt?.custom_label && String(opt.custom_label).trim()) {
    return String(opt.custom_label).trim();
  }
  return isBn ? (BENGALI_MCQ_LABELS[index] || `(${index + 1})`) : `${String.fromCharCode(65 + index)}.`;
};

// Convert mixed-script digits (Bengali ০-৯, Arabic-Indic ٠-٩, English 0-9) to a number.
// Returns 0 when input has no recognizable digits, so the controlled input stays valid.
const parseMultilingualNum = (s: string): number => {
  if (!s) return 0;
  const map: Record<string, string> = {
    '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9',
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  };
  const normalized = s.replace(/[০-৯٠-٩]/g, ch => map[ch] ?? ch);
  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
};

const StatusBadge = ({ status, language }: { status: string; language: string }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {language === 'bn' ? config.labelBn : config.label}
    </span>
  );
};

// ─── Format Duration in Hours & Minutes ───
const formatDuration = (minutes: number, language: string): string => {
  if (!minutes || minutes <= 0) return language === 'bn' ? '০ মিনিট' : '0 min';
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (language === 'bn') {
    if (hours > 0 && remMinutes > 0) {
      return `${toBengaliNum(hours)} ঘণ্টা ${toBengaliNum(remMinutes)} মিনিট`;
    }
    if (hours > 0) {
      return `${toBengaliNum(hours)} ঘণ্টা`;
    }
    return `${toBengaliNum(remMinutes)} মিনিট`;
  }

  // English
  if (hours > 0 && remMinutes > 0) {
    return `${hours} hr ${remMinutes} min`;
  }
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${remMinutes} min`;
};

// ─── Exam Title Combiner ───
// ─── Exam & Subject Header Formatter ───
const formatHeaderExamAndSubject = (
  sessionName: string,
  paperTitle: string,
  subjectName?: string,
  language: string = 'bn'
) => {
  const s = (sessionName || '').trim();
  const p = (paperTitle || '').trim();
  const subj = (subjectName || '').trim();

  // Detect if paper title indicates a "পত্র" (e.g. ১ম পত্র, ২য় পত্র, ১ম পাতা, Paper 1, Part 1)
  const isPatra = /(?:[১-৯1-9]|\b(প্রথম|দ্বিতীয়|তৃতীয়|১ম|২য়|৩য়|৪র্থ|1st|2nd|3rd)\b)?\s*(?:পত্র|পাতা|paper|part)/i.test(p);

  let examLabel = s;
  let subjectLabel = subj;

  if (isPatra) {
    // Attach "১ম পত্র" directly to the subject!
    if (subj) {
      if (!subj.includes(p)) {
        subjectLabel = `${subj} (${p})`;
      } else {
        subjectLabel = subj;
      }
    } else {
      subjectLabel = p;
    }
    examLabel = s || '';
  } else if (p && p.toLowerCase() !== s.toLowerCase()) {
    // If paper title is different from session name
    if (subj && !subj.includes(p) && !s.includes(p)) {
      subjectLabel = `${subj} (${p})`;
      examLabel = s;
    } else if (!s) {
      examLabel = p;
    } else if (!s.includes(p)) {
      examLabel = `${s} • ${p}`;
    }
  }

  // Fallback if examLabel is empty
  if (!examLabel) {
    examLabel = s || (subj ? '' : p);
  }

  return { examLabel, subjectLabel };
};

// ─── Header Renderers ───
const renderHeader = (
  style: string,
  paper: any,
  institution: any,
  language: string,
  fontFamily: string,
  totalMarks: number,
  sessionName: string,
  subjectName: string,
  showLogo: boolean,
  showName: boolean,
  isSecondary: boolean = false
) => {
  const paperTitle = language === 'bn' ? paper?.title_bn : paper?.title;
  const { examLabel, subjectLabel } = formatHeaderExamAndSubject(sessionName, paperTitle, subjectName, language);
  const instName = language === 'bn' ? institution?.name : institution?.name_en || institution?.name;
  const address = institution?.address;
  const bnMarks = language === 'bn' ? toBengaliNum(totalMarks) : totalMarks;
  const formattedDur = formatDuration(paper?.duration_minutes || 0, language);

  // Ultra-compact: 1-2 lines maximum (saves maximum vertical space)
  if (style === 'ultra_compact') {
    return (
      <div className="mb-1 pb-0.5 border-b border-black text-center leading-tight select-none" style={{ fontFamily }}>
        <div className="flex items-center justify-between gap-1 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            {showLogo && institution?.logo_url && (
              <img src={institution.logo_url} alt="" className="h-5 max-w-[20px] object-contain shrink-0" />
            )}
            {showName && instName && <strong className="text-xs">{instName}</strong>}
            {address && <span className="text-[8.5px] text-gray-500 hidden sm:inline">({address})</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            {examLabel && <span className="font-bold">{examLabel}</span>}
            {subjectLabel && <span className="font-semibold text-primary/90">📖 {subjectLabel}</span>}
          </div>
        </div>
        <div className="flex justify-between items-center mt-0.5 text-[9px] font-medium px-0.5 text-gray-700">
          <span>{language === 'bn' ? 'পূর্ণমান' : 'Marks'}: {bnMarks}</span>
          {isSecondary && <span className="text-[8.5px] text-gray-500 font-normal bg-gray-100 px-1 rounded">(২য় অংশ)</span>}
          <span>{language === 'bn' ? 'সময়' : 'Time'}: {formattedDur}</span>
        </div>
      </div>
    );
  }

  // Classic ERP
  if (style === 'classic') {
    return (
      <div className="mb-1.5 pb-0.5 text-center select-none leading-tight" style={{ fontFamily }}>
        <div className="flex items-center justify-center gap-2 mb-0.5">
          {showLogo && institution?.logo_url && (
            <img src={institution.logo_url} alt="" className="h-5 max-w-[24px] object-contain shrink-0" />
          )}
          <div>
            {showName && instName && <h2 className="text-xs sm:text-sm font-bold m-0 leading-tight">{instName}</h2>}
            {address && <p className="text-[8.5px] text-gray-500 m-0 leading-none">{address}</p>}
          </div>
        </div>
        <div className="border-t border-b border-black py-0.5 my-0.5 text-center leading-tight">
          {examLabel && <div className="text-[10.5px] font-bold">{examLabel}</div>}
          {subjectLabel && <div className="text-[9.5px] font-semibold text-gray-800 mt-0.5">📖 {language === 'bn' ? 'বিষয়: ' : 'Subject: '}{subjectLabel}</div>}
        </div>
        <div className="flex justify-between items-center text-[9px] font-medium px-1">
          <span>{language === 'bn' ? 'পূর্ণমান' : 'Marks'}: {bnMarks}</span>
          {isSecondary && <span className="text-[8.5px] text-gray-500 font-normal bg-gray-100 px-1 rounded">(২য় অংশ)</span>}
          <span>{language === 'bn' ? 'সময়' : 'Time'}: {formattedDur}</span>
        </div>
      </div>
    );
  }

  // Decorative box
  if (style === 'decorative') {
    return (
      <div className="mb-1.5 pb-0.5 text-center select-none" style={{ fontFamily }}>
        <div className="border border-black p-1.5 rounded-md">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            {showLogo && institution?.logo_url && <img src={institution.logo_url} alt="" className="h-5 max-w-[22px] object-contain" />}
            <div>
              {showName && instName && <h2 className="text-xs sm:text-sm font-bold m-0 leading-tight">{instName}</h2>}
              {address && <p className="text-[8.5px] text-gray-500 m-0 leading-none">{address}</p>}
            </div>
          </div>
          <div className="border-t border-dashed border-gray-400 my-0.5" />
          <div className="my-0.5 leading-tight">
            {examLabel && <div className="text-[10.5px] font-bold">{examLabel}</div>}
            {subjectLabel && <div className="text-[9.5px] font-semibold text-gray-800 mt-0.5">📖 {language === 'bn' ? 'বিষয়: ' : 'Subject: '}{subjectLabel}</div>}
          </div>
          <div className="flex justify-between items-center mt-0.5 text-[9px] font-medium px-1">
            <span>{language === 'bn' ? 'পূর্ণমান' : 'Marks'}: {bnMarks}</span>
            {isSecondary && <span className="text-[8.5px] text-gray-500 font-normal">(২য় অংশ)</span>}
            <span>{language === 'bn' ? 'সময়' : 'Time'}: {formattedDur}</span>
          </div>
        </div>
      </div>
    );
  }

  // Compact (Default) & Simple (Both streamlined so they NEVER take half the page)
  return (
    <div className="mb-1.5 pb-1 border-b border-black text-center leading-tight select-none" style={{ fontFamily }}>
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        {showLogo && institution?.logo_url && (
          <img src={institution.logo_url} alt="" className="h-6 max-w-[26px] object-contain shrink-0" />
        )}
        <div className="leading-tight">
          {showName && instName && (
            <h2 className="text-xs sm:text-sm font-bold leading-tight m-0 tracking-tight">
              {instName}
            </h2>
          )}
          {address && (
            <p className="text-[8.5px] text-gray-500 leading-none m-0 mt-0.5">{address}</p>
          )}
        </div>
      </div>
      {examLabel && (
        <div className="text-[11px] sm:text-xs font-bold mt-0.5 leading-tight tracking-tight">
          {examLabel}
        </div>
      )}
      {subjectLabel && (
        <div className="text-[10px] sm:text-[10.5px] font-semibold mt-0.5 leading-tight text-gray-800">
          📖 {language === 'bn' ? 'বিষয়: ' : 'Subject: '}{subjectLabel}
        </div>
      )}
      <div className="flex justify-between items-center mt-0.5 text-[9.5px] font-medium px-1">
        <span>{language === 'bn' ? 'পূর্ণমান' : 'Full Marks'}: {bnMarks}</span>
        {isSecondary && <span className="text-[8.5px] text-gray-500 font-normal bg-gray-100 px-1 rounded">(২য় অংশ / পাতা)</span>}
        <span>{language === 'bn' ? 'সময়' : 'Time'}: {formattedDur}</span>
      </div>
    </div>
  );
};

// ─── Live Preview Component ───
const LivePreview = ({ paper, questions, fontConfig, headerConfig, institution, language, layout }: {
  paper: any; questions: Question[]; fontConfig: FontConfig; headerConfig: HeaderConfig; institution: any; language: string; layout: LayoutSettings;
}) => {
  const effectiveBengaliFont = fontConfig.bengali === 'SutonnyMJ'
    ? '"Noto Sans Bengali", "SutonnyOMJ", sans-serif'
    : fontConfig.bengali;
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  const sessionName = paper?.exam_sessions ? (language === 'bn' ? paper.exam_sessions.name_bn : paper.exam_sessions.name) : '';
  const subjectName = paper?.subjects ? (language === 'bn' ? paper.subjects.name_bn : paper.subjects.name) : '';

  const isLandscape = layout.orientation === 'landscape';
  const aspectRatio = isLandscape ? '297/210' : '210/297';

  const questionItems = questions.map((q, i) => {
    const qText = language === 'bn' ? q.question_text_bn || q.question_text : q.question_text;
    const isArabic = /[\u0600-\u06FF]/.test(qText);
    const fontFamily = isArabic ? fontConfig.arabic : effectiveBengaliFont;
    const serial = language === 'bn' ? toBengaliNum(i + 1) : String(i + 1);

    return (
      <div key={i} className="mb-2" style={{ fontFamily, lineHeight: layout.lineSpacing }}>
        {((language === 'bn' ? q.group_label_bn : q.group_label) || '').trim() && (i === 0 || (language === 'bn' ? q.group_label_bn : q.group_label) !== (language === 'bn' ? questions[i - 1]?.group_label_bn : questions[i - 1]?.group_label)) ? (
          <div className="font-bold text-center mb-2 mt-3 py-1 border-b border-gray-300">
            <span className="text-sm tracking-wide">{language === 'bn' ? q.group_label_bn : q.group_label}</span>
            {q.group_marks != null && q.group_marks > 0 && (
              <span className="text-xs font-semibold text-gray-500 ml-2">
                [{language === 'bn' ? toBengaliNum(q.group_marks) : q.group_marks} {language === 'bn' ? 'নম্বর' : 'marks'}]
              </span>
            )}
          </div>
        ) : null}
        <div className="flex justify-between text-sm" dir={isArabic ? 'rtl' : 'ltr'}>
          <span>
            <strong className="mr-1">{q.custom_label?.trim() || `${serial}.`}</strong>
            {qText || ''}
          </span>
          {layout.showQuestionMarks && q.marks > 0 && (
            <span className="text-gray-500 shrink-0 ml-2">[{language === 'bn' ? toBengaliNum(q.marks) : q.marks}]</span>
          )}
        </div>
        {q.question_type === 'mcq' && Array.isArray(q.options) && (
          <div className="ml-6 mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs">
            {q.options.map((opt: any, oi: number) => {
              const prefix = getOptionPrefix(opt, oi, language === 'bn' || !!opt.text_bn);
              const text = language === 'bn' ? opt.text_bn || opt.text : opt.text || opt.text_bn;
              return (
                <span key={oi} className="inline-flex items-baseline gap-1">
                  <strong className="text-primary/90 font-bold">{prefix}</strong>
                  <span>{text}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  });

  // Split into columns (supports manual column_break or auto)
  const getSplitIndex = () => {
    const breakIndex = questions.findIndex(q => q.column_break);
    if (breakIndex !== -1) {
      return breakIndex === 0 ? 1 : breakIndex;
    }
    // If user explicitly chose balanced (50/50 split) in layout settings:
    if (layout.columnFlow === 'balanced' && questions.length > 2) {
      return Math.ceil(questions.length / 2);
    }
    // Default & 'fill_first': Fill Column 1 (Part 1) fully before jumping to Part 2!
    const col1Capacity = layout.orientation === 'landscape' ? 8 : 12;
    if (questions.length <= col1Capacity) {
      return questions.length; // All questions stay in Part 1!
    }
    return col1Capacity;
  };

  const isDualHeader = layout.columns === 2 && layout.headerPlacement === 'dual';
  const splitIndex = getSplitIndex();
  const col1Items = questionItems.slice(0, splitIndex);
  const col2Items = questionItems.slice(splitIndex);

  const header1 = renderHeader(
    layout.headerStyle,
    paper,
    institution,
    language,
    effectiveBengaliFont,
    totalMarks,
    sessionName,
    subjectName,
    headerConfig.showLogo,
    headerConfig.showInstitutionName,
    false
  );

  const header2 = renderHeader(
    layout.headerStyle,
    paper,
    institution,
    language,
    effectiveBengaliFont,
    totalMarks,
    sessionName,
    subjectName,
    headerConfig.showLogo,
    headerConfig.showInstitutionName,
    true
  );

  const instructionsEl = (paper?.instructions_bn || paper?.instructions) && (
    <div className="mb-2 p-1.5 bg-gray-50 rounded text-[11px] italic leading-tight">
      {language === 'bn' ? paper?.instructions_bn : paper?.instructions}
    </div>
  );

  const renderContent = () => {
    if (questions.length === 0) {
      return (
        <div>
          {header1}
          {instructionsEl}
          <div className="text-center text-gray-400 py-12 text-sm">
            {language === 'bn' ? 'বাম পাশে প্রশ্ন যোগ করুন — এখানে লাইভ প্রিভিউ দেখাবে' : 'Add questions on the left — live preview will appear here'}
          </div>
        </div>
      );
    }

    if (layout.columns === 2) {
      if (isDualHeader) {
        // MS Word Booklet Style: Header on both parts!
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="border-r border-dashed border-gray-300 pr-3">
              {header1}
              {instructionsEl}
              {col1Items}
            </div>
            <div className="pl-1">
              {header2}
              {col2Items.length > 0 ? col2Items : (
                <div className="text-center text-gray-300 py-8 text-xs border border-dashed rounded-lg">
                  {language === 'bn' ? '২য় পার্ট (বামে প্রশ্ন যোগ করলে বা কলাম ব্রেক দিলে এখানে আসবে)' : 'Part 2'}
                </div>
              )}
            </div>
          </div>
        );
      }

      // Single Header at top
      return (
        <div>
          {header1}
          {instructionsEl}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-r border-gray-200 pr-3">
              {col1Items}
            </div>
            <div className="pl-1">
              {col2Items}
            </div>
          </div>
        </div>
      );
    }

    // 1 Column
    return (
      <div>
        {header1}
        {instructionsEl}
        <div>{questionItems}</div>
      </div>
    );
  };

  return (
    <div className="bg-white text-black rounded-xl overflow-hidden"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="p-1">
        <div className="relative" style={{
          fontFamily: effectiveBengaliFont,
          fontSize: `${fontConfig.fontSize}px`,
          aspectRatio,
          maxHeight: '74vh',
          overflow: 'auto',
        }}>
          {/* Watermark */}
          {layout.watermark && institution?.logo_url && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0">
              <img src={institution.logo_url} alt="" className="w-2/3 max-w-[300px]" />
            </div>
          )}

          <div className="relative z-10" style={{
            padding: `${layout.marginTop}px ${layout.marginRight}px ${layout.marginBottom}px ${layout.marginLeft}px`,
          }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Layout Settings Panel ───
const LayoutSettingsPanel = ({
  layout,
  setLayout,
  headerConfig,
  setHeaderConfig,
  language
}: {
  layout: LayoutSettings;
  setLayout: (l: LayoutSettings) => void;
  headerConfig: HeaderConfig;
  setHeaderConfig: React.Dispatch<React.SetStateAction<HeaderConfig>>;
  language: string;
}) => {
  const applyMarginPreset = (m: number) => {
    setLayout({ ...layout, marginTop: m, marginBottom: m, marginLeft: m, marginRight: m });
  };

  return (
    <Card className="card-elevated">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{language === 'bn' ? 'পেজ ও মার্জিন সেটআপ' : 'Page & Margin Setup'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground mr-1">{language === 'bn' ? 'মার্জিন প্রিসেট:' : 'Preset:'}</span>
            <button
              onClick={() => applyMarginPreset(4)}
              className="text-[10px] px-2 py-0.5 rounded bg-secondary hover:bg-primary/20 text-foreground font-medium transition-colors"
              title="4px Margin"
            >
              {language === 'bn' ? '⚡ অতি স্লিম (৪px)' : 'Ultra Slim (4px)'}
            </button>
            <button
              onClick={() => applyMarginPreset(8)}
              className="text-[10px] px-2 py-0.5 rounded bg-secondary hover:bg-primary/20 text-foreground font-medium transition-colors"
              title="8px Margin"
            >
              {language === 'bn' ? '📐 সাধারণ (৮px)' : 'Standard (8px)'}
            </button>
          </div>
        </div>

        {/* Row 1: Orientation + Columns + Header Style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">{language === 'bn' ? 'ওরিয়েন্টেশন' : 'Orientation'}</Label>
            <Select value={layout.orientation} onValueChange={(v: 'portrait' | 'landscape') => setLayout({ ...layout, orientation: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">{language === 'bn' ? '📄 লম্বালম্বি (Portrait)' : '📄 Portrait'}</SelectItem>
                <SelectItem value="landscape">{language === 'bn' ? '📄 আড়াআড়ি (Landscape)' : '📄 Landscape'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'কলাম (পার্ট)' : 'Columns'}</Label>
            <Select value={String(layout.columns)} onValueChange={v => setLayout({ ...layout, columns: Number(v) as 1 | 2 })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{language === 'bn' ? '১ কলাম (পূর্ণ পেজ)' : '1 Column'}</SelectItem>
                <SelectItem value="2">{language === 'bn' ? '২ কলাম (২ পার্ট স্প্লিট)' : '2 Columns'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'হেডার স্টাইল' : 'Header Style'}</Label>
            <Select value={layout.headerStyle} onValueChange={(v: any) => setLayout({ ...layout, headerStyle: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEADER_STYLES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{language === 'bn' ? s.labelBn : s.labelEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 1.5: If 2 columns, Header Placement & Column Flow */}
        {layout.columns === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
            <div>
              <Label className="text-xs font-semibold text-primary">{language === 'bn' ? '২ পার্টে হেডার বিন্যাস' : '2-Part Header'}</Label>
              <Select value={layout.headerPlacement} onValueChange={(v: 'dual' | 'single') => setLayout({ ...layout, headerPlacement: v })}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dual">{language === 'bn' ? '📖 উভয় পাশে হেডার (ওয়ার্ড বুকলেট)' : 'Dual Headers (Booklet)'}</SelectItem>
                  <SelectItem value="single">{language === 'bn' ? '📄 একক শীর্ষ হেডার (উপরে পুরো পেজ)' : 'Single Full-Width Header'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-primary">{language === 'bn' ? 'কলামের লেখা প্রবাহ' : 'Column Flow'}</Label>
              <Select value={layout.columnFlow === 'balanced' ? 'balanced' : 'fill_first'} onValueChange={(v: 'fill_first' | 'balanced') => setLayout({ ...layout, columnFlow: v })}>
                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fill_first">{language === 'bn' ? '📝 ১ম পার্ট পূর্ণ করে ২য় পার্ট (প্রস্তাবিত)' : 'Fill Part 1 First (Recommended)'}</SelectItem>
                  <SelectItem value="balanced">{language === 'bn' ? '⚖️ সমান দুভাগ (৫০/৫০ ভাগ)' : 'Balanced (50/50 Split)'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Row 2: Header Visibility Toggles */}
        <div className="flex flex-wrap items-center gap-5 pt-1 border-t border-border/50 text-xs">
          <span className="font-semibold text-muted-foreground">{language === 'bn' ? 'হেডার প্রদর্শন:' : 'Header Controls:'}</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={headerConfig.showLogo} onCheckedChange={v => setHeaderConfig(p => ({ ...p, showLogo: v }))} />
            <span>{language === 'bn' ? 'লোগো' : 'Logo'}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <Switch checked={headerConfig.showInstitutionName} onCheckedChange={v => setHeaderConfig(p => ({ ...p, showInstitutionName: v }))} />
            <span>{language === 'bn' ? 'প্রতিষ্ঠানের নাম' : 'Institution Name'}</span>
          </label>
        </div>

        {/* Row 3: Margins */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/50">
          <div>
            <Label className="text-xs">{language === 'bn' ? 'উপরের মার্জিন' : 'Top'}: {layout.marginTop}px</Label>
            <Slider value={[layout.marginTop]} onValueChange={([v]) => setLayout({ ...layout, marginTop: v })} min={2} max={30} step={1} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'নিচের মার্জিন' : 'Bottom'}: {layout.marginBottom}px</Label>
            <Slider value={[layout.marginBottom]} onValueChange={([v]) => setLayout({ ...layout, marginBottom: v })} min={2} max={30} step={1} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'বাম মার্জিন' : 'Left'}: {layout.marginLeft}px</Label>
            <Slider value={[layout.marginLeft]} onValueChange={([v]) => setLayout({ ...layout, marginLeft: v })} min={2} max={30} step={1} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'ডান মার্জিন' : 'Right'}: {layout.marginRight}px</Label>
            <Slider value={[layout.marginRight]} onValueChange={([v]) => setLayout({ ...layout, marginRight: v })} min={2} max={30} step={1} className="mt-1" />
          </div>
        </div>

        {/* Row 4: Line Spacing + Watermark + Question Marks */}
        <div className="flex items-center gap-6 pt-1 border-t border-border/50">
          <div className="flex-1">
            <Label className="text-xs">{language === 'bn' ? 'লাইন স্পেসিং' : 'Line Spacing'}: {layout.lineSpacing}</Label>
            <Slider value={[layout.lineSpacing]} onValueChange={([v]) => setLayout({ ...layout, lineSpacing: v })} min={1} max={2.2} step={0.05} className="mt-1" />
          </div>
          <label className="flex items-center gap-2 text-xs whitespace-nowrap cursor-pointer">
            <Switch checked={layout.watermark} onCheckedChange={v => setLayout({ ...layout, watermark: v })} />
            {language === 'bn' ? 'ওয়াটারমার্ক' : 'Watermark'}
          </label>
          <label className="flex items-center gap-2 text-xs whitespace-nowrap cursor-pointer">
            <Switch checked={layout.showQuestionMarks} onCheckedChange={v => setLayout({ ...layout, showQuestionMarks: v })} />
            {language === 'bn' ? 'প্রশ্নের নম্বর' : 'Question Marks'}
          </label>
        </div>

        {/* Row 5: Custom Question Labels */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
          <div>
            <Label className="text-xs">{language === 'bn' ? 'প্রশ্ন লেবেল (বাংলা)' : 'Question Label (BN)'}</Label>
            <Input className="h-8 text-xs" value={layout.questionLabelBn} onChange={e => setLayout({ ...layout, questionLabelBn: e.target.value })} placeholder="প্রশ্ন (বাংলা/আরবি)" />
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'প্রশ্ন লেবেল (ইংরেজি)' : 'Question Label (EN)'}</Label>
            <Input className="h-8 text-xs" value={layout.questionLabelEn} onChange={e => setLayout({ ...layout, questionLabelEn: e.target.value })} placeholder="Question (BN/AR)" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Main Component ───
const AdminQuestionPapers = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showArabicKeyboard, setShowArabicKeyboard] = useState(false);
  const [activeInputRef, setActiveInputRef] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [highlightedArabicKey, setHighlightedArabicKey] = useState<string | null>(null);
  const [showFontPanel, setShowFontPanel] = useState(false);
  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const [fontConfig, setFontConfig] = useState<FontConfig>({ arabic: 'Amiri', bengali: 'SutonnyOMJ', english: 'Arial', fontSize: 14 });
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig>({ showLogo: true, showInstitutionName: true, centered: true });
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(DEFAULT_LAYOUT);

  const [bijoyMode, setBijoyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('edumate_bijoy_mode') === 'true' || fontConfig.bengali === 'SutonnyMJ';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('edumate_bijoy_mode', String(bijoyMode));
    } catch {}
  }, [bijoyMode]);

  // Bijoy ASCII→Unicode keydown interceptor
  useEffect(() => {
    if (!bijoyMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT';
      const isTextarea = target.tagName === 'TEXTAREA';
      if (!isInput && !isTextarea) return;
      if (isInput) {
        const inputEl = target as HTMLInputElement;
        const inputType = inputEl.type?.toLowerCase() || 'text';
        if (!['text', 'search', ''].includes(inputType)) return;
        // Skip numeric inputs (marks field etc.)
        if (inputEl.inputMode === 'numeric' || inputEl.dataset.noBijoy === 'true') return;
      }
      const char = e.key;
      if (char.length !== 1) return;
      if (!isBijoyKey(char)) return;

      const el = target as HTMLInputElement | HTMLTextAreaElement;
      const start = el.selectionStart ?? el.value.length;
      const prevChar = start > 0 ? el.value[start - 1] : undefined;
      const { text: unicodeChar, replacePrev } = bijoyCharToUnicode(char, prevChar);
      if (unicodeChar === char && !replacePrev) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      el.focus();

      const replaceStart = replacePrev ? Math.max(0, start - 1) : start;
      const end = el.selectionEnd ?? start;
      const newValue = el.value.slice(0, replaceStart) + unicodeChar + el.value.slice(end);
      const newCursor = replaceStart + unicodeChar.length;

      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor?.set) { descriptor.set.call(el, newValue); } else { el.value = newValue; }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      requestAnimationFrame(() => el.setSelectionRange(newCursor, newCursor));
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [bijoyMode]);

  // Track active input for symbols and Arabic keyboard insertion (keyboard is only opened manually via [AR] toolbar button)
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setActiveInputRef(target as HTMLInputElement | HTMLTextAreaElement);
      }
    };
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  // While Arabic keyboard is open on small touchscreens (mobile), prevent the OS keyboard
  // from covering our virtual keyboard using inputmode="none", without locking readOnly on desktop.
  useEffect(() => {
    const isTouchMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const nodes = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-arabic="true"]')
    );
    if (showArabicKeyboard && isTouchMobile) {
      nodes.forEach(el => {
        el.setAttribute('inputmode', 'none');
      });
    } else {
      nodes.forEach(el => {
        el.removeAttribute('inputmode');
        if (el.readOnly && el.dataset.prevReadonly !== '1') {
          el.readOnly = false;
        }
      });
    }
    return () => {
      nodes.forEach(el => {
        el.removeAttribute('inputmode');
      });
    };
  }, [showArabicKeyboard]);

  const [newPaper, setNewPaper] = useState({
    title: '', title_bn: '', subject_type: 'bangla',
    total_marks: 100, duration_minutes: 120,
    instructions: '', instructions_bn: '',
    exam_session_id: '', class_id: '', division_id: '', subject_id: '',
  });
  // Raw text shown in the marks/duration inputs so users can type Bengali/Arabic/English digits
  const [marksInput, setMarksInput] = useState('100');
  const [durationInput, setDurationInput] = useState('120');

  const [questions, setQuestions] = useState<Question[]>([]);

  // ─── Data Queries ───
  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam-sessions-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_sessions')
        .select('id, name, name_bn, academic_session_id, exam_type, is_active')
        .eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('id, name, name_bn, sort_order').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-list', newPaper.division_id],
    queryFn: async () => {
      let q = supabase.from('classes').select('id, name, name_bn, division_id, sort_order').eq('is_active', true);
      if (newPaper.division_id) q = q.eq('division_id', newPaper.division_id);
      const { data, error } = await q.order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-list', newPaper.class_id],
    queryFn: async () => {
      let q = supabase.from('subjects').select('id, name, name_bn, class_id').eq('is_active', true);
      if (newPaper.class_id) q = q.eq('class_id', newPaper.class_id);
      const { data, error } = await q.order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ['question-papers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('question_papers')
        .select('*, exam_sessions(id, name, name_bn), subjects(id, name, name_bn)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: paperQuestions = [] } = useQuery({
    queryKey: ['questions', selectedPaper?.id],
    queryFn: async () => {
      if (!selectedPaper?.id) return [];
      const { data, error } = await supabase.from('questions').select('*').eq('paper_id', selectedPaper.id).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPaper?.id,
  });

  // Load configs from paper
  useEffect(() => {
    if (selectedPaper) {
      if (selectedPaper.font_config) {
        try { setFontConfig(typeof selectedPaper.font_config === 'string' ? JSON.parse(selectedPaper.font_config) : selectedPaper.font_config); } catch { }
      }
      if (selectedPaper.header_config) {
        try { setHeaderConfig(typeof selectedPaper.header_config === 'string' ? JSON.parse(selectedPaper.header_config) : selectedPaper.header_config); } catch { }
      }
      if (selectedPaper.layout_settings) {
        try {
          const ls = typeof selectedPaper.layout_settings === 'string' ? JSON.parse(selectedPaper.layout_settings) : selectedPaper.layout_settings;
          setLayoutSettings({ ...DEFAULT_LAYOUT, ...ls });
        } catch { }
      } else {
        setLayoutSettings(DEFAULT_LAYOUT);
      }
    }
  }, [selectedPaper?.id]);

  useEffect(() => {
    if (selectedPaper && paperQuestions) {
      let breakIdx = -1;
      if (selectedPaper.layout_settings) {
        try {
          const ls = typeof selectedPaper.layout_settings === 'string' ? JSON.parse(selectedPaper.layout_settings) : selectedPaper.layout_settings;
          if (typeof ls.columnBreakIndex === 'number') breakIdx = ls.columnBreakIndex;
        } catch { }
      } else if (typeof layoutSettings.columnBreakIndex === 'number') {
        breakIdx = layoutSettings.columnBreakIndex;
      }

      setQuestions(paperQuestions.map((q: any, i: number) => ({
        id: q.id, question_text: q.question_text || '', question_text_bn: q.question_text_bn || '',
        question_type: q.question_type || 'descriptive', marks: q.marks ?? 0, sort_order: q.sort_order || 0,
        group_label: q.group_label || '', group_label_bn: q.group_label_bn || '',
        group_marks: q.group_marks ?? null,
        options: q.options, answer: q.answer || '',
        custom_label: q.custom_label || '',
        column_break: breakIdx === i,
      })));
    }
  }, [selectedPaper?.id, selectedPaper?.layout_settings, paperQuestions]);

  // ─── Mutations ───
  const createPaper = useMutation({
    mutationFn: async () => {
      const selectedSubject = subjects.find((s: any) => s.id === newPaper.subject_id);
      const selectedSession = examSessions.find((s: any) => s.id === newPaper.exam_session_id);

      const resolvedTitleBn = newPaper.title_bn.trim() || selectedSubject?.name_bn || selectedSession?.name_bn || 'প্রশ্নপত্র';
      const resolvedTitle = newPaper.title.trim() || selectedSubject?.name || selectedSession?.name || 'Question Paper';

      const { error } = await supabase.from('question_papers').insert({
        title: resolvedTitle,
        title_bn: resolvedTitleBn,
        subject_type: newPaper.subject_type,
        total_marks: newPaper.total_marks,
        duration_minutes: newPaper.duration_minutes,
        instructions: newPaper.instructions,
        instructions_bn: newPaper.instructions_bn,
        exam_session_id: newPaper.exam_session_id || null,
        class_id: newPaper.class_id || null,
        division_id: newPaper.division_id || null,
        subject_id: newPaper.subject_id || null,
        status: 'pending',
        created_by: user?.id || null,
        font_config: fontConfig as any,
        header_config: headerConfig as any,
        layout_settings: layoutSettings as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-papers'] });
      setShowCreateDialog(false);
      setNewPaper({ title: '', title_bn: '', subject_type: 'bangla', total_marks: 100, duration_minutes: 120, instructions: '', instructions_bn: '', exam_session_id: '', class_id: '', division_id: '', subject_id: '' });
      setMarksInput('100'); setDurationInput('120');
      toast.success(language === 'bn' ? 'প্রশ্নপত্র তৈরি হয়েছে (অপেক্ষমান)' : 'Paper created (Pending)');
    },
    onError: () => toast.error(language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error'),
  });

  const deletePaper = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('question_papers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-papers'] });
      setDeleteTarget(null);
      if (selectedPaper) setSelectedPaper(null);
      toast.success(language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  const saveQuestions = useMutation({
    mutationFn: async () => {
      if (!selectedPaper?.id) return;
      const breakIdx = questions.findIndex(q => q.column_break);
      const updatedLayout: LayoutSettings = {
        ...layoutSettings,
        columnBreakIndex: breakIdx !== -1 ? breakIdx : undefined,
      };
      await supabase.from('question_papers').update({
        font_config: fontConfig as any,
        header_config: headerConfig as any,
        layout_settings: updatedLayout as any,
      }).eq('id', selectedPaper.id);
      await supabase.from('questions').delete().eq('paper_id', selectedPaper.id);
      if (questions.length > 0) {
        const rows = questions.map((q, i) => ({
          paper_id: selectedPaper.id, question_text: q.question_text, question_text_bn: q.question_text_bn,
          question_type: q.question_type, marks: q.marks, sort_order: i,
          group_label: q.group_label, group_label_bn: q.group_label_bn, options: q.options, answer: q.answer,
          custom_label: q.custom_label || null,
        }));
        const { error } = await supabase.from('questions').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', selectedPaper?.id] });
      queryClient.invalidateQueries({ queryKey: ['question-papers'] });
      toast.success(language === 'bn' ? 'সংরক্ষিত হয়েছে' : 'Saved');
    },
    onError: () => toast.error(language === 'bn' ? 'ত্রুটি' : 'Error'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const update: Record<string, any> = { status };
      if (status === 'approved') { update.approved_by = user?.id; update.approved_at = new Date().toISOString(); }
      if (note) update.rejection_note = note;
      const { error } = await supabase.from('question_papers').update(update as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-papers'] });
      toast.success(language === 'bn' ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
      setShowRejectDialog(false);
      setRejectionNote('');
    },
  });

  // ─── Question Helpers ───
  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      question_text: '', question_text_bn: '', question_type: 'descriptive',
      marks: 0, sort_order: prev.length, group_label: '', group_label_bn: '',
      group_marks: null, options: null, answer: '', custom_label: '',
    }]);
  };

  const [scanning, setScanning] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleImportQuestions = (imported: ImportedQuestion[]) => {
    setQuestions(prev => {
      const startOrder = prev.length;
      const newQs = imported.map((imp, i) => ({
        question_text: imp.question_text || '',
        question_text_bn: imp.question_text_bn || '',
        question_type: imp.question_type || (imp.options && imp.options.length > 0 ? 'mcq' : 'descriptive'),
        marks: imp.marks || (imp.question_type === 'mcq' ? 1 : 5),
        sort_order: startOrder + i,
        group_label: '',
        group_label_bn: '',
        group_marks: null,
        custom_label: imp.custom_label || '',
        options: Array.isArray(imp.options) && imp.options.length > 0
          ? imp.options.map((o, oi) => ({
              text: o.text || '',
              text_bn: o.text_bn || '',
              label: o.label || (language === 'bn' ? (BENGALI_MCQ_LABELS[oi] || `(${oi + 1})`) : `${String.fromCharCode(65 + oi)}.`),
              is_correct: !!o.is_correct,
            }))
          : null,
        answer: imp.answer || '',
      }));
      return [...prev, ...newQs];
    });
  };

  const handleScanImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'bn' ? 'শুধুমাত্র ছবি ফাইল গ্রহণযোগ্য' : 'Only image files accepted');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error(language === 'bn' ? 'ফাইল সাইজ ১৫MB এর বেশি হতে পারবে না' : 'File must be under 15MB');
      return;
    }

    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-questions', {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const scannedQuestions = data?.questions || [];
      if (scannedQuestions.length === 0) {
        toast.warning(language === 'bn' ? 'কোনো প্রশ্ন শনাক্ত হয়নি' : 'No questions detected');
        return;
      }

      setQuestions(prev => {
        const startOrder = prev.length;
        const newQs = scannedQuestions.map((sq: any, i: number) => ({
          question_text: '',
          question_text_bn: sq.question_text || sq.text || '',
          question_type: (sq.question_type || (sq.options && sq.options.length > 0 ? 'mcq' : 'descriptive')) as any,
          marks: sq.marks || (sq.question_type === 'mcq' ? 1 : 5),
          sort_order: startOrder + i,
          group_label: '',
          group_label_bn: '',
          group_marks: null,
          custom_label: sq.custom_label || '',
          options: Array.isArray(sq.options) && sq.options.length > 0
            ? sq.options.map((o: any, oi: number) => ({
                text: o.text || '',
                text_bn: o.text_bn || o.text || '',
                label: o.label || (language === 'bn' ? (BENGALI_MCQ_LABELS[oi] || `(${oi + 1})`) : `${String.fromCharCode(65 + oi)}.`),
                is_correct: !!o.is_correct,
              }))
            : null,
          answer: sq.answer || '',
        }));
        return [...prev, ...newQs];
      });

      toast.success(
        language === 'bn'
          ? `${scannedQuestions.length}টি প্রশ্ন স্ক্যান করে যোগ করা হয়েছে`
          : `${scannedQuestions.length} questions imported from scan`
      );
    } catch (err: any) {
      console.error('Scan error:', err);
      toast.error(err.message || (language === 'bn' ? 'স্ক্যান ব্যর্থ হয়েছে। টেক্সট পেস্ট অপশনটি ব্যবহার করুন।' : 'Scan failed. Try pasting text.'));
      // Open import dialog so user isn't stuck
      setShowImportDialog(true);
    } finally {
      setScanning(false);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== index) return q;
      const updated = { ...q, [field]: value };
      if (field === 'question_type' && value === 'mcq' && (!updated.options || updated.options.length === 0)) {
        updated.options = [
          { text: '', text_bn: '', label: language === 'bn' ? '(ক)' : 'A.', is_correct: false },
          { text: '', text_bn: '', label: language === 'bn' ? '(খ)' : 'B.', is_correct: false },
          { text: '', text_bn: '', label: language === 'bn' ? '(গ)' : 'C.', is_correct: false },
          { text: '', text_bn: '', label: language === 'bn' ? '(ঘ)' : 'D.', is_correct: false },
        ];
      }
      return updated;
    }));
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const addMcqOption = (qIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const opts = Array.isArray(q.options) ? [...q.options] : [];
      const defaultLabel = language === 'bn' ? (BENGALI_MCQ_LABELS[opts.length] || `(${opts.length + 1})`) : `${String.fromCharCode(65 + opts.length)}.`;
      opts.push({ text: '', text_bn: '', label: defaultLabel, is_correct: false });
      return { ...q, options: opts };
    }));
  };

  const updateMcqOption = (qIndex: number, optIndex: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const opts = Array.isArray(q.options) ? [...q.options] : [];
      opts[optIndex] = { ...opts[optIndex], [field]: value };
      if (field === 'is_correct' && value) opts.forEach((o, oi) => { if (oi !== optIndex) o.is_correct = false; });
      return { ...q, options: opts };
    }));
  };

  const removeMcqOption = (qIndex: number, optIndex: number) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      return { ...q, options: (q.options || []).filter((_: any, oi: number) => oi !== optIndex) };
    }));
  };

  // Arabic keyboard handler
  const handleArabicKey = useCallback((char: string) => {
    // If activeInputRef is not set or disconnected, fallback to focused element or the first Arabic textarea
    let el = activeInputRef;
    if (!el || !document.body.contains(el)) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        el = active as HTMLInputElement | HTMLTextAreaElement;
      } else {
        el = document.querySelector<HTMLTextAreaElement>('textarea[data-arabic="true"]') ||
             document.querySelector<HTMLInputElement>('input[data-arabic="true"]');
      }
    }
    if (!el) return;

    setActiveInputRef(el);
    el.focus();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;

    if (char === 'BACKSPACE') {
      if (start > 0 || start !== end) {
        // If text is selected (start !== end), remove the selected range; otherwise remove 1 char before cursor
        const deleteFrom = start === end ? Math.max(0, start - 1) : start;
        const newVal = el.value.slice(0, deleteFrom) + el.value.slice(end);
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) {
          setter.call(el, newVal);
        } else {
          el.value = newVal;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(deleteFrom, deleteFrom);
        });
      }
    } else {
      const newVal = el.value.slice(0, start) + char + el.value.slice(end);
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(el, newVal);
      } else {
        el.value = newVal;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      const newPos = start + char.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(newPos, newPos);
      });
    }
  }, [activeInputRef]);

  // Physical keyboard → Arabic mapping when AR keyboard is open
  useEffect(() => {
    if (!showArabicKeyboard) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isEditable) return;
      // Skip numeric inputs (marks field etc.)
      if (target.tagName === 'INPUT') {
        const inputEl = target as HTMLInputElement;
        if (inputEl.inputMode === 'numeric' || inputEl.dataset.noBijoy === 'true') return;
      }
      const code = e.code;
      if (!code) return;
      const arabicChar = e.shiftKey ? PHYSICAL_CODE_TO_ARABIC_SHIFTED[code] : PHYSICAL_CODE_TO_ARABIC[code];
      if (!arabicChar) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setHighlightedArabicKey(arabicChar);
      setTimeout(() => setHighlightedArabicKey(null), 200);
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const el = target as HTMLInputElement | HTMLTextAreaElement;
        setActiveInputRef(el);
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? start;
        const newVal = el.value.slice(0, start) + arabicChar + el.value.slice(end);
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        setter?.call(el, newVal);
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        const newPos = start + arabicChar.length;
        requestAnimationFrame(() => el.setSelectionRange(newPos, newPos));
      } else if (target.isContentEditable) {
        document.execCommand('insertText', false, arabicChar);
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [showArabicKeyboard]);

  // Print function
  const printPaper = () => {
    if (!selectedPaper) return;
    const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
    const sessionName = selectedPaper.exam_sessions ? (language === 'bn' ? selectedPaper.exam_sessions.name_bn : selectedPaper.exam_sessions.name) : '';
    const subjectName = selectedPaper.subjects ? (language === 'bn' ? selectedPaper.subjects.name_bn : selectedPaper.subjects.name) : '';
    const ls = layoutSettings;
    const isLandscape = ls.orientation === 'landscape';
    const pageSize = isLandscape ? 'A4 landscape' : 'A4';

    const effectiveBengaliFont = fontConfig.bengali === 'SutonnyMJ'
      ? '"Noto Sans Bengali", "SutonnyOMJ", sans-serif'
      : fontConfig.bengali;

    // Header HTML based on style
    const buildHeaderHtml = (isSecondary = false) => {
      const title = language === 'bn' ? selectedPaper.title_bn : selectedPaper.title;
      const { examLabel, subjectLabel } = formatHeaderExamAndSubject(sessionName, title, subjectName, language);
      const bnMarks = language === 'bn' ? toBengaliNum(totalMarks) : totalMarks;
      const formattedDur = formatDuration(selectedPaper.duration_minutes || 0, language);
      const instName = headerConfig.showInstitutionName && institution ? (language === 'bn' ? institution.name : institution.name_en || institution.name) : '';
      const address = institution?.address || '';
      const logo = headerConfig.showLogo && institution?.logo_url ? `<img src="${institution.logo_url}" style="height:24px;max-width:26px;object-fit:contain;margin-right:6px;vertical-align:middle;display:inline-block" />` : '';

      const subLine = [examLabel, subjectLabel ? '📖 ' + subjectLabel : ''].filter(Boolean).join(' &nbsp;•&nbsp; ');

      if (ls.headerStyle === 'ultra_compact') {
        return `<div style="text-align:center;margin-bottom:4px;padding-bottom:2px;border-bottom:1.2px solid #000;line-height:1.15">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;font-size:10.5px">
            <div style="display:flex;align-items:center">
              ${logo}
              ${instName ? `<strong style="font-size:12px">${instName}</strong>` : ''}
              ${address ? `<span style="font-size:8.5px;color:#555;margin-left:4px">(${address})</span>` : ''}
            </div>
            <div style="font-size:10.5px;font-weight:600">${subLine}</div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9.5px;font-weight:600;margin-top:2px;padding:0 2px">
            <span>${language === 'bn' ? 'পূর্ণমান' : 'Marks'}: ${bnMarks}</span>
            ${isSecondary ? '<span style="font-size:8.5px;color:#555">(২য় অংশ)</span>' : ''}
            <span>${language === 'bn' ? 'সময়' : 'Time'}: ${formattedDur}</span>
          </div>
        </div>`;
      }

      if (ls.headerStyle === 'classic') {
        return `<div style="text-align:center;margin-bottom:5px;line-height:1.2">
          <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:2px">
            ${logo}
            <div>
              ${instName ? `<h2 style="font-size:13.5px;font-weight:700;margin:0;line-height:1.1">${instName}</h2>` : ''}
              ${address ? `<p style="font-size:8.5px;color:#555;margin:1px 0 0;line-height:1">${address}</p>` : ''}
            </div>
          </div>
          <div style="border-top:1px solid #000;border-bottom:1px solid #000;padding:2px 0;margin:2px 0">
            ${examLabel ? `<div style="font-size:11px;font-weight:700">${examLabel}</div>` : ''}
            ${subjectLabel ? `<div style="font-size:10px;font-weight:600;margin-top:1px">📖 ${language === 'bn' ? 'বিষয়: ' : 'Subject: '}${subjectLabel}</div>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;padding:0 2px">
            <span>${language === 'bn' ? 'পূর্ণমান' : 'Marks'}: ${bnMarks}</span>
            ${isSecondary ? '<span style="font-size:8.5px;color:#555">(২য় অংশ)</span>' : ''}
            <span>${language === 'bn' ? 'সময়' : 'Time'}: ${formattedDur}</span>
          </div>
        </div>`;
      }

      if (ls.headerStyle === 'decorative') {
        return `<div style="text-align:center;margin-bottom:5px;border:1px solid #000;border-radius:4px;padding:3px 5px;line-height:1.2">
          <div style="display:flex;align-items:center;justify-content:center;gap:6px">
            ${logo}
            <div>
              ${instName ? `<h2 style="font-size:13.5px;font-weight:700;margin:0;line-height:1.1">${instName}</h2>` : ''}
              ${address ? `<p style="font-size:8.5px;color:#555;margin:1px 0 0;line-height:1">${address}</p>` : ''}
            </div>
          </div>
          <div style="border-top:1px dashed #777;margin:2px 0"></div>
          <div style="margin:2px 0">
            ${examLabel ? `<div style="font-size:11px;font-weight:700">${examLabel}</div>` : ''}
            ${subjectLabel ? `<div style="font-size:10px;font-weight:600;margin-top:1px">📖 ${language === 'bn' ? 'বিষয়: ' : 'Subject: '}${subjectLabel}</div>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:9.5px;font-weight:600;padding:0 2px">
            <span>${language === 'bn' ? 'পূর্ণমান' : 'Marks'}: ${bnMarks}</span>
            ${isSecondary ? '<span style="font-size:8.5px;color:#555">(২য় অংশ)</span>' : ''}
            <span>${language === 'bn' ? 'সময়' : 'Time'}: ${formattedDur}</span>
          </div>
        </div>`;
      }

      // Compact & Simple (Both slim and space-saving)
      return `<div style="text-align:center;margin-bottom:5px;padding-bottom:2px;border-bottom:1.5px solid #000;line-height:1.2">
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:1px">
          ${logo}
          <div>
            ${instName ? `<h2 style="font-size:14px;font-weight:700;margin:0;line-height:1.15">${instName}</h2>` : ''}
            ${address ? `<p style="font-size:8.5px;color:#555;margin:1px 0 0;line-height:1">${address}</p>` : ''}
          </div>
        </div>
        ${examLabel ? `<div style="font-size:11.5px;font-weight:700;margin:1px 0">${examLabel}</div>` : ''}
        ${subjectLabel ? `<div style="font-size:10.5px;font-weight:600;margin:1px 0">📖 ${language === 'bn' ? 'বিষয়: ' : 'Subject: '}${subjectLabel}</div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;margin-top:2px;padding:0 2px">
          <span>${language === 'bn' ? 'পূর্ণমান' : 'Full Marks'}: ${bnMarks}</span>
          ${isSecondary ? '<span style="font-size:8.5px;color:#555">(২য় অংশ / পাতা)</span>' : ''}
          <span>${language === 'bn' ? 'সময়' : 'Time'}: ${formattedDur}</span>
        </div>
      </div>`;
    };

    const renderQuestionItem = (q: Question, i: number) => {
      let groupHtml = '';
      const gl = language === 'bn' ? q.group_label_bn : q.group_label;
      if (gl) { groupHtml = '<div class="group-label">' + gl + '</div>'; }
      const qText = language === 'bn' ? q.question_text_bn || q.question_text : q.question_text;
      const isArabic = /[\u0600-\u06FF]/.test(qText);
      const dir = isArabic ? 'rtl' : 'ltr';
      const ff = isArabic ? fontConfig.arabic : effectiveBengaliFont;
      const serial = language === 'bn' ? toBengaliNum(i + 1) : String(i + 1);
      const labelText = (q.custom_label && q.custom_label.trim()) ? q.custom_label.trim() : `${serial}।`;
      const opts = Array.isArray(q.options) ? '<div class="options">' + q.options.map((o: any, oi: number) => {
        const prefix = getOptionPrefix(o, oi, language === 'bn' || !!o.text_bn);
        const text = language === 'bn' ? o.text_bn || o.text : o.text || o.text_bn;
        return '<span class="option"><strong>' + prefix + '</strong> ' + text + '</span>';
      }).join('') + '</div>' : '';
      return groupHtml + `<div class="question" style="font-family:'${ff}';direction:${dir}"><div class="q-header"><span><strong>${labelText}</strong> ${qText}</span><span>[${language === 'bn' ? toBengaliNum(q.marks) : q.marks}]</span></div>${opts}</div>`;
    };

    const getSplitIndex = () => {
      const breakIndex = questions.findIndex(q => q.column_break);
      if (breakIndex !== -1) return breakIndex === 0 ? 1 : breakIndex;
      if (ls.columnFlow === 'balanced' && questions.length > 2) {
        return Math.ceil(questions.length / 2);
      }
      // Fill Column 1 (Part 1) fully before jumping to Part 2!
      const col1Capacity = ls.orientation === 'landscape' ? 8 : 12;
      if (questions.length <= col1Capacity) {
        return questions.length; // All questions stay in Part 1!
      }
      return col1Capacity;
    };

    const instructionsHtml = (selectedPaper.instructions_bn || selectedPaper.instructions)
      ? '<div style="background:#f7f7f7;padding:5px 8px;border-radius:4px;margin-bottom:8px;font-size:11px;font-style:italic">' + (language === 'bn' ? selectedPaper.instructions_bn : selectedPaper.instructions) + '</div>'
      : '';

    let contentHtml = '';
    if (ls.columns === 2) {
      const splitAt = getSplitIndex();
      const col1Questions = questions.slice(0, splitAt);
      const col2Questions = questions.slice(splitAt);
      const col1ItemsHtml = col1Questions.map((q, i) => renderQuestionItem(q, i)).join('');
      const col2ItemsHtml = col2Questions.map((q, i) => renderQuestionItem(q, splitAt + i)).join('');

      if (ls.headerPlacement === 'dual') {
        // MS Word Booklet Style: Header on both parts!
        const col1Full = buildHeaderHtml(false) + instructionsHtml + col1ItemsHtml;
        const col2Full = buildHeaderHtml(true) + col2ItemsHtml;
        contentHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
          <div style="border-right:1px solid #777;padding-right:12px">${col1Full}</div>
          <div style="padding-left:4px">${col2Full}</div>
        </div>`;
      } else {
        // Single Full-Width Header
        contentHtml = buildHeaderHtml(false) + instructionsHtml + `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
          <div style="border-right:1px solid #777;padding-right:12px">${col1ItemsHtml}</div>
          <div style="padding-left:4px">${col2ItemsHtml}</div>
        </div>`;
      }
    } else {
      // 1 Column
      contentHtml = buildHeaderHtml(false) + instructionsHtml + questions.map((q, i) => renderQuestionItem(q, i)).join('');
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      @page { margin: 0; size: ${pageSize}; }
      * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: ${effectiveBengaliFont}, 'Noto Sans Bengali', sans-serif; font-size: ${fontConfig.fontSize}px; line-height: ${ls.lineSpacing};
        padding: ${ls.marginTop}mm ${ls.marginRight}mm ${ls.marginBottom}mm ${ls.marginLeft}mm;
        position: relative; }
      ${ls.watermark && institution?.logo_url ? `body::before { content: ''; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 50%; height: auto; background: url(${institution.logo_url}) no-repeat center; background-size: contain; opacity: 0.05; z-index: 0; pointer-events: none; }` : ''}
      .content { position: relative; z-index: 1; }
      .question { margin-bottom: 8px; page-break-inside: avoid; }
      .q-header { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 2px; }
      .options { margin-left: 20px; margin-top: 3px; display: flex; flex-wrap: wrap; column-gap: 20px; row-gap: 3px; font-size: 12px; }
      .options .option { display: inline-flex; align-items: baseline; gap: 4px; white-space: nowrap; }
      .group-label { font-weight: 700; font-size: 13px; margin: 8px 0 4px; padding: 2px 6px; background: #eee; }
    </style></head><body>
    <div class="content">
      ${contentHtml}
    </div>
    <script>window.onload=function(){window.print()}<\/script></body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Filter papers
  let filteredPapers = papers;
  if (filterType !== 'all') filteredPapers = filteredPapers.filter((p: any) => p.subject_id === filterType || p.subject_type === filterType);
  if (filterSession !== 'all') filteredPapers = filteredPapers.filter((p: any) => p.exam_session_id === filterSession);
  if (filterStatus !== 'all') filteredPapers = filteredPapers.filter((p: any) => (p.status || 'pending') === filterStatus);

  // ═══════════════════════════════════════
  // PAPER LIST VIEW
  // ═══════════════════════════════════════
  if (!selectedPaper) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-xl font-bold font-display">
            {language === 'bn' ? '📝 প্রশ্নপত্র বিল্ডার' : '📝 Question Paper Builder'}
          </h1>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{language === 'bn' ? v.labelBn : v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger className="w-40"><SelectValue placeholder={language === 'bn' ? 'সেশন' : 'Session'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল সেশন' : 'All Sessions'}</SelectItem>
                {examSessions.map((s: any) => (<SelectItem key={s.id} value={s.id}>{language === 'bn' ? s.name_bn : s.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="btn-primary-gradient"><Plus className="h-4 w-4 mr-1" />{language === 'bn' ? 'নতুন প্রশ্নপত্র' : 'New Paper'}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{language === 'bn' ? 'নতুন প্রশ্নপত্র তৈরি' : 'Create Question Paper'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{language === 'bn' ? 'পরীক্ষা সেশন' : 'Exam Session'} <span className="text-destructive">*</span></Label>
                    <Select value={newPaper.exam_session_id} onValueChange={v => setNewPaper(p => ({ ...p, exam_session_id: v }))}>
                      <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'সেশন নির্বাচন' : 'Select session'} /></SelectTrigger>
                      <SelectContent>{examSessions.map((s: any) => (<SelectItem key={s.id} value={s.id}>{language === 'bn' ? s.name_bn : s.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{language === 'bn' ? 'বিভাগ' : 'Division'}</Label>
                      <Select value={newPaper.division_id} onValueChange={v => setNewPaper(p => ({ ...p, division_id: v, class_id: '', subject_id: '' }))}>
                        <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                        <SelectContent>{divisions.map((d: any) => (<SelectItem key={d.id} value={d.id}>{language === 'bn' ? d.name_bn : d.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{language === 'bn' ? 'শ্রেণী' : 'Class'}</Label>
                      <Select value={newPaper.class_id} onValueChange={v => setNewPaper(p => ({ ...p, class_id: v, subject_id: '' }))} disabled={!newPaper.division_id}>
                        <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                        <SelectContent>{classes.filter((c: any) => !newPaper.division_id || c.division_id === newPaper.division_id).map((c: any) => (<SelectItem key={c.id} value={c.id}>{language === 'bn' ? c.name_bn : c.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>{language === 'bn' ? 'বিষয়' : 'Subject'}</Label>
                    <Select
                      value={newPaper.subject_id}
                      onValueChange={v => {
                        const sObj = subjects.find((s: any) => s.id === v);
                        setNewPaper(p => ({
                          ...p,
                          subject_id: v,
                          title_bn: p.title_bn.trim() ? p.title_bn : (sObj?.name_bn || ''),
                          title: p.title.trim() ? p.title : (sObj?.name || ''),
                        }));
                      }}
                      disabled={!newPaper.class_id}
                    >
                      <SelectTrigger><SelectValue placeholder={language === 'bn' ? 'বিষয় নির্বাচন' : 'Select subject'} /></SelectTrigger>
                      <SelectContent>{subjects.filter((s: any) => !newPaper.class_id || s.class_id === newPaper.class_id).map((s: any) => (<SelectItem key={s.id} value={s.id}>{language === 'bn' ? s.name_bn : s.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>

                  {/* Title Fields (Optional) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{language === 'bn' ? 'শিরোনাম / পত্র (বাংলা) — ঐচ্ছিক' : 'Title / Paper (BN) — Optional'}</Label>
                      <Input
                        value={newPaper.title_bn}
                        onChange={e => setNewPaper(p => ({ ...p, title_bn: e.target.value }))}
                        placeholder={language === 'bn' ? 'যেমন: ১ম পত্র, মডেল টেস্ট (খালি রাখলে বিষয়ের নাম)' : 'e.g. Paper 1 (defaults to subject)'}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{language === 'bn' ? 'শিরোনাম (ইংরেজি) — ঐচ্ছিক' : 'Title (English) — Optional'}</Label>
                      <Input
                        value={newPaper.title}
                        onChange={e => setNewPaper(p => ({ ...p, title: e.target.value }))}
                        placeholder={language === 'bn' ? 'ঐচ্ছিক' : 'Optional'}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Marks & Duration with Hour Conversion */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{language === 'bn' ? 'পূর্ণমান' : 'Total Marks'}</Label>
                      <Input type="text" inputMode="numeric" dir="auto" value={marksInput} onChange={e => { const v = e.target.value; setMarksInput(v); setNewPaper(p => ({ ...p, total_marks: parseMultilingualNum(v) })); }} data-arabic="true" className="text-xs" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{language === 'bn' ? 'সময় (ঘণ্টা / মিনিট)' : 'Duration'}</Label>
                        <span className="text-[11px] font-bold text-primary">
                          ⏱️ {formatDuration(newPaper.duration_minutes, language)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          dir="auto"
                          value={durationInput}
                          onChange={e => {
                            const v = e.target.value;
                            setDurationInput(v);
                            setNewPaper(p => ({ ...p, duration_minutes: parseMultilingualNum(v) }));
                          }}
                          placeholder="120"
                          data-arabic="true"
                          className="text-xs"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">{language === 'bn' ? 'মিনিট' : 'min'}</span>
                      </div>
                      {/* Quick Hour Preset Buttons */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[
                          { labelBn: '১ ঘণ্টা', mins: 60 },
                          { labelBn: '১.৫ ঘণ্টা', mins: 90 },
                          { labelBn: '২ ঘণ্টা', mins: 120 },
                          { labelBn: '২.৫ ঘণ্টা', mins: 150 },
                          { labelBn: '৩ ঘণ্টা', mins: 180 },
                        ].map(preset => (
                          <button
                            key={preset.mins}
                            type="button"
                            onClick={() => {
                              setDurationInput(String(preset.mins));
                              setNewPaper(p => ({ ...p, duration_minutes: preset.mins }));
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                              newPaper.duration_minutes === preset.mins
                                ? 'bg-primary text-primary-foreground border-primary font-bold'
                                : 'bg-secondary/70 hover:bg-primary/20 text-foreground border-border/50'
                            }`}
                          >
                            {language === 'bn' ? preset.labelBn : `${preset.mins}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div><Label className="text-xs">{language === 'bn' ? 'নির্দেশনা (বাংলা)' : 'Instructions (BN)'}</Label><Textarea value={newPaper.instructions_bn} onChange={e => setNewPaper(p => ({ ...p, instructions_bn: e.target.value }))} rows={2} className="text-xs" /></div>
                  <div><Label className="text-xs">{language === 'bn' ? 'নির্দেশনা (ইংরেজি)' : 'Instructions (EN)'}</Label><Textarea value={newPaper.instructions} onChange={e => setNewPaper(p => ({ ...p, instructions: e.target.value }))} rows={2} className="text-xs" /></div>
                  <Button
                    onClick={() => createPaper.mutate()}
                    disabled={!newPaper.exam_session_id || createPaper.isPending}
                    className="w-full btn-primary-gradient mt-1"
                  >
                    {createPaper.isPending
                      ? (language === 'bn' ? 'তৈরি হচ্ছে...' : 'Creating...')
                      : (language === 'bn' ? 'তৈরি করুন (অপেক্ষমান হিসেবে)' : 'Create (as Pending)')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}</div>
        ) : filteredPapers.length === 0 ? (
          <Card className="card-elevated"><CardContent className="py-12 text-center text-muted-foreground">
            {language === 'bn' ? 'কোনো প্রশ্নপত্র নেই' : 'No question papers'}
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPapers.map((paper: any) => {
              const subjectName = paper.subjects ? (language === 'bn' ? paper.subjects.name_bn : paper.subjects.name) : null;
              const sessionName = paper.exam_sessions ? (language === 'bn' ? paper.exam_sessions.name_bn : paper.exam_sessions.name) : null;
              const status = paper.status || 'pending';
              return (
                <Card key={paper.id} className="card-elevated cursor-pointer hover:shadow-lg transition-all group" onClick={() => setSelectedPaper(paper)}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={status} language={language} />
                        </div>
                        {sessionName && <p className="text-xs text-muted-foreground mb-0.5">📋 {sessionName}</p>}
                        <CardTitle className="text-base leading-tight truncate">{language === 'bn' ? paper.title_bn : paper.title}</CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); setDeleteTarget(paper.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-1.5 flex-wrap">
                      {subjectName && <Badge variant="secondary" className="text-xs">📖 {subjectName}</Badge>}
                      <Badge variant="outline" className="text-xs">{language === 'bn' ? toBengaliNum(paper.total_marks) : paper.total_marks} {language === 'bn' ? 'নম্বর' : 'marks'}</Badge>
                      <Badge variant="outline" className="text-xs">⏱️ {formatDuration(paper.duration_minutes, language)}</Badge>
                    </div>
                    {status === 'rejected' && paper.rejection_note && (
                      <p className="text-xs text-destructive mt-2 line-clamp-2">⚠️ {paper.rejection_note}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deletePaper.mutate(deleteTarget)}
          title={language === 'bn' ? 'প্রশ্নপত্র মুছবেন?' : 'Delete paper?'} description={language === 'bn' ? 'সকল প্রশ্নও মুছে যাবে।' : 'All questions will be deleted.'} />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // SPLIT-VIEW EDITOR
  // ═══════════════════════════════════════
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  const status = selectedPaper.status || 'pending';

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedPaper(null); setQuestions([]); setShowArabicKeyboard(false); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-display truncate">{language === 'bn' ? selectedPaper.title_bn : selectedPaper.title}</h1>
              <StatusBadge status={status} language={language} />
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'মোট' : 'Total'}: {language === 'bn' ? toBengaliNum(totalMarks) : totalMarks}/{language === 'bn' ? toBengaliNum(selectedPaper.total_marks) : selectedPaper.total_marks}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button variant={showArabicKeyboard ? 'default' : 'outline'} size="sm" onClick={() => setShowArabicKeyboard(!showArabicKeyboard)}>
            <Keyboard className="h-4 w-4 mr-1" />AR
          </Button>
          <Button
            variant={bijoyMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const next = !bijoyMode;
              setBijoyMode(next);
              if (next) {
                toast.success(language === 'bn' ? 'বিজয় কিবোর্ড মোড চালু হয়েছে (SutonnyMJ লেআউট)' : 'Bijoy mode enabled');
              } else {
                toast.info(language === 'bn' ? 'বিজয় কিবোর্ড বন্ধ করা হয়েছে' : 'Bijoy mode disabled');
              }
            }}
            className={bijoyMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm' : ''}
            title={language === 'bn' ? 'বিজয় ৫২ / SutonnyMJ টাইপিং অন/অফ করুন' : 'Toggle Bijoy layout'}
          >
            <Keyboard className="h-4 w-4 mr-1" />
            {bijoyMode ? (language === 'bn' ? 'বিজয়: ON' : 'Bijoy: ON') : (language === 'bn' ? 'বিজয়' : 'Bijoy')}
          </Button>
          <Button variant={showSymbols ? 'default' : 'outline'} size="sm" onClick={() => setShowSymbols(!showSymbols)}>
            <Hash className="h-4 w-4 mr-1" />{language === 'bn' ? 'সিম্বল' : 'Symbols'}
          </Button>
          <Button variant={showFontPanel ? 'default' : 'outline'} size="sm" onClick={() => setShowFontPanel(!showFontPanel)}>
            <Type className="h-4 w-4 mr-1" />{language === 'bn' ? 'ফন্ট' : 'Font'}
          </Button>
          <Button variant={showLayoutPanel ? 'default' : 'outline'} size="sm" onClick={() => setShowLayoutPanel(!showLayoutPanel)}>
            <Settings2 className="h-4 w-4 mr-1" />{language === 'bn' ? 'লেআউট' : 'Layout'}
          </Button>
          {status === 'pending' && (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus.mutate({ id: selectedPaper.id, status: 'approved' })}>
                <Check className="h-4 w-4 mr-1" />{language === 'bn' ? 'অনুমোদন' : 'Approve'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)}>
                <X className="h-4 w-4 mr-1" />{language === 'bn' ? 'প্রত্যাখ্যান' : 'Reject'}
              </Button>
            </>
          )}
          {status === 'rejected' && (
            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: selectedPaper.id, status: 'pending' })}>
              {language === 'bn' ? 'পুনরায় জমা' : 'Resubmit'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={printPaper}><Printer className="h-4 w-4 mr-1" />{language === 'bn' ? 'প্রিন্ট' : 'Print'}</Button>
          <Button size="sm" onClick={() => saveQuestions.mutate()} disabled={saveQuestions.isPending} className="btn-primary-gradient">
            {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Rejection note */}
      {status === 'rejected' && selectedPaper.rejection_note && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span><strong>{language === 'bn' ? 'প্রত্যাখ্যানের কারণ:' : 'Rejection note:'}</strong> {selectedPaper.rejection_note}</span>
        </div>
      )}

      {/* Quick Symbols Bar */}
      {showSymbols && <QuickSymbolsBar onInsert={() => {}} activeInputRef={activeInputRef} />}

      {/* Layout Settings Panel */}
      {showLayoutPanel && (
        <LayoutSettingsPanel
          layout={layoutSettings}
          setLayout={setLayoutSettings}
          headerConfig={headerConfig}
          setHeaderConfig={setHeaderConfig}
          language={language}
        />
      )}

      {/* Font Panel */}
      {showFontPanel && (
        <Card className="card-elevated">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">{language === 'bn' ? 'আরবি ফন্ট' : 'Arabic Font'}</Label>
                <Select value={fontConfig.arabic} onValueChange={v => setFontConfig(p => ({ ...p, arabic: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_PRESETS.arabic.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{language === 'bn' ? 'বাংলা ফন্ট' : 'Bengali Font'}</Label>
                <Select value={fontConfig.bengali} onValueChange={v => setFontConfig(p => ({ ...p, bengali: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_PRESETS.bengali.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{language === 'bn' ? 'ইংরেজি ফন্ট' : 'English Font'}</Label>
                <Select value={fontConfig.english} onValueChange={v => setFontConfig(p => ({ ...p, english: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_PRESETS.english.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{language === 'bn' ? 'ফন্ট সাইজ' : 'Font Size'}: {fontConfig.fontSize}px</Label>
                <Slider value={[fontConfig.fontSize]} onValueChange={([v]) => setFontConfig(p => ({ ...p, fontSize: v }))} min={10} max={22} step={1} className="mt-2" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 pt-2 border-t border-border/50">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={headerConfig.showLogo} onCheckedChange={v => setHeaderConfig(p => ({ ...p, showLogo: v }))} />
                {language === 'bn' ? 'লোগো' : 'Logo'}
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={headerConfig.showInstitutionName} onCheckedChange={v => setHeaderConfig(p => ({ ...p, showInstitutionName: v }))} />
                {language === 'bn' ? 'প্রতিষ্ঠানের নাম' : 'Institution Name'}
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={headerConfig.centered} onCheckedChange={v => setHeaderConfig(p => ({ ...p, centered: v }))} />
                {language === 'bn' ? 'সেন্টার্ড' : 'Centered'}
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split View: Editor (left) + Preview (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Question Editor */}
        <div className="space-y-3 lg:max-h-[75vh] lg:overflow-y-auto lg:pr-1">
          {questions.map((q, qi) => (
            <div key={qi} className="relative group rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              {/* Serial Badge + Delete */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1 gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                    {language === 'bn' ? toBengaliNum(qi + 1) : qi + 1}
                  </span>
                  <Input
                    value={q.custom_label || ''}
                    onChange={e => updateQuestion(qi, 'custom_label', e.target.value)}
                    onFocus={e => setActiveInputRef(e.target)}
                    data-arabic="true"
                    dir="auto"
                    placeholder={language === 'bn' ? `প্রশ্ন #${toBengaliNum(qi + 1)}` : `Question #${qi + 1}`}
                    className="h-7 text-[11px] font-medium bg-transparent border-dashed border-border/40 hover:border-border focus:bg-background rounded-lg px-2 flex-1 min-w-0"
                    title={language === 'bn' ? 'নিজের পছন্দমতো লিখুন (যেমন: (ক), ১., ক.)' : 'Custom label (Arabic/Bangla/English)'}
                  />
                  <div className="hidden sm:flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, 'custom_label', BENGALI_MCQ_LABELS[qi] || `(${qi + 1})`)}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-primary font-semibold transition-colors"
                      title="বাংলা বন্ধনী: (ক), (খ), ..."
                    >
                      (ক)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, 'custom_label', `${toBengaliNum(qi + 1)}.`)}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-primary font-semibold transition-colors"
                      title="বাংলা ক্রম: ১., ২., ..."
                    >
                      ১.
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, 'custom_label', ROMAN_MCQ_LABELS[qi] || `(${qi + 1})`)}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 text-muted-foreground hover:text-primary font-semibold transition-colors"
                      title="রোমান ক্রম: (i), (ii), ..."
                    >
                      (i)
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {layoutSettings.columns === 2 && (
                    <Button
                      type="button"
                      variant={q.column_break ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateQuestion(qi, 'column_break', !q.column_break)}
                      className={`h-7 text-[10px] px-2 rounded-lg font-medium transition-colors ${
                        q.column_break
                          ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold border-amber-600 shadow-sm'
                          : 'text-muted-foreground border-border/50 hover:bg-primary/10 hover:text-primary'
                      }`}
                      title={language === 'bn' ? 'এই প্রশ্ন থেকে ২য় পার্ট (ডান কলাম) শুরু হবে' : 'Start Column 2 from here'}
                    >
                      <Columns className="h-3 w-3 mr-1" />
                      {q.column_break
                        ? (language === 'bn' ? '✂️ ২য় পার্ট ব্রেক' : 'Col 2 Break')
                        : (language === 'bn' ? '২য় পার্টে নিন' : 'Start Col 2')}
                    </Button>
                  )}
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    title={language === 'bn' ? 'মুছুন' : 'Delete'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {q.column_break && (
                <div className="mx-4 mt-1 mb-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold flex items-center justify-between">
                  <span>✂️ এই প্রশ্ন থেকে ২য় পার্ট (ডান পাশ) শুরু হবে</span>
                  <button
                    type="button"
                    onClick={() => updateQuestion(qi, 'column_break', false)}
                    className="hover:underline text-[10px] font-normal"
                  >
                    {language === 'bn' ? 'ব্রেক বাতিল' : 'Cancel break'}
                  </button>
                </div>
              )}

              <div className="px-4 pb-3 space-y-2.5">
                {/* Two-Column Question Textareas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    {/* Quick Harakat Strip for Arabic */}
                    {(showArabicKeyboard || /[\u0600-\u06FF]/.test(q.question_text_bn)) && (
                      <div className="flex items-center gap-1 mb-1.5 px-2 py-1 bg-primary/5 rounded-lg border border-primary/20 overflow-x-auto shadow-xs" dir="rtl">
                        <span className="text-[10px] font-semibold text-primary pl-1 shrink-0" dir="ltr">হরকত:</span>
                        {ARABIC_TASHKEEL.slice(0, 9).map((t, ti) => (
                          <button
                            key={ti}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              const target = document.getElementById(`q-bn-textarea-${qi}`) as HTMLTextAreaElement | null;
                              const el = target || activeInputRef;
                              if (el) {
                                el.focus();
                                const start = el.selectionStart ?? el.value.length;
                                const end = el.selectionEnd ?? start;
                                const newVal = el.value.slice(0, start) + t.char + el.value.slice(end);
                                updateQuestion(qi, 'question_text_bn', newVal);
                                requestAnimationFrame(() => el.setSelectionRange(start + t.char.length, start + t.char.length));
                              }
                            }}
                            className="h-7 min-w-[1.8rem] px-1.5 rounded bg-background hover:bg-primary/20 text-primary hover:text-primary-foreground font-bold text-sm border border-border/50 shrink-0 transition-colors"
                            title={`${t.nameBn} (${t.shortcut})`}
                          >
                            {t.sample}
                          </button>
                        ))}
                      </div>
                    )}
                    <Textarea
                      id={`q-bn-textarea-${qi}`}
                      value={q.question_text_bn}
                      onChange={e => updateQuestion(qi, 'question_text_bn', e.target.value)}
                      onFocus={e => setActiveInputRef(e.target)}
                      rows={3}
                      className="text-base sm:text-base pt-7 pb-2.5 px-3 min-h-[96px] bg-background/90 border-border/60 focus:bg-background focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl resize-y leading-relaxed transition-all shadow-xs"
                      dir="auto"
                      data-arabic="true"
                      placeholder={language === 'bn' ? 'বাংলা বা আরবি প্রশ্ন এখানে লিখুন...' : 'Write Bengali or Arabic question here...'}
                      style={bijoyMode ? { fontFamily: 'SutonnyMJ, SutonnyOMJ, "Noto Sans Bengali", sans-serif' } : undefined}
                    />
                    <span className="absolute top-2 left-3 text-[10px] font-semibold uppercase tracking-wider text-primary/80 pointer-events-none bg-background/80 px-1 rounded">
                      {language === 'bn' ? layoutSettings.questionLabelBn : layoutSettings.questionLabelEn}
                    </span>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={q.question_text}
                      onChange={e => updateQuestion(qi, 'question_text', e.target.value)}
                      onFocus={e => setActiveInputRef(e.target)}
                      rows={3}
                      className="text-sm sm:text-base pt-7 pb-2.5 px-3 min-h-[96px] bg-background/90 border-border/60 focus:bg-background focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl resize-y leading-relaxed transition-all shadow-xs"
                      placeholder={language === 'bn' ? 'ইংরেজি প্রশ্ন লিখুন (যদি থাকে)...' : 'English question (optional)...'}
                    />
                    <span className="absolute top-2 left-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 pointer-events-none bg-background/80 px-1 rounded">
                      {language === 'bn' ? 'প্রশ্ন (ইংরেজি)' : 'Question (EN)'}
                    </span>
                  </div>
                </div>

                {/* Compact Settings Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 bg-muted/20 rounded-xl p-2 border border-border/30">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{language === 'bn' ? 'ধরন' : 'Type'}</span>
                    <Select value={q.question_type} onValueChange={v => updateQuestion(qi, 'question_type', v)}>
                      <SelectTrigger className="h-7 text-[11px] bg-background/80 border-border/40 rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>{QUESTION_TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{language === 'bn' ? t.labelBn : t.labelEn}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{language === 'bn' ? 'প্রশ্ন নম্বর' : 'Marks'}</span>
                    <Input type="text" inputMode="numeric" value={q.marks || ''} placeholder="৫" onChange={e => {
                      const val = e.target.value.replace(/[^\d০-৯]/g, '');
                      if (val === '') { updateQuestion(qi, 'marks', 0); return; }
                      const num = parseInt(val.replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))) || 0;
                      updateQuestion(qi, 'marks', num);
                    }} onFocus={e => setActiveInputRef(e.target)} className="h-7 text-[11px] bg-background/80 border-border/40 rounded-lg text-center" dir="auto" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{language === 'bn' ? 'গ্রুপ (বাং)' : 'Group BN'}</span>
                    <Input value={q.group_label_bn} onChange={e => updateQuestion(qi, 'group_label_bn', e.target.value)} className="h-7 text-[11px] bg-background/80 border-border/40 rounded-lg" placeholder="ক বিভাগ" onFocus={e => setActiveInputRef(e.target)} data-arabic="true" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{language === 'bn' ? 'গ্রুপ (ইং)' : 'Group EN'}</span>
                    <Input value={q.group_label} onChange={e => updateQuestion(qi, 'group_label', e.target.value)} className="h-7 text-[11px] bg-background/80 border-border/40 rounded-lg" placeholder="Section A" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">{language === 'bn' ? 'গ্রুপ নম্বর' : 'Grp Marks'}</span>
                    <Input type="text" inputMode="numeric" value={q.group_marks ?? ''} onChange={e => {
                      const val = e.target.value.replace(/[^\d০-৯]/g, '');
                      if (val === '') { updateQuestion(qi, 'group_marks', null); return; }
                      const num = parseInt(val.replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))) || 0;
                      updateQuestion(qi, 'group_marks', num);
                    }} onFocus={e => setActiveInputRef(e.target)} className="h-7 text-[11px] bg-background/80 border-border/40 rounded-lg text-center" placeholder="২০" />
                  </div>
                </div>

                {/* MCQ Options */}
                {q.question_type === 'mcq' && (
                  <div className="space-y-1.5 pl-3 pt-1 border-l-2 border-primary/20">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{language === 'bn' ? 'অপশনসমূহ' : 'Options'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">{language === 'bn' ? 'ক্রম শৈলী:' : 'Prefix:'}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = Array.isArray(q.options) ? [...q.options] : [];
                            const newOpts = opts.map((o: any, oi: number) => ({ ...o, label: BENGALI_MCQ_LABELS[oi] || `(${oi + 1})` }));
                            updateQuestion(qi, 'options', newOpts);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 font-bold transition-colors"
                          title="বাংলা বন্ধনী: (ক), (খ), (গ), (ঘ)"
                        >
                          (ক)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = Array.isArray(q.options) ? [...q.options] : [];
                            const newOpts = opts.map((o: any, oi: number) => ({ ...o, label: BENGALI_MCQ_DOT_LABELS[oi] || `${oi + 1}.` }));
                            updateQuestion(qi, 'options', newOpts);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 font-bold transition-colors"
                          title="বাংলা ডট: ক., খ., গ., ঘ."
                        >
                          ক.
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = Array.isArray(q.options) ? [...q.options] : [];
                            const newOpts = opts.map((o: any, oi: number) => ({ ...o, label: ROMAN_MCQ_LABELS[oi] || `(${oi + 1})` }));
                            updateQuestion(qi, 'options', newOpts);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 font-bold transition-colors text-primary"
                          title="রোমান বন্ধনী: (i), (ii), (iii), (iv)"
                        >
                          (i)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = Array.isArray(q.options) ? [...q.options] : [];
                            const newOpts = opts.map((o: any, oi: number) => ({ ...o, label: ROMAN_MCQ_DOT_LABELS[oi] || `${oi + 1}.` }));
                            updateQuestion(qi, 'options', newOpts);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 font-bold transition-colors text-primary"
                          title="রোমান ডট: i., ii., iii., iv."
                        >
                          i.
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = Array.isArray(q.options) ? [...q.options] : [];
                            const newOpts = opts.map((o: any, oi: number) => ({ ...o, label: ENGLISH_MCQ_LABELS[oi] || `(${oi + 1})` }));
                            updateQuestion(qi, 'options', newOpts);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 font-bold transition-colors"
                          title="English Brackets: (A), (B), (C), (D)"
                        >
                          (A)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = Array.isArray(q.options) ? [...q.options] : [];
                            const newOpts = opts.map((o: any, oi: number) => ({ ...o, label: `${String.fromCharCode(65 + oi)}.` }));
                            updateQuestion(qi, 'options', newOpts);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 font-bold transition-colors"
                          title="English Dot: A., B., C., D."
                        >
                          A.
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const opts = Array.isArray(q.options) ? [...q.options] : [];
                            const newOpts = opts.map((o: any, oi: number) => ({ ...o, label: ROMAN_UPPER_MCQ_LABELS[oi] || `(${oi + 1})` }));
                            updateQuestion(qi, 'options', newOpts);
                          }}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 hover:bg-primary/20 font-bold transition-colors"
                          title="রোমান ক্যাপিটাল: (I), (II), (III), (IV)"
                        >
                          (I)
                        </button>
                      </div>
                    </div>
                    {Array.isArray(q.options) && q.options.map((opt: any, oi: number) => {
                      const defaultPrefix = language === 'bn' ? (BENGALI_MCQ_LABELS[oi] || `(${oi + 1})`) : `${String.fromCharCode(65 + oi)}.`;
                      return (
                        <div key={oi} className="flex flex-wrap sm:flex-nowrap gap-1.5 items-center">
                          <Input
                            className="w-14 h-8 text-xs font-bold text-center px-1 bg-background/80 border-border/40 rounded-lg text-primary shrink-0"
                            placeholder={defaultPrefix}
                            value={opt.label || ''}
                            onChange={e => updateMcqOption(qi, oi, 'label', e.target.value)}
                            onFocus={e => setActiveInputRef(e.target)}
                            title={language === 'bn' ? 'অপশন ক্রম (ক্লিক করে যেকোনো অক্ষর দিন: (ক), ক., A.)' : 'Option label'}
                          />
                          <Input
                            className="flex-1 min-w-[120px] h-8 text-sm rounded-lg bg-background/90 border-border/50 px-2.5"
                            placeholder={language === 'bn' ? 'বাংলা/আরবি অপশন লিখুন...' : 'Bengali/Arabic text'}
                            value={opt.text_bn || ''}
                            onChange={e => updateMcqOption(qi, oi, 'text_bn', e.target.value)}
                            onFocus={e => setActiveInputRef(e.target)}
                            data-arabic="true"
                            dir="auto"
                            style={bijoyMode ? { fontFamily: 'SutonnyMJ, SutonnyOMJ, "Noto Sans Bengali", sans-serif' } : undefined}
                          />
                          <Input
                            className="flex-1 min-w-[120px] h-8 text-sm rounded-lg bg-background/90 border-border/50 px-2.5"
                            placeholder="English option (optional)"
                            value={opt.text || ''}
                            onChange={e => updateMcqOption(qi, oi, 'text', e.target.value)}
                            onFocus={e => setActiveInputRef(e.target)}
                          />
                          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0 px-2 py-1 rounded-md bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors">
                            <input
                              type="radio"
                              name={`correct-${qi}`}
                              checked={opt.is_correct}
                              onChange={() => updateMcqOption(qi, oi, 'is_correct', true)}
                              className="accent-primary h-3.5 w-3.5"
                            />
                            <span className="text-[11px] font-medium">{language === 'bn' ? 'সঠিক' : 'Correct'}</span>
                          </label>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => removeMcqOption(qi, oi)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => addMcqOption(qi)}>
                      <Plus className="h-3 w-3 mr-1" />{language === 'bn' ? 'অপশন যোগ' : 'Option'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={addQuestion} className="flex-1 min-w-[140px] h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />{language === 'bn' ? 'প্রশ্ন যোগ করুন' : 'Add Question'}
            </Button>
            <Button
              onClick={() => setShowAIGenerator(true)}
              className="flex-1 min-w-[140px] h-10 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-95 shadow-md shadow-primary/20 font-semibold"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {language === 'bn' ? 'AI দিয়ে তৈরি' : 'AI Generate'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 min-w-[140px] h-10 rounded-xl border-dashed border-2 bg-background hover:bg-primary/5 border-primary/40 text-primary font-semibold transition-all"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {language === 'bn' ? 'ফাইল / স্ক্যান / টেক্সট ইম্পোর্ট' : 'Import / Scan File'}
            </Button>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="hidden lg:block sticky top-0">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">
              {language === 'bn' ? 'লাইভ প্রিভিউ' : 'Live Preview'}
              {layoutSettings.orientation === 'landscape' ? ' (Landscape)' : ' (A4)'}
              {layoutSettings.columns === 2 ? ' • 2 Col' : ''}
            </span>
          </div>
          <LivePreview paper={selectedPaper} questions={questions} fontConfig={fontConfig} headerConfig={headerConfig} institution={institution} language={language} layout={layoutSettings} />
        </div>
      </div>

      {/* Arabic Keyboard */}
      {showArabicKeyboard && (
        <ArabicKeyboard onKeyPress={handleArabicKey} onClose={() => setShowArabicKeyboard(false)} highlightedKey={highlightedArabicKey} />
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{language === 'bn' ? 'প্রত্যাখ্যানের কারণ' : 'Rejection Reason'}</DialogTitle></DialogHeader>
          <Textarea value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} placeholder={language === 'bn' ? 'কারণ লিখুন...' : 'Enter reason...'} rows={3} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={() => updateStatus.mutate({ id: selectedPaper.id, status: 'rejected', note: rejectionNote })} disabled={!rejectionNote.trim()}>
              {language === 'bn' ? 'প্রত্যাখ্যান করুন' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Question Generator Dialog */}
      <AIQuestionGeneratorDialog
        open={showAIGenerator}
        onOpenChange={setShowAIGenerator}
        language={language}
        subjectName={(() => {
          const s = subjects.find((x: any) => x.id === newPaper.subject_id);
          return s ? (language === 'bn' ? s.name_bn : (s.name || s.name_bn)) : undefined;
        })()}
        classLevel={(() => {
          const c = classes.find((x: any) => x.id === newPaper.class_id);
          return c ? (language === 'bn' ? c.name_bn : (c.name || c.name_bn)) : undefined;
        })()}
        onImport={(generated) => {
          setQuestions(prev => {
            const startOrder = prev.length;
            const newQs = generated.map((g, i) => ({
              question_text: '',
              question_text_bn: g.text || '',
              question_type: (g.question_type === 'mcq' ? 'mcq' : 'descriptive') as 'mcq' | 'descriptive',
              marks: g.marks || 0,
              sort_order: startOrder + i,
              group_label: '',
              group_label_bn: '',
              group_marks: null,
              options: g.options && g.options.length > 0
                ? g.options.map((o, oi) => ({
                    text: '',
                    text_bn: o.text,
                    label: language === 'bn' ? (BENGALI_MCQ_LABELS[oi] || `(${oi + 1})`) : `${String.fromCharCode(65 + oi)}.`,
                    is_correct: !!o.is_correct
                  }))
                : null,
              answer: g.answer || '',
            }));
            return [...prev, ...newQs];
          });
        }}
      />

      {/* Question Import Dialog (Image Scan OCR, Text File, or Direct Paste) */}
      <QuestionImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        language={language}
        onImport={handleImportQuestions}
      />
    </div>
  );
};

export default AdminQuestionPapers;
