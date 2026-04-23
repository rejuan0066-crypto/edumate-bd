import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Sparkles, Send, Loader2, Target, Layers, CreditCard, Table, BarChart3,
  Type, Image as ImageIcon, Square, Bookmark, History as HistoryIcon, User, Wand2,
  Plus, ArrowUp,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { DesignScope } from './aiCanvasActions';
import AiCommandHistory, { type AiCommandEntry } from './AiCommandHistory';
import type { PromptHint } from './promptHints';

export interface AiChatMessage {
  role: 'user' | 'assistant';
  text: string;
  status?: 'pending' | 'done' | 'error' | 'pending-review';
  versionIndex?: number;
}

interface Props {
  messages: AiChatMessage[];
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  hasSelection: boolean;
  selectionLabel?: string;
  selectionTypeLabel?: string | null;
  hints?: PromptHint[];
  scope: DesignScope;
  onScopeChange: (s: DesignScope) => void;
  pendingReview: boolean;
  onApply: () => void;
  onRevert: () => void;
  onOpenTemplates: () => void;
  onOpenHistory: () => void;
  commandHistory: AiCommandEntry[];
  commandCursor: number;
  onUndoCommand: () => void;
  onRedoCommand: () => void;
  onReplayCommand: (entry: AiCommandEntry) => void;
}

const SCOPES: { id: DesignScope; label: string; icon: any }[] = [
  { id: 'any', label: 'Any', icon: Target },
  { id: 'section', label: 'Section', icon: Layers },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'table', label: 'Table', icon: Table },
  { id: 'chart', label: 'Chart', icon: BarChart3 },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'shape', label: 'Shape', icon: Square },
];

const STARTER_PROMPTS = [
  { label: '📊 ড্যাশবোর্ড সেকশন', prompt: 'একটা সুন্দর ড্যাশবোর্ড সেকশন তৈরি করো' },
  { label: '📝 সাইনআপ ফর্ম', prompt: 'একটা মডার্ন সাইনআপ ফর্ম যোগ করো' },
  { label: '📋 ৫ কলাম টেবিল', prompt: 'একটা ৫ কলাম টেবিল বানাও' },
  { label: '🎨 হিরো সেকশন', prompt: 'একটা হিরো সেকশন বানাও' },
];

