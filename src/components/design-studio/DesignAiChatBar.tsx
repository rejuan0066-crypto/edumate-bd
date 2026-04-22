import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, X, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  text: string;
  status?: 'pending' | 'done' | 'error';
}

interface Props {
  messages: AiChatMessage[];
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  hasSelection: boolean;
  selectionLabel?: string;
}

const QUICK_PROMPTS = [
  'একটা সানসেট পাহাড়ের ছবি বানাও',
  'লাল গোল বৃত্ত যোগ করো',
  '"Welcome" লেখো বড় করে',
  'নির্বাচিত ছবির ব্যাকগ্রাউন্ড সরাও',
];

const DesignAiChatBar = ({
  messages,
  onSubmit,
  isLoading,
  disabled,
  hasSelection,
  selectionLabel,
}: Props) => {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isLoading]);

  const send = () => {
    const t = input.trim();
    if (!t || isLoading || disabled) return;
    onSubmit(t);
    setInput('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 bottom-4 -translate-x-1/2 z-30 w-[min(720px,calc(100%-2rem))]',
      )}
    >
      <div className="pointer-events-auto rounded-3xl bg-[#16161b]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Conversation history */}
        {open && messages.length > 0 && (
          <div
            ref={scrollRef}
            className="max-h-56 overflow-y-auto px-4 py-3 space-y-2 border-b border-white/5"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'text-xs leading-relaxed rounded-2xl px-3 py-2 max-w-[85%]',
                  m.role === 'user'
                    ? 'bg-primary/15 text-primary-foreground/90 ml-auto'
                    : 'bg-white/5 text-white/80',
                  m.status === 'error' && 'bg-red-500/15 text-red-200',
                )}
              >
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-white/60 px-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>AI ভাবছে…</span>
              </div>
            )}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 p-2.5">
          <button
            onClick={() => setOpen((o) => !o)}
            className="h-9 w-9 shrink-0 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition"
            title={open ? 'Hide history' : 'Show history'}
          >
            {open ? <X className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <div className="flex-1 min-w-0">
            {hasSelection && (
              <div className="flex items-center gap-1.5 mb-1 px-2">
                <span className="text-[10px] uppercase tracking-wide text-emerald-400/80">
                  Selected:
                </span>
                <span className="text-[10px] text-white/60 truncate">{selectionLabel}</span>
              </div>
            )}
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary pointer-events-none" />
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder='AI কে বলুন... যেমন: "একটা নীল আয়তক্ষেত্র যোগ করো" বা "সানসেট ছবি বানাও"'
                disabled={disabled || isLoading}
                rows={1}
                className="pl-9 pr-3 py-2.5 min-h-[40px] max-h-32 resize-none bg-white/5 border-white/10 text-sm text-white placeholder:text-white/40 focus-visible:ring-primary/40 rounded-2xl"
              />
            </div>
          </div>

          <Button
            onClick={send}
            disabled={!input.trim() || isLoading || disabled}
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Quick prompts */}
        {open && messages.length === 0 && (
          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignAiChatBar;
