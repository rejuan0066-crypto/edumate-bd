import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BookOpen,
  Search,
  Bookmark,
  BookmarkCheck,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings as SettingsIcon,
  ListOrdered,
  Loader2,
  History,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

// ========== Types ==========
interface Chapter {
  id: number;
  name_simple: string;
  name_arabic: string;
  translated_name: { name: string };
  verses_count: number;
  revelation_place: string;
  pages: [number, number];
}
interface Verse {
  id: number;
  verse_key: string; // "1:1"
  verse_number: number;
  text_uthmani: string;
  text_indopak?: string;
  juz_number: number;
  page_number: number;
  ruku_number?: number;
  audio?: { url: string };
  translations: { id: number; resource_id: number; text: string }[];
}

const QURAN_API = 'https://api.quran.com/api/v4';
const TRANSLATION_EN = 131; // Saheeh International
const TRANSLATION_BN = 161; // Bayaan Foundation
const RECITERS = [
  { id: 7, name_en: 'Mishary Rashid Alafasy', name_bn: 'মিশারি রশিদ আলাফাসি' },
  { id: 1, name_en: 'AbdulBaset (Mujawwad)', name_bn: 'আব্দুল বাসিত (মুজাওয়াদ)' },
  { id: 2, name_en: 'AbdulBaset (Murattal)', name_bn: 'আব্দুল বাসিত (মুরাত্তাল)' },
  { id: 3, name_en: 'Abdur-Rahman as-Sudais', name_bn: 'আব্দুর রহমান আস-সুদাইস' },
  { id: 4, name_en: 'Abu Bakr al-Shatri', name_bn: 'আবু বকর আশ-শাতরি' },
  { id: 5, name_en: 'Hani ar-Rifai', name_bn: 'হানি আর-রিফাঈ' },
];

const LS_BOOKMARKS = 'quran:bookmarks';
const LS_LAST_READ = 'quran:lastRead';
const LS_SETTINGS = 'quran:settings';

interface Settings {
  script: 'uthmani' | 'indopak';
  showEn: boolean;
  showBn: boolean;
  arabicSize: number;
  reciterId: number;
}
const defaultSettings: Settings = {
  script: 'uthmani',
  showEn: true,
  showBn: true,
  arabicSize: 32,
  reciterId: 7,
};