const DesignAiChatBar = ({
  messages, onSubmit, isLoading, disabled,
  hasSelection, selectionLabel, selectionTypeLabel, hints,
  scope, onScopeChange,
  pendingReview, onApply, onRevert,
  onOpenTemplates, onOpenHistory,
  commandHistory, commandCursor,
  onUndoCommand, onRedoCommand, onReplayCommand,
}: Props) => {
  const [input, setInput] = useState('');
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isLoading]);

  // Auto-grow textarea
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

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

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-[#0d0d0f] text-white/90">
      {/* Pending review banner */}
      {pendingReview && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            পরিবর্তনগুলি প্রিভিউতে — সংরক্ষণ করার আগে দেখুন।
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRevert}
              className="text-[11px] px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
            >
              বাতিল
            </button>
            <button
              onClick={onApply}
              className="text-[11px] px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium"
            >
              প্রয়োগ
            </button>
          </div>
        </div>
      )}

      {/* Conversation area — ChatGPT style */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {isEmpty ? (
          /* Welcome screen — like ChatGPT empty state */
          <div className="h-full flex flex-col items-center justify-center px-6 py-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-4">
              <Sparkles className="w-7 h-7 text-white" strokeWidth={2.2} />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">আপনাকে কিভাবে সাহায্য করতে পারি?</h3>
            <p className="text-xs text-white/50 text-center mb-6 max-w-xs">
              ডিজাইন তৈরি করুন, সম্পাদনা করুন বা পরিবর্তন করুন — সবকিছু কথায় বলুন।
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => onSubmit(p.prompt)}
                  className="text-left text-xs p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 text-white/70 hover:text-white transition group"
                >
                  <div className="font-medium mb-0.5">{p.label}</div>
                  <div className="text-[10px] text-white/40 group-hover:text-white/60 line-clamp-1">
                    {p.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-5">
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} />
            ))}
            {isLoading && (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />
                </div>
                <div className="flex items-center gap-2 pt-1.5 text-white/60 text-xs">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>ভাবছে…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optional advanced tools — collapsible */}
      {showTools && (
        <div className="border-t border-white/5 bg-white/[0.02]">
          <AiCommandHistory
            history={commandHistory}
            cursor={commandCursor}
            onUndo={onUndoCommand}
            onRedo={onRedoCommand}
            onReplay={onReplayCommand}
          />
          <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none">
            <span className="text-[10px] uppercase tracking-wider text-white/40 mr-1 shrink-0">টার্গেট</span>
            {SCOPES.map((s) => {
              const Icon = s.icon;
              const active = scope === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => onScopeChange(s.id)}
                  className={cn(
                    'flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition shrink-0',
                    active
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10',
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection badge */}
      {hasSelection && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/5 border-t border-emerald-500/10">
          <span className="text-[10px] uppercase tracking-wide text-emerald-400/80">নির্বাচিত:</span>
          {selectionTypeLabel && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
              {selectionTypeLabel}
            </span>
          )}
          <span className="text-[10px] text-white/60 truncate">{selectionLabel}</span>
        </div>
      )}

      {/* Input bar — ChatGPT-style composer */}
      <div className="border-t border-white/5 p-3 bg-[#0d0d0f]">
        {/* Smart hints (quick chips above input when typing) */}
        {hints && hints.length > 0 && input.length === 0 && !isEmpty && (
          <div className="flex flex-wrap gap-1.5 mb-2 px-1">
            {hints.slice(0, 4).map((q) => (
              <button
                key={q.label}
                onClick={() => setInput(q.prompt)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 rounded-3xl bg-white/[0.04] border border-white/10 focus-within:border-white/25 focus-within:bg-white/[0.06] transition-colors p-2">
          {/* Tools button (left) */}
          <button
            onClick={() => setShowTools((v) => !v)}
            className={cn(
              'h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition',
              showTools
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/10 hover:text-white',
            )}
            title="টুলস ও টার্গেট"
            type="button"
          >
            <Plus className={cn('w-4 h-4 transition-transform', showTools && 'rotate-45')} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="AI কে বার্তা পাঠান…"
            disabled={disabled || isLoading}
            rows={1}
            className="flex-1 min-w-0 resize-none bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/35 py-2 px-1 leading-6 max-h-[200px]"
            style={{ height: '24px' }}
          />

          {/* History/templates inline */}
          <div className="hidden sm:flex items-center gap-0.5 shrink-0">
            <button
              onClick={onOpenTemplates}
              className="h-8 w-8 rounded-full text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              title="টেমপ্লেট"
              type="button"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenHistory}
              className="h-8 w-8 rounded-full text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              title="ভার্সন হিস্ট্রি"
              type="button"
            >
              <HistoryIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Send */}
          <button
            onClick={send}
            disabled={!input.trim() || isLoading || disabled}
            className={cn(
              'h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition shadow-md',
              input.trim() && !isLoading && !disabled
                ? 'bg-white text-black hover:bg-white/90 shadow-white/20'
                : 'bg-white/10 text-white/30 cursor-not-allowed',
            )}
            title="পাঠান"
            type="button"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
          </button>
        </div>

        <p className="text-[10px] text-white/30 text-center mt-2">
          AI ভুল করতে পারে। গুরুত্বপূর্ণ তথ্য যাচাই করুন।
        </p>
      </div>
    </div>
  );
};

/** Single message bubble — ChatGPT style with avatar + markdown */
const ChatMessage = ({ message }: { message: AiChatMessage }) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isPending = message.status === 'pending-review';

  return (
    <div className="flex gap-3 items-start animate-fade-in">
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-lg',
          isUser
            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/30'
            : 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30',
        )}
      >
        {isUser
          ? <User className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />
          : <Sparkles className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-white/90">
            {isUser ? 'আপনি' : 'AI সহকারী'}
          </span>
          {typeof message.versionIndex === 'number' && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
              v{message.versionIndex + 1}
            </span>
          )}
          {isPending && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/30">
              প্রিভিউ
            </span>
          )}
        </div>
        <div
          className={cn(
            'text-[13px] leading-relaxed break-words',
            isError ? 'text-red-300' : 'text-white/85',
          )}
        >
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-code:text-emerald-300 prose-code:before:content-none prose-code:after:content-none prose-a:text-emerald-300 prose-strong:text-white prose-li:my-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.text || '…'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignAiChatBar;
