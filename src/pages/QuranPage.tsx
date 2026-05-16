import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { groupVersesBySurah } from '@/lib/quranSegments';
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
  ChevronLeft,
  ChevronRight,
  BookOpenText,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
const LS_LAST_READ = 'quran:lastRead'; // suffixed with user scope
const LS_LAST_MUSHAF = 'quran:lastMushafPage'; // suffixed with user scope
const LS_LAST_MUSHAF_VERSE = 'quran:lastMushafVerse'; // suffixed with user scope
const LS_SETTINGS = 'quran:settings';
const lastReadKey = (uid: string | null) => `${LS_LAST_READ}:${uid || 'anon'}`;
const lastMushafKey = (uid: string | null) => `${LS_LAST_MUSHAF}:${uid || 'anon'}`;
const lastMushafVerseKey = (uid: string | null) => `${LS_LAST_MUSHAF_VERSE}:${uid || 'anon'}`;

// Standard Madinah Mushaf: first page of each Juz (1..30)
const JUZ_FIRST_PAGE: Record<number, number> = {
  1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 121, 8: 142, 9: 162, 10: 182,
  11: 201, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
  21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582,
};

interface Settings {
  script: 'uthmani' | 'indopak';
  showEn: boolean;
  showBn: boolean;
  arabicSize: number;
  reciterId: number;
  mushafView: boolean;
  showSurahHeader: boolean;
  showContinuationBadge: boolean;
  autoSaveLastRead: boolean;
}
const defaultSettings: Settings = {
  script: 'uthmani',
  showEn: true,
  showBn: true,
  arabicSize: 32,
  reciterId: 7,
  mushafView: false,
  showSurahHeader: true,
  showContinuationBadge: true,
  autoSaveLastRead: true,
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

  // Per-user scope (Supabase auth uid when available, else anon)
  const [userId, setUserId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  // Forward ref so the restore effect (which runs before `chapters` is declared)
  // can read the latest chapters list for legacy migration.
  const chaptersRef = useRef<Chapter[]>([]);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  // Restore last read on mount / when user scope resolves. Legacy chapter/juz
  // entries are migrated to their starting Mushaf page so 'Continue reading'
  // always lands on the correct page.
  useEffect(() => {
    document.title = bn ? 'কুরআন পাঠ' : 'Quran Reading';
    if (restored) return;
    try {
      const last = JSON.parse(localStorage.getItem(lastReadKey(userId)) || 'null') as
        | { mode: 'chapter' | 'page' | 'juz'; id: number; verseKey?: string }
        | null;
      const lastMushaf = Number(localStorage.getItem(lastMushafKey(userId)) || '');
      const lastMushafVerse = localStorage.getItem(lastMushafVerseKey(userId)) || '';

      if (lastMushaf >= 1 && lastMushaf <= 604) {
        setMode('page');
        setActiveId(lastMushaf);
        if (lastMushafVerse && /^\d+:\d+$/.test(lastMushafVerse)) {
          setScrollKey(lastMushafVerse);
          toast.success(bn ? `আয়াত ${lastMushafVerse} থেকে পুনরায় শুরু` : `Resumed at verse ${lastMushafVerse}`);
        } else {
          toast.success(bn ? `পৃষ্ঠা ${lastMushaf} থেকে পুনরায় শুরু` : `Resumed from page ${lastMushaf}`);
        }
      } else if (last) {
        // Migrate legacy chapter/juz/page entry → Mushaf page.
        let targetPage: number | null = null;
        let vk: string | undefined = last.verseKey;
        if (last.mode === 'page') {
          targetPage = last.id >= 1 && last.id <= 604 ? last.id : 1;
        } else if (last.mode === 'juz') {
          targetPage = JUZ_FIRST_PAGE[last.id] || 1;
          if (!vk) vk = undefined;
        } else if (last.mode === 'chapter') {
          // Need chapters list to resolve chapter → first page.
          const chs = chaptersRef.current;
          if (chs.length === 0) return; // wait until chapters arrive
          const ch = chs.find((c) => c.id === last.id);
          targetPage = ch?.pages?.[0] || 1;
          if (!vk) vk = `${last.id}:1`;
        }
        if (targetPage) {
          setMode('page');
          setActiveId(targetPage);
          if (vk && /^\d+:\d+$/.test(vk)) setScrollKey(vk);
          // Persist migrated value so future loads skip the migration path.
          try {
            localStorage.setItem(lastMushafKey(userId), String(targetPage));
            if (vk) localStorage.setItem(lastMushafVerseKey(userId), vk);
          } catch { /* ignore */ }
          toast.success(bn ? `পৃষ্ঠা ${targetPage} থেকে পুনরায় শুরু` : `Resumed from page ${targetPage}`);
        }
      }
    } catch {/* ignore */}
    setRestored(true);
  }, [bn, userId, restored]);

  // Persist last read (skipped while auto-save is paused)
  useEffect(() => {
    if (!restored) return;
    if (!settings.autoSaveLastRead) return;
    localStorage.setItem(
      lastReadKey(userId),
      JSON.stringify({ mode, id: activeId, verseKey: scrollKey }),
    );
    if (mode === 'page') {
      localStorage.setItem(lastMushafKey(userId), String(activeId));
    }
  }, [mode, activeId, scrollKey, userId, restored, settings.autoSaveLastRead]);


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

  // Keep ref in sync so the restore effect can read chapters for legacy migration,
  // and re-run a one-shot restore once chapters arrive (if it was waiting).
  useEffect(() => {
    chaptersRef.current = chapters;
    if (restored || chapters.length === 0) return;
    // Only re-trigger if a legacy chapter entry is the saved state.
    try {
      const last = JSON.parse(localStorage.getItem(lastReadKey(userId)) || 'null');
      const lastMushaf = Number(localStorage.getItem(lastMushafKey(userId)) || '');
      if ((!lastMushaf || lastMushaf < 1) && last?.mode === 'chapter') {
        const ch = chapters.find((c) => c.id === last.id);
        const targetPage = ch?.pages?.[0] || 1;
        const vk = last.verseKey || `${last.id}:1`;
        setMode('page');
        setActiveId(targetPage);
        if (/^\d+:\d+$/.test(vk)) setScrollKey(vk);
        try {
          localStorage.setItem(lastMushafKey(userId), String(targetPage));
          localStorage.setItem(lastMushafVerseKey(userId), vk);
        } catch { /* ignore */ }
        toast.success(bn ? `পৃষ্ঠা ${targetPage} থেকে পুনরায় শুরু` : `Resumed from page ${targetPage}`);
        setRestored(true);
      }
    } catch { /* ignore */ }
  }, [chapters, restored, userId, bn]);

  // Single-ayah card view is removed — Mushaf is now the only reading mode.
  const isMushaf = true;

  // Verses (single block — used for chapter / juz / non-mushaf page view)
  const { data: verses = [], isLoading: versesLoading } = useQuery<Verse[]>({
    queryKey: ['quran-verses', mode, activeId, settings.reciterId],
    enabled: !!activeId && !isMushaf,
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

  // ===== Mushaf infinite scroll: keep many pages stacked =====
  const [mushafPages, setMushafPages] = useState<{ page: number; verses: Verse[] }[]>([]);
  const [mushafLoading, setMushafLoading] = useState(false);
  const loadingMoreRef = useRef(false);
  const pageRefsMap = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const suppressScrollSyncRef = useRef(false);

  const fetchPageVerses = useCallback(async (page: number): Promise<Verse[]> => {
    const url = new URL(`${QURAN_API}/verses/by_page/${page}`);
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
  }, [bn, settings.reciterId]);

  useEffect(() => {
    if (!isMushaf) setMushafPages([]);
  }, [isMushaf]);
  useEffect(() => {
    if (isMushaf) setMushafPages([]);
  }, [settings.reciterId, settings.script, isMushaf]);

  useEffect(() => {
    if (!isMushaf) return;
    if (mushafPages.some((p) => p.page === activeId)) return;
    setMushafLoading(true);
    fetchPageVerses(activeId)
      .then((vs) => {
        suppressScrollSyncRef.current = true;
        setMushafPages([{ page: activeId, verses: vs }]);
        setTimeout(() => { suppressScrollSyncRef.current = false; }, 800);
      })
      .finally(() => setMushafLoading(false));
  }, [isMushaf, activeId, mushafPages, fetchPageVerses]);

  const loadNextMushafPage = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const last = mushafPages[mushafPages.length - 1];
    if (!last || last.page >= 604) return;
    loadingMoreRef.current = true;
    try {
      const next = last.page + 1;
      const vs = await fetchPageVerses(next);
      setMushafPages((prev) =>
        prev.some((p) => p.page === next) ? prev : [...prev, { page: next, verses: vs }],
      );
    } finally {
      loadingMoreRef.current = false;
    }
  }, [mushafPages, fetchPageVerses]);

  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMushaf) return;
    const el = bottomSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadNextMushafPage(); },
      { rootMargin: '800px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isMushaf, loadNextMushafPage, mushafPages.length]);

  useEffect(() => {
    if (!isMushaf || mushafPages.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (suppressScrollSyncRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const p = Number((visible.target as HTMLElement).dataset.page);
        if (p && p !== activeId) setActiveId(p);
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: '-20% 0px -40% 0px' },
    );
    pageRefsMap.current.forEach((el) => { if (el) io.observe(el); });
    return () => io.disconnect();
  }, [isMushaf, mushafPages, activeId]);

  // Track most readable / centered verse inside Mushaf and persist as resume point.
  // Uses (1) IntersectionObserver to maintain a live set of on-screen verses, and
  // (2) a rAF-throttled scroll/resize sampler that picks the verse whose vertical
  // midpoint is closest to the viewport center. This stays accurate during fast
  // scrolling and re-stabilises after late-loading content (images/fonts) shifts layout.
  const [currentMushafVerse, setCurrentMushafVerse] = useState<string | null>(null);
  useEffect(() => {
    if (!isMushaf || mushafPages.length === 0) return;

    // Live set of currently-intersecting verse elements (kept fresh by IO)
    const visibleEls = new Set<HTMLElement>();
    let rafId: number | null = null;

    const pickCentered = () => {
      rafId = null;
      if (suppressScrollSyncRef.current) return;
      if (visibleEls.size === 0) return;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const viewportCenter = vh / 2;
      let bestKey: string | null = null;
      let bestScore = Infinity;
      visibleEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height === 0) return;
        // distance of verse midpoint from viewport center, normalised by verse height
        // so very tall verses (which dominate the viewport) win when truly centered
        const mid = r.top + r.height / 2;
        const dist = Math.abs(mid - viewportCenter);
        const score = dist - Math.min(r.height, vh) * 0.15;
        if (score < bestScore) {
          bestScore = score;
          bestKey = el.id.replace(/^v-/, '');
        }
      });
      if (bestKey && /^\d+:\d+$/.test(bestKey)) {
        setCurrentMushafVerse((prev) => (prev === bestKey ? prev : bestKey));
      }
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(pickCentered);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) visibleEls.add(el);
          else visibleEls.delete(el);
        }
        schedule();
      },
      // Multiple thresholds + symmetric centre band → smoother updates while scrolling
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-35% 0px -35% 0px' },
    );

    const verseEls = Array.from(document.querySelectorAll<HTMLElement>('[id^="v-"]'));
    verseEls.forEach((el) => io.observe(el));

    // rAF-throttled scroll sampler: keeps tracking accurate during fast scrolling
    // when IO callback batches lag behind.
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // Re-sample after late-loading reflows (images/fonts/Arabic shaping)
    const onLoad = () => schedule();
    window.addEventListener('load', onLoad);
    if ('fonts' in document) {
      (document as any).fonts?.ready?.then?.(schedule).catch?.(() => {});
    }

    // Initial pick once layout settles
    schedule();

    return () => {
      io.disconnect();
      visibleEls.clear();
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', onLoad);
    };
  }, [isMushaf, mushafPages]);

  // Persist resume verse (debounced via state setter cycle)
  useEffect(() => {
    if (!restored || !isMushaf || !currentMushafVerse) return;
    if (!settings.autoSaveLastRead) return;
    localStorage.setItem(lastMushafVerseKey(userId), currentMushafVerse);
  }, [currentMushafVerse, isMushaf, restored, userId, settings.autoSaveLastRead]);



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

  // Flat list of all currently-loaded Mushaf verses (in page order).
  const mushafVersesFlat = useMemo(
    () => mushafPages.flatMap((p) => p.verses),
    [mushafPages],
  );

  // Play the first audio-bearing verse of a given Mushaf page (continuous mode
  // then chains through the rest of the page and subsequent loaded pages).
  const playMushafPage = useCallback((pageNum: number) => {
    const page = mushafPages.find((p) => p.page === pageNum);
    const first = page?.verses.find((v) => v.audio?.url);
    if (!first) {
      return toast.error(bn ? 'এই পৃষ্ঠার অডিও পাওয়া যায়নি' : 'Audio not available for this page');
    }
    setScrollKey(first.verse_key);
    playUrl(`https://verses.quran.com/${first.audio!.url}`, first.verse_key);
  }, [mushafPages, playUrl, bn]);

  // Audio prefetch cache — warms HTTP cache so next verse starts instantly.
  const prefetchedUrlsRef = useRef<Set<string>>(new Set());
  const prefetchAudio = useCallback((url: string) => {
    if (!url || prefetchedUrlsRef.current.has(url)) return;
    prefetchedUrlsRef.current.add(url);
    try {
      const el = new Audio();
      el.preload = 'auto';
      el.src = url;
      // Force the browser to start downloading.
      el.load();
    } catch {
      // ignore
    }
  }, []);

  // Whenever we start playing a verse in continuous Mushaf mode, eagerly:
  //  1) prefetch the next few verses' audio
  //  2) load the next Mushaf page early if we're near the end of loaded pages
  useEffect(() => {
    if (!continuous || !playingKey || playingKey === 'surah') return;
    const source = isMushaf ? mushafVersesFlat : verses;
    const idx = source.findIndex((v) => v.verse_key === playingKey);
    if (idx < 0) return;
    // Prefetch the next 3 verses' audio.
    for (let i = 1; i <= 3; i++) {
      const v = source[idx + i];
      if (v?.audio?.url) prefetchAudio(`https://verses.quran.com/${v.audio.url}`);
    }
    // Mushaf: if within last 3 verses of the loaded set, preload the next page.
    if (isMushaf && idx >= source.length - 3) {
      const last = mushafPages[mushafPages.length - 1];
      if (last && last.page < 604) loadNextMushafPage();
    }
  }, [continuous, playingKey, isMushaf, mushafVersesFlat, verses, mushafPages, loadNextMushafPage, prefetchAudio]);

  // Continuous play next ayah (works for both chapter & Mushaf modes)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = async () => {
      setIsPlaying(false);
      if (!continuous || !playingKey || playingKey === 'surah') return;
      const source = isMushaf ? mushafVersesFlat : verses;
      const idx = source.findIndex((v) => v.verse_key === playingKey);
      if (idx < 0) return;
      // Next verse already loaded → play it.
      if (idx < source.length - 1) {
        const next = source[idx + 1];
        if (next.audio?.url) {
          setScrollKey(next.verse_key);
          playUrl(`https://verses.quran.com/${next.audio.url}`, next.verse_key);
        }
        return;
      }
      // Mushaf: at end of loaded pages — ensure next page is loaded, then continue.
      if (isMushaf) {
        const last = mushafPages[mushafPages.length - 1];
        if (last && last.page < 604) {
          await loadNextMushafPage();
          // Poll briefly for the freshly appended page to appear in state.
          const targetPage = last.page + 1;
          let tries = 0;
          const tick = () => {
            tries++;
            const page = mushafPages.find((p) => p.page === targetPage);
            // Use functional read via flatMap from latest closure isn't possible here,
            // so rely on a microtask to let React commit, then re-resolve.
            const fresh = [...mushafPages, page ? page : { page: targetPage, verses: [] }]
              .flatMap((p) => p.verses);
            const i = fresh.findIndex((v) => v.verse_key === playingKey);
            const nxt = i >= 0 ? fresh[i + 1] : undefined;
            if (nxt?.audio?.url) {
              setScrollKey(nxt.verse_key);
              playUrl(`https://verses.quran.com/${nxt.audio.url}`, nxt.verse_key);
            } else if (tries < 10) {
              setTimeout(tick, 100);
            }
          };
          setTimeout(tick, 50);
        }
      }
    };
    a.addEventListener('ended', onEnded);
    return () => a.removeEventListener('ended', onEnded);
  }, [continuous, playingKey, verses, mushafVersesFlat, isMushaf, mushafPages, loadNextMushafPage, playUrl]);

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

  // In Mushaf mode: if the saved/target verse is not in any currently-loaded
  // page, look up its page number from the Quran.com API and switch activeId
  // to that page. The existing loader effect (line ~289) will then fetch that
  // page; afterwards the scroll-to-verse effect below will run and find the el.
  useEffect(() => {
    if (!isMushaf) return;
    if (!scrollKey || !/^\d+:\d+$/.test(scrollKey)) return;
    if (mushafPages.length === 0) return; // initial page still loading
    // If verse already on screen (any loaded page), nothing to do — scroll effect handles it.
    if (document.getElementById(`v-${scrollKey}`)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${QURAN_API}/verses/by_key/${scrollKey}?fields=page_number`);
        const json = await res.json();
        const targetPage = Number(json?.verse?.page_number);
        if (cancelled || !targetPage || targetPage < 1 || targetPage > 604) return;
        if (mushafPages.some((p) => p.page === targetPage)) return; // already loaded
        // Switch active page → loader effect will fetch & render it
        setActiveId(targetPage);
      } catch {/* ignore — scroll effect will retry */}
    })();
    return () => { cancelled = true; };
  }, [isMushaf, scrollKey, mushafPages]);

  // Scroll to verse (works for both standard and mushaf renderers)
  useEffect(() => {
    if (!scrollKey) return;
    if (!isMushaf && versesLoading) return;
    if (isMushaf && mushafPages.length === 0) return;
    // Defer to next paint so newly mounted verse spans are in DOM
    const tryScroll = () => {
      const el = document.getElementById(`v-${scrollKey}`);
      if (!el) return false;
      suppressScrollSyncRef.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1800);
      setTimeout(() => { suppressScrollSyncRef.current = false; }, 1200);
      return true;
    };
    if (!tryScroll()) {
      // Retry several times — the target page may still be fetching/rendering
      let attempts = 0;
      const interval = setInterval(() => {
        attempts += 1;
        if (tryScroll() || attempts >= 20) clearInterval(interval);
      }, 250);
      return () => clearInterval(interval);
    }
  }, [scrollKey, versesLoading, verses, isMushaf, mushafPages]);


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

  // Chapter/Juz the current Mushaf page belongs to — drives sidebar highlight
  // and header sub-label so the user always sees what section they're on.
  const currentChapterId = useMemo(() => {
    if (!chapters.length) return null;
    const hit = chapters.find((c) => {
      const [start, end] = c.pages || [];
      return start && end && activeId >= start && activeId <= end;
    });
    return hit?.id ?? null;
  }, [chapters, activeId]);
  const currentJuzId = useMemo(() => {
    let j = 1;
    for (let i = 1; i <= 30; i++) {
      if ((JUZ_FIRST_PAGE[i] || 0) <= activeId) j = i;
      else break;
    }
    return j;
  }, [activeId]);
  const currentChapter = chapters.find((c) => c.id === (currentChapterId ?? activeId));
  const headerTitle = useMemo(() => {
    if (mode === 'page') {
      const ch = chapters.find((c) => c.id === currentChapterId);
      const surah = ch
        ? (bn ? ch.translated_name?.name || ch.name_simple : ch.name_simple)
        : '';
      const pageLabel = bn ? `পৃষ্ঠা ${activeId}` : `Page ${activeId}`;
      return surah ? `${pageLabel} • ${surah} • ${bn ? 'পারা' : 'Juz'} ${currentJuzId}` : pageLabel;
    }
    if (mode === 'chapter') {
      if (!currentChapter) return '';
      return bn
        ? `${currentChapter.id}. ${currentChapter.translated_name?.name || currentChapter.name_simple}`
        : `${currentChapter.id}. ${currentChapter.name_simple}`;
    }
    return bn ? `পারা ${activeId}` : `Juz ${activeId}`;
  }, [mode, activeId, currentChapter, currentChapterId, currentJuzId, chapters, bn]);


  // Goto navigation — always resolves to a Mushaf page (single-ayah view removed).
  const goto = (m: typeof mode, id: number, vk?: string) => {
    let page = id;
    if (m === 'chapter') {
      const ch = chapters.find((c) => c.id === id);
      page = ch?.pages?.[0] || 1;
      // If a specific verse was requested, prefer scrolling to it.
      if (!vk) vk = `${id}:1`;
    } else if (m === 'juz') {
      page = JUZ_FIRST_PAGE[id] || 1;
    }
    setMode('page');
    setActiveId(page);
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

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">{bn ? 'খুঁজুন' : 'Search'}</span>
                </Button>
              </DialogTrigger>
              <AyahSearchDialog bn={bn} onGo={goto} />
            </Dialog>

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
              {/* ===== Mushaf Page View ===== */}
              {isMushaf ? (
                <div>
                  <div className="flex items-center justify-between mb-4 sticky top-[68px] z-10 bg-background/70 backdrop-blur-xl rounded-xl px-2 py-2 border border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5"
                      disabled={activeId <= 1}
                      onClick={() => goto('page', Math.max(1, activeId - 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                      {bn ? 'পূর্ববর্তী' : 'Prev'}
                    </Button>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">
                        {bn ? 'পৃষ্ঠা' : 'Page'} <span className="text-primary">{activeId}</span> / 604
                      </div>
                      <Button
                        size="sm"
                        variant={playingKey && playingKey !== 'surah' ? 'default' : 'outline'}
                        className="rounded-xl gap-1.5 h-8 px-2.5"
                        title={bn ? 'এই পৃষ্ঠা থেকে অডিও চালান (অটো-কন্টিনিউ)' : 'Play this page (auto-continue)'}
                        onClick={() => {
                          if (isPlaying) {
                            audioRef.current?.pause();
                            setIsPlaying(false);
                          } else if (playingKey && playingKey !== 'surah' && audioRef.current?.src) {
                            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                          } else {
                            playMushafPage(activeId);
                          }
                        }}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span className="hidden sm:inline text-xs">
                          {bn ? 'পৃষ্ঠা' : 'Play'}
                        </span>
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1.5"
                      disabled={activeId >= 604}
                      onClick={() => goto('page', Math.min(604, activeId + 1))}
                    >
                      {bn ? 'পরবর্তী' : 'Next'}
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>

                  {mushafLoading && mushafPages.length === 0 ? (
                    <div className="flex justify-center py-20">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {mushafPages.map(({ page, verses: pageVerses }) => (
                        <div
                          key={page}
                          data-page={page}
                          ref={(el) => { pageRefsMap.current.set(page, el); }}
                          className="relative rounded-[32px] border-[6px] shadow-2xl mx-auto px-6 sm:px-12 py-10 sm:py-14"
                          style={{
                            background:
                              'radial-gradient(ellipse at center, #fdf6e3 0%, #f5ead1 75%, #ecdcb0 100%)',
                            borderColor: '#8b6f3a',
                            borderStyle: 'double',
                            maxWidth: '780px',
                          }}
                        >
                          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: '#8b6f3a' }} />
                          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: '#8b6f3a' }} />
                          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: '#8b6f3a' }} />
                          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: '#8b6f3a' }} />

                          {(() => {
                            // Shared, unit-tested helper — guarantees ONE segment
                            // (and thus one header) per surah on this page, even
                            // when verses arrive out of order.
                            const segments = groupVersesBySurah(pageVerses);
                            const arabicFont =
                              settings.script === 'indopak'
                                ? '"Noto Nastaliq Urdu", "Scheherazade New", serif'
                                : '"Amiri Quran", "Scheherazade New", "Amiri", serif';
                            return segments.map((seg, segIdx) => {
                              const ch = chapters.find((c) => c.id === seg.sid);
                              const startsHere = seg.startsAtAyah1;
                              const isContinuation = !startsHere;
                              return (
                                <div key={`${seg.sid}-${segIdx}`} className={segIdx > 0 ? 'mt-6' : ''}>
                                  {startsHere && ch && settings.showSurahHeader && (
                                    <div className="text-center mb-3">
                                      <div
                                        className="inline-flex items-center gap-3 px-6 py-2 rounded-lg border-2"
                                        style={{ borderColor: '#8b6f3a', background: 'rgba(139,111,58,0.08)' }}
                                      >
                                        <span className="text-xs font-bold tabular-nums" style={{ color: '#5a4520' }}>
                                          {seg.sid}
                                        </span>
                                        <p className="text-2xl font-bold" style={{ fontFamily: arabicFont, color: '#5a4520' }}>
                                          سورة {ch.name_arabic}
                                        </p>
                                        <span className="text-xs" style={{ color: '#5a4520' }}>
                                          {ch.verses_count} {bn ? 'আয়াত' : 'verses'}
                                        </span>
                                      </div>
                                      {seg.sid !== 1 && seg.sid !== 9 && (
                                        <p
                                          dir="rtl"
                                          className="mt-3 text-2xl"
                                          style={{ fontFamily: arabicFont, color: '#3d2f15' }}
                                        >
                                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {isContinuation && ch && settings.showContinuationBadge && (
                                    <div className="text-center mb-3">
                                      <span
                                        className="inline-block px-4 py-1 rounded-full text-xs"
                                        style={{
                                          borderWidth: 1,
                                          borderColor: '#8b6f3a',
                                          background: 'rgba(139,111,58,0.06)',
                                          color: '#5a4520',
                                          fontFamily: arabicFont,
                                        }}
                                      >
                                        {bn ? 'চলমান:' : 'Continued:'} سورة {ch.name_arabic}
                                      </span>
                                    </div>
                                  )}
                                  <p
                                    dir="rtl"
                                    lang="ar"
                                    className="text-justify"
                                    style={{
                                      fontSize: `${settings.arabicSize}px`,
                                      lineHeight: 2.4,
                                      fontFamily: arabicFont,
                                      color: '#1f1810',
                                      textAlignLast: 'center',
                                    }}
                                  >
                                    {seg.verses.map((v) => {
                                      const arabicText = settings.script === 'indopak' && v.text_indopak ? v.text_indopak : v.text_uthmani;
                                      const num = v.verse_key.split(':')[1];
                                      const isCurrent = playingKey === v.verse_key;
                                      return (
                                        <span key={v.id} id={`v-${v.verse_key}`}>
                                          <span
                                            onClick={() => playVerse(v)}
                                            className="cursor-pointer transition-colors"
                                            style={{
                                              background: isCurrent ? 'rgba(212,165,67,0.35)' : undefined,
                                              borderRadius: 6,
                                              padding: isCurrent ? '0 4px' : undefined,
                                            }}
                                          >
                                            {arabicText}
                                          </span>
                                          <span
                                            className="inline-flex items-center justify-center mx-1 text-base font-bold align-middle cursor-pointer"
                                            onClick={() => toggleBookmark(v.verse_key)}
                                            title={v.verse_key}
                                            style={{
                                              width: '1.6em',
                                              height: '1.6em',
                                              background: 'radial-gradient(circle, #d4a543 0%, #8b6f3a 100%)',
                                              color: '#fdf6e3',
                                              borderRadius: '50%',
                                              fontSize: '0.55em',
                                              boxShadow: bookmarks.includes(v.verse_key)
                                                ? '0 0 0 2px hsl(var(--primary))'
                                                : 'inset 0 0 0 1px rgba(255,255,255,0.4)',
                                            }}
                                          >
                                            {Number(num).toLocaleString('ar-EG')}
                                          </span>{' '}
                                        </span>
                                      );
                                    })}
                                  </p>
                                </div>
                              );
                            });
                          })()}

                          <div className="mt-6 pt-4 border-t border-dashed text-center text-sm" style={{ borderColor: '#8b6f3a', color: '#5a4520' }}>
                            {bn ? `পৃষ্ঠা ${page.toLocaleString('bn-BD')}` : `Page ${page}`}
                          </div>
                        </div>
                      ))}

                      {mushafPages.length > 0 && mushafPages[mushafPages.length - 1].page < 604 && (
                        <div ref={bottomSentinelRef} className="flex items-center justify-center py-6">
                          <Loader2 className="w-6 h-6 animate-spin text-primary/70" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            {bn ? 'পরবর্তী পৃষ্ঠা লোড হচ্ছে...' : 'Loading next page...'}
                          </span>
                        </div>
                      )}

                      {mushafPages.length > 0 && mushafPages[mushafPages.length - 1].page >= 604 && (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          {bn ? 'কুরআন শরীফ সম্পন্ন' : 'End of the Mushaf'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (

              <>
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
              </>
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

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">{bn ? 'মুসহাফ পৃষ্ঠা ভিউ' : 'Mushaf page view'}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'কুরআন শরীফের ছাপার মতো পৃষ্ঠা আকারে দেখুন (পৃষ্ঠা মোডে)' : 'Traditional Mushaf-style page (in Page mode)'}</p>
          </div>
          <Switch checked={settings.mushafView} onCheckedChange={(b) => setSettings({ ...settings, mushafView: b })} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">{bn ? 'সূরা হেডার দেখান' : 'Show surah header'}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'মুসহাফ পৃষ্ঠায় সূরার নাম, নম্বর ও বিসমিল্লাহ দেখান' : 'Show surah name, number & Bismillah on Mushaf page'}</p>
          </div>
          <Switch checked={settings.showSurahHeader} onCheckedChange={(b) => setSettings({ ...settings, showSurahHeader: b })} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">{bn ? "'চলমান' ব্যাজ দেখান" : "Show 'Continued' badge"}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'আগের পৃষ্ঠা থেকে চলমান সূরার জন্য ব্যাজ দেখান' : 'Show badge for surahs continuing from previous page'}</p>
          </div>
          <Switch checked={settings.showContinuationBadge} onCheckedChange={(b) => setSettings({ ...settings, showContinuationBadge: b })} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
          <div>
            <p className="text-sm font-medium">
              {bn
                ? settings.autoSaveLastRead ? 'শেষ পঠিত আয়াত স্বয়ংক্রিয়ভাবে সংরক্ষণ' : 'স্বয়ংক্রিয় সংরক্ষণ স্থগিত'
                : settings.autoSaveLastRead ? 'Auto-save last read verse' : 'Auto-save paused'}
            </p>
            <p className="text-xs text-muted-foreground">
              {bn
                ? 'বন্ধ থাকলে আপনার বর্তমান অগ্রগতি সংরক্ষিত হবে না (পরে আবার চালু করতে পারেন)'
                : "When off, your current position won't be saved (you can resume anytime)"}
            </p>
          </div>
          <Switch
            checked={settings.autoSaveLastRead}
            onCheckedChange={(b) => setSettings({ ...settings, autoSaveLastRead: b })}
          />
        </div>
      </div>
    </SheetContent>
  );
};


// ========== Ayah Search Dialog ==========
const AyahSearchDialog = ({
  bn,
  onGo,
}: {
  bn: boolean;
  onGo: (m: 'chapter' | 'page' | 'juz', id: number, vk?: string) => void;
}) => {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    { verse_key: string; text: string; translation?: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // verse_key direct match (e.g. "2:255")
  const verseKeyMatch = q.trim().match(/^(\d{1,3})\s*[:.\-/]\s*(\d{1,3})$/);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!debounced || verseKeyMatch || debounced.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = new URL(`${QURAN_API}/search`);
    url.searchParams.set('q', debounced);
    url.searchParams.set('size', '25');
    url.searchParams.set('page', '0');
    url.searchParams.set('language', bn ? 'bn' : 'en');
    fetch(url.toString())
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const list = (json.search?.results || []).map((r: { verse_key: string; text: string; translations?: { text: string }[] }) => ({
          verse_key: r.verse_key,
          text: r.text,
          translation: r.translations?.[0]?.text,
        }));
        setResults(list);
      })
      .catch(() => !cancelled && setError(bn ? 'খোঁজ ব্যর্থ হয়েছে' : 'Search failed'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [debounced, bn, verseKeyMatch]);

  const goVerseKey = (vk: string) => {
    const [s] = vk.split(':');
    onGo('chapter', Number(s), vk);
  };

  return (
    <DialogContent className="rounded-[28px] max-w-2xl">
      <DialogHeader>
        <DialogTitle>{bn ? 'আয়াত খুঁজুন' : 'Search Ayah'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={bn ? 'যেমন: 2:255, আল্লাহ, mercy...' : 'e.g. 2:255, Allah, mercy...'}
            className="pl-9 rounded-xl"
          />
        </div>

        {verseKeyMatch && (
          <button
            onClick={() => goVerseKey(`${Number(verseKeyMatch[1])}:${Number(verseKeyMatch[2])}`)}
            className="w-full text-left p-4 rounded-2xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <p className="text-xs text-muted-foreground">{bn ? 'সরাসরি যান' : 'Jump directly'}</p>
            <p className="font-mono font-bold text-primary">
              {Number(verseKeyMatch[1])}:{Number(verseKeyMatch[2])}
            </p>
          </button>
        )}

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {error && <p className="text-sm text-destructive text-center py-3">{error}</p>}

        {!verseKeyMatch && !loading && results.length > 0 && (
          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-2 pr-2">
              {results.map((r) => (
                <button
                  key={r.verse_key}
                  onClick={() => goVerseKey(r.verse_key)}
                  className="w-full text-left p-3 rounded-2xl border border-border/50 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="secondary" className="rounded-full font-mono text-xs">{r.verse_key}</Badge>
                  </div>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-right text-lg leading-loose"
                    style={{ fontFamily: '"Amiri Quran", "Scheherazade New", serif' }}
                    dangerouslySetInnerHTML={{ __html: r.text }}
                  />
                  {r.translation && (
                    <p
                      className="text-xs text-muted-foreground mt-1.5 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: r.translation }}
                    />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {!verseKeyMatch && !loading && debounced.length >= 2 && results.length === 0 && !error && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {bn ? 'কোন মিল পাওয়া যায়নি' : 'No matches found'}
          </p>
        )}

        {!debounced && (
          <p className="text-xs text-muted-foreground text-center py-3">
            {bn
              ? 'verse_key (যেমন 2:255) অথবা আরবি/অনুবাদের শব্দ লিখুন'
              : 'Type a verse_key (e.g. 2:255) or any Arabic/translation word'}
          </p>
        )}
      </div>
    </DialogContent>
  );
};

export default QuranPage;