// ========== Page ==========
const QuranPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}') };
    } catch {
      return defaultSettings;
    }
  });
  useEffect(() => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const [mode, setMode] = useState<'chapter' | 'page' | 'juz'>('chapter');
  const [activeId, setActiveId] = useState<number>(1);
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]');
    } catch {
      return [];
    }
  });
  const [scrollKey, setScrollKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gotoOpen, setGotoOpen] = useState(false);

  // Restore last read on mount
  useEffect(() => {
    document.title = bn ? 'কুরআন পাঠ' : 'Quran Reading';
    try {
      const last = JSON.parse(localStorage.getItem(LS_LAST_READ) || 'null') as
        | { mode: 'chapter' | 'page' | 'juz'; id: number; verseKey?: string }
        | null;
      if (last) {
        setMode(last.mode);
        setActiveId(last.id);
        if (last.verseKey) setScrollKey(last.verseKey);
      }
    } catch {/* ignore */}
  }, [bn]);

  // Persist last read
  useEffect(() => {
    localStorage.setItem(
      LS_LAST_READ,
      JSON.stringify({ mode, id: activeId, verseKey: scrollKey }),
    );
  }, [mode, activeId, scrollKey]);

  // Chapters list
  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ['quran-chapters'],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const res = await fetch(`${QURAN_API}/chapters?language=${bn ? 'bn' : 'en'}`);
      const json = await res.json();
      return json.chapters || [];
    },
  });

  // Verses
  const { data: verses = [], isLoading: versesLoading } = useQuery<Verse[]>({
    queryKey: ['quran-verses', mode, activeId, settings.reciterId],
    enabled: !!activeId,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const url = new URL(
        `${QURAN_API}/verses/by_${mode}/${activeId}`,
      );
      url.searchParams.set('language', bn ? 'bn' : 'en');
      url.searchParams.set('words', 'false');
      url.searchParams.set('translations', `${TRANSLATION_EN},${TRANSLATION_BN}`);
      url.searchParams.set(
        'fields',
        'text_uthmani,text_indopak,verse_key,verse_number,juz_number,page_number,ruku_number',
      );
      url.searchParams.set('audio', String(settings.reciterId));
      url.searchParams.set('per_page', '300');
      const res = await fetch(url.toString());
      const json = await res.json();
      return json.verses || [];
    },
  });

  // Full surah audio
  const { data: surahAudio } = useQuery<string | null>({
    queryKey: ['quran-surah-audio', activeId, settings.reciterId, mode],
    enabled: mode === 'chapter' && !!activeId,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      try {
        const res = await fetch(
          `${QURAN_API}/chapter_recitations/${settings.reciterId}/${activeId}`,
        );
        const json = await res.json();
        return json.audio_file?.audio_url || null;
      } catch {
        return null;
      }
    },
  });

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null); // verse key or 'surah'
  const [isPlaying, setIsPlaying] = useState(false);
  const [continuous, setContinuous] = useState(true);

  const playUrl = useCallback((url: string, key: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    a.src = url;
    a.play().then(() => {
      setPlayingKey(key);
      setIsPlaying(true);
    }).catch(() => toast.error(bn ? 'অডিও চালানো যায়নি' : 'Could not play audio'));
  }, [bn]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); setIsPlaying(false); }
    else { a.play(); setIsPlaying(true); }
  };

  const playVerse = (v: Verse) => {
    if (!v.audio?.url) return toast.error(bn ? 'এই আয়াতের অডিও পাওয়া যায়নি' : 'Audio not available');
    playUrl(`https://verses.quran.com/${v.audio.url}`, v.verse_key);
  };

  const playSurah = () => {
    if (!surahAudio) return toast.error(bn ? 'সম্পূর্ণ সূরার অডিও পাওয়া যায়নি' : 'Full surah audio not available');
    playUrl(surahAudio, 'surah');
  };

  // Continuous play next ayah
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => {
      setIsPlaying(false);
      if (!continuous || !playingKey || playingKey === 'surah') return;
      const idx = verses.findIndex((v) => v.verse_key === playingKey);
      if (idx >= 0 && idx < verses.length - 1) {
        const next = verses[idx + 1];
        if (next.audio?.url) {
          setScrollKey(next.verse_key);
          playUrl(`https://verses.quran.com/${next.audio.url}`, next.verse_key);
        }
      }
    };
    a.addEventListener('ended', onEnded);
    return () => a.removeEventListener('ended', onEnded);
  }, [continuous, playingKey, verses, playUrl]);

  // Cleanup
  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  // Bookmark toggle
  const toggleBookmark = (key: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem(LS_BOOKMARKS, JSON.stringify(next));
      toast.success(prev.includes(key) ? (bn ? 'বুকমার্ক সরানো হয়েছে' : 'Bookmark removed') : (bn ? 'বুকমার্ক যোগ হয়েছে' : 'Bookmarked'));
      return next;
    });
  };

  // Scroll to verse
  useEffect(() => {
    if (!scrollKey || versesLoading) return;
    const el = document.getElementById(`v-${scrollKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1800);
    }
  }, [scrollKey, versesLoading, verses]);

  // Filtered chapters for sidebar search
  const filteredChapters = useMemo(() => {
    if (!search.trim()) return chapters;
    const q = search.toLowerCase();
    return chapters.filter(
      (c) =>
        c.name_simple.toLowerCase().includes(q) ||
        c.translated_name?.name?.toLowerCase().includes(q) ||
        String(c.id).includes(q),
    );
  }, [chapters, search]);

  const currentChapter = chapters.find((c) => c.id === activeId);
  const headerTitle = useMemo(() => {
    if (mode === 'chapter') {
      if (!currentChapter) return '';
      return bn
        ? `${currentChapter.id}. ${currentChapter.translated_name?.name || currentChapter.name_simple}`
        : `${currentChapter.id}. ${currentChapter.name_simple}`;
    }
    if (mode === 'page') return bn ? `পৃষ্ঠা ${activeId}` : `Page ${activeId}`;
    return bn ? `পারা ${activeId}` : `Juz ${activeId}`;
  }, [mode, activeId, currentChapter, bn]);

  // Goto navigation
  const goto = (m: typeof mode, id: number, vk?: string) => {
    setMode(m);
    setActiveId(id);
    setScrollKey(vk || null);
    setGotoOpen(false);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-xl"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">{bn ? 'কুরআন পাঠ' : 'Quran Reading'}</h1>
              <p className="text-xs text-muted-foreground truncate">{headerTitle}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Dialog open={gotoOpen} onOpenChange={setGotoOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                  <ListOrdered className="w-4 h-4" />
                  <span className="hidden sm:inline">{bn ? 'যান' : 'Go to'}</span>
                </Button>
              </DialogTrigger>
              <GotoDialog
                bn={bn}
                chapters={chapters}
                onGo={goto}
                bookmarks={bookmarks}
              />
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SettingsSheet bn={bn} settings={settings} setSettings={setSettings} continuous={continuous} setContinuous={setContinuous} />
            </Sheet>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto flex">
        {/* ===== Sidebar (desktop) ===== */}
        <aside className="hidden lg:block w-80 shrink-0 border-r border-border/40 h-[calc(100vh-65px)] sticky top-[65px]">
          <SidebarContent
            bn={bn}
            search={search}
            setSearch={setSearch}
            chapters={filteredChapters}
            activeId={activeId}
            mode={mode}
            onSelect={(id) => goto('chapter', id)}
          />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[85vw] sm:w-96">
            <SidebarContent
              bn={bn}
              search={search}
              setSearch={setSearch}
              chapters={filteredChapters}
              activeId={activeId}
              mode={mode}
              onSelect={(id) => goto('chapter', id)}
            />
          </SheetContent>
        </Sheet>

        {/* ===== Main reading area ===== */}
        <main className="flex-1 min-w-0 px-4 py-6 pb-32">
          {versesLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {mode === 'chapter' && currentChapter && (
                <Card className="p-6 rounded-[32px] text-center bg-card/80 backdrop-blur-xl border border-border/60">
                  <p className="text-3xl font-bold mb-1" style={{ fontFamily: 'Amiri, "Scheherazade New", serif' }}>
                    {currentChapter.name_arabic}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentChapter.verses_count} {bn ? 'আয়াত' : 'verses'} • {currentChapter.revelation_place}
                  </p>
                  {surahAudio && (
                    <Button
                      onClick={playSurah}
                      variant="outline"
                      size="sm"
                      className="rounded-xl mt-3 gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {bn ? 'সম্পূর্ণ সূরা শুনুন' : 'Play full Surah'}
                    </Button>
                  )}
                </Card>
              )}

              {verses.map((v) => {
                const isBookmarked = bookmarks.includes(v.verse_key);
                const isCurrent = playingKey === v.verse_key;
                const arabicText = settings.script === 'indopak' && v.text_indopak ? v.text_indopak : v.text_uthmani;
                const tEn = v.translations.find((t) => t.resource_id === TRANSLATION_EN);
                const tBn = v.translations.find((t) => t.resource_id === TRANSLATION_BN);
                return (
                  <Card
                    key={v.id}
                    id={`v-${v.verse_key}`}
                    className={`p-6 rounded-[32px] transition-all bg-card/80 backdrop-blur-xl border ${
                      isCurrent ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="rounded-full">
                          {v.verse_key}
                        </Badge>
                        <Badge variant="outline" className="rounded-full text-xs">
                          {bn ? 'পারা' : 'Juz'} {v.juz_number}
                        </Badge>
                        <Badge variant="outline" className="rounded-full text-xs">
                          {bn ? 'পৃষ্ঠা' : 'Page'} {v.page_number}
                        </Badge>
                        {v.ruku_number != null && (
                          <Badge variant="outline" className="rounded-full text-xs">
                            {bn ? 'রুকু' : 'Ruku'} {v.ruku_number}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl h-8 w-8"
                          onClick={() => playVerse(v)}
                          title={bn ? 'আয়াত শুনুন' : 'Play verse'}
                        >
                          {isCurrent && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl h-8 w-8"
                          onClick={() => toggleBookmark(v.verse_key)}
                          title={bn ? 'বুকমার্ক' : 'Bookmark'}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="w-4 h-4 text-primary" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-right leading-[2.4] mb-5"
                      style={{
                        fontSize: `${settings.arabicSize}px`,
                        fontFamily:
                          settings.script === 'indopak'
                            ? '"Noto Nastaliq Urdu", "Scheherazade New", serif'
                            : '"Amiri Quran", "Scheherazade New", "Amiri", serif',
                      }}
                    >
                      {arabicText}
                    </p>

                    {settings.showEn && tEn && (
                      <div className="mb-3 pt-3 border-t border-border/40">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">English</p>
                        <p
                          className="text-sm leading-relaxed text-foreground/90"
                          dangerouslySetInnerHTML={{ __html: tEn.text }}
                        />
                      </div>
                    )}
                    {settings.showBn && tBn && (
                      <div className="pt-3 border-t border-border/40">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">বাংলা</p>
                        <p
                          className="text-sm leading-relaxed text-foreground/90"
                          dangerouslySetInnerHTML={{ __html: tBn.text }}
                        />
                      </div>
                    )}
                  </Card>
                );
              })}

              {!versesLoading && verses.length === 0 && (
                <Card className="p-10 text-center text-muted-foreground rounded-[32px]">
                  {bn ? 'কোন আয়াত পাওয়া যায়নি' : 'No verses found'}
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ===== Audio player bar ===== */}
      {playingKey && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {playingKey === 'surah'
                    ? (bn ? `সম্পূর্ণ সূরা — ${currentChapter?.name_simple || ''}` : `Full Surah — ${currentChapter?.name_simple || ''}`)
                    : `${bn ? 'আয়াত' : 'Verse'} ${playingKey}`}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {bn ? RECITERS.find((r) => r.id === settings.reciterId)?.name_bn : RECITERS.find((r) => r.id === settings.reciterId)?.name_en}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => {
                  if (playingKey === 'surah') return;
                  const idx = verses.findIndex((v) => v.verse_key === playingKey);
                  if (idx > 0) playVerse(verses[idx - 1]);
                }}
                disabled={playingKey === 'surah'}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="rounded-xl"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => {
                  if (playingKey === 'surah') return;
                  const idx = verses.findIndex((v) => v.verse_key === playingKey);
                  if (idx >= 0 && idx < verses.length - 1) playVerse(verses[idx + 1]);
                }}
                disabled={playingKey === 'surah'}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => {
                  audioRef.current?.pause();
                  setPlayingKey(null);
                  setIsPlaying(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== Sidebar Content ==========
const SidebarContent = ({
  bn,
  search,
  setSearch,
  chapters,
  activeId,
  mode,
  onSelect,
}: {
  bn: boolean;
  search: string;
  setSearch: (s: string) => void;
  chapters: Chapter[];
  activeId: number;
  mode: 'chapter' | 'page' | 'juz';
  onSelect: (id: number) => void;
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={bn ? 'সূরা খুঁজুন...' : 'Search Surah...'}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {chapters.map((c) => {
            const active = mode === 'chapter' && activeId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-all hover:bg-muted/60 mb-0.5 ${
                  active ? 'bg-primary/10 text-primary' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  {c.id}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {bn ? c.translated_name?.name || c.name_simple : c.name_simple}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.verses_count} {bn ? 'আয়াত' : 'verses'} • {c.revelation_place}
                  </p>
                </div>
                <span
                  className="text-base shrink-0"
                  style={{ fontFamily: 'Amiri, serif' }}
                  dir="rtl"
                >
                  {c.name_arabic}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

// ========== Goto Dialog ==========
const GotoDialog = ({
  bn,
  chapters,
  onGo,
  bookmarks,
}: {
  bn: boolean;
  chapters: Chapter[];
  onGo: (m: 'chapter' | 'page' | 'juz', id: number, vk?: string) => void;
  bookmarks: string[];
}) => {
  const [surah, setSurah] = useState('1');
  const [ayah, setAyah] = useState('1');
  const [page, setPage] = useState('1');
  const [juz, setJuz] = useState('1');

  const ch = chapters.find((c) => c.id === Number(surah));
  return (
    <DialogContent className="rounded-[28px] max-w-lg">
      <DialogHeader>
        <DialogTitle>{bn ? 'নেভিগেশন' : 'Go to'}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="surah">
        <TabsList className="grid grid-cols-4 rounded-xl">
          <TabsTrigger value="surah" className="rounded-lg">{bn ? 'সূরা' : 'Surah'}</TabsTrigger>
          <TabsTrigger value="page" className="rounded-lg">{bn ? 'পৃষ্ঠা' : 'Page'}</TabsTrigger>
          <TabsTrigger value="juz" className="rounded-lg">{bn ? 'পারা' : 'Juz'}</TabsTrigger>
          <TabsTrigger value="bm" className="rounded-lg">
            <Bookmark className="w-3.5 h-3.5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="surah" className="space-y-3 pt-4">
          <div>
            <Label className="text-xs">{bn ? 'সূরা' : 'Surah'}</Label>
            <Select value={surah} onValueChange={(v) => { setSurah(v); setAyah('1'); }}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.id}. {bn ? c.translated_name?.name || c.name_simple : c.name_simple}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{bn ? 'আয়াত' : 'Ayah'} (1–{ch?.verses_count || '?'})</Label>
            <Input
              type="number"
              min={1}
              max={ch?.verses_count}
              value={ayah}
              onChange={(e) => setAyah(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            className="w-full rounded-xl"
            onClick={() => onGo('chapter', Number(surah), `${surah}:${ayah || 1}`)}
          >
            {bn ? 'যান' : 'Go'}
          </Button>
        </TabsContent>

        <TabsContent value="page" className="space-y-3 pt-4">
          <Label className="text-xs">{bn ? 'পৃষ্ঠা (১–৬০৪)' : 'Page (1–604)'}</Label>
          <Input type="number" min={1} max={604} value={page} onChange={(e) => setPage(e.target.value)} className="rounded-xl" />
          <Button className="w-full rounded-xl" onClick={() => onGo('page', Math.min(604, Math.max(1, Number(page) || 1)))}>
            {bn ? 'যান' : 'Go'}
          </Button>
        </TabsContent>

        <TabsContent value="juz" className="space-y-3 pt-4">
          <Label className="text-xs">{bn ? 'পারা (১–৩০)' : 'Juz (1–30)'}</Label>
          <Input type="number" min={1} max={30} value={juz} onChange={(e) => setJuz(e.target.value)} className="rounded-xl" />
          <Button className="w-full rounded-xl" onClick={() => onGo('juz', Math.min(30, Math.max(1, Number(juz) || 1)))}>
            {bn ? 'যান' : 'Go'}
          </Button>
        </TabsContent>

        <TabsContent value="bm" className="pt-4">
          {bookmarks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {bn ? 'কোন বুকমার্ক নেই' : 'No bookmarks yet'}
            </p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1.5">
                {bookmarks.map((k) => (
                  <button
                    key={k}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted text-sm flex items-center justify-between"
                    onClick={() => {
                      const [s] = k.split(':');
                      onGo('chapter', Number(s), k);
                    }}
                  >
                    <span className="font-mono">{k}</span>
                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
};

// ========== Settings Sheet ==========
const SettingsSheet = ({
  bn,
  settings,
  setSettings,
  continuous,
  setContinuous,
}: {
  bn: boolean;
  settings: Settings;
  setSettings: (s: Settings) => void;
  continuous: boolean;
  setContinuous: (b: boolean) => void;
}) => {
  return (
    <SheetContent className="w-[90vw] sm:w-[400px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{bn ? 'পাঠ সেটিংস' : 'Reading Settings'}</SheetTitle>
      </SheetHeader>
      <div className="space-y-5 pt-6">
        <div>
          <Label className="text-xs mb-1.5 block">{bn ? 'আরবি ফন্ট' : 'Arabic Script'}</Label>
          <Select
            value={settings.script}
            onValueChange={(v: 'uthmani' | 'indopak') => setSettings({ ...settings, script: v })}
          >
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="uthmani">{bn ? 'উসমানী লিপি' : 'Uthmani'}</SelectItem>
              <SelectItem value="indopak">{bn ? 'ইন্দো-পাক লিপি' : 'Indo-Pak'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">
            {bn ? 'আরবি ফন্ট সাইজ' : 'Arabic font size'} — {settings.arabicSize}px
          </Label>
          <Slider
            value={[settings.arabicSize]}
            min={20}
            max={56}
            step={2}
            onValueChange={(v) => setSettings({ ...settings, arabicSize: v[0] })}
          />
        </div>

        <div>
          <Label className="text-xs mb-1.5 block">{bn ? 'ক্বারী' : 'Reciter (Qari)'}</Label>
          <Select
            value={String(settings.reciterId)}
            onValueChange={(v) => setSettings({ ...settings, reciterId: Number(v) })}
          >
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RECITERS.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {bn ? r.name_bn : r.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">{bn ? 'ইংরেজি অনুবাদ' : 'English translation'}</p>
            <p className="text-xs text-muted-foreground">Saheeh International</p>
          </div>
          <Switch checked={settings.showEn} onCheckedChange={(b) => setSettings({ ...settings, showEn: b })} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">{bn ? 'বাংলা অনুবাদ' : 'Bengali translation'}</p>
            <p className="text-xs text-muted-foreground">Bayaan Foundation</p>
          </div>
          <Switch checked={settings.showBn} onCheckedChange={(b) => setSettings({ ...settings, showBn: b })} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">{bn ? 'ধারাবাহিক প্লে' : 'Continuous play'}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'একটি আয়াত শেষ হলে পরেরটি স্বয়ংক্রিয়ভাবে চলবে' : 'Auto-play next ayah'}</p>
          </div>
          <Switch checked={continuous} onCheckedChange={setContinuous} />
        </div>
      </div>
    </SheetContent>
  );
};

export default QuranPage;
