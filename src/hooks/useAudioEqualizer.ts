// Web Audio based 7-band equalizer + preamp + hall reverb for the Quran
// recitation player. The graph is built lazily (only after the first user
// gesture creates/plays an <audio> element) so browsers never block it.
//
//   source -> preamp -> band1..band7 -> [dry] ----------> destination
//                                    \-> convolver -> wet -/
//
// Audio CDNs used by the player send `access-control-allow-origin: *`, and the
// element is created with crossOrigin="anonymous", so MediaElementSource does
// not get muted by the tainted-stream rule.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const EQ_BANDS = [60, 150, 400, 1000, 2400, 6000, 12000] as const;
export type EqGains = number[]; // dB per band, same length as EQ_BANDS

export interface EqPreset {
  id: string;
  label_bn: string;
  label_en: string;
  gains: EqGains;
  preamp: number; // dB
  reverb: number; // 0..1 wet
}

export const EQ_PRESETS: EqPreset[] = [
  { id: 'flat',    label_bn: 'সাধারণ',            label_en: 'Flat',        gains: [0, 0, 0, 0, 0, 0, 0],           preamp: 0, reverb: 0 },
  { id: 'voice',   label_bn: 'কণ্ঠ স্পষ্ট',        label_en: 'Voice Clarity', gains: [-3, -2, 1, 4, 5, 3, 0],       preamp: 1, reverb: 0.05 },
  { id: 'warm',    label_bn: 'উষ্ণ ও গভীর',       label_en: 'Warm & Deep',  gains: [5, 4, 2, 0, -1, -2, -1],       preamp: 0, reverb: 0.08 },
  { id: 'masjid',  label_bn: 'মসজিদ প্রতিধ্বনি',  label_en: 'Masjid Hall',  gains: [2, 1, 0, 2, 3, 2, 1],          preamp: 0, reverb: 0.35 },
  { id: 'bright',  label_bn: 'উজ্জ্বল',            label_en: 'Bright',       gains: [-2, -1, 0, 2, 4, 6, 5],        preamp: 0, reverb: 0 },
  { id: 'phone',   label_bn: 'ছোট স্পিকার',        label_en: 'Small Speaker', gains: [-6, -3, 2, 5, 5, 2, -2],      preamp: 2, reverb: 0 },
];

const LS_KEY = 'quran:eq-v1';

interface StoredState {
  enabled: boolean;
  preset: string;
  gains: EqGains;
  preamp: number;
  reverb: number;
}

const DEFAULTS: StoredState = {
  enabled: false,
  preset: 'flat',
  gains: [0, 0, 0, 0, 0, 0, 0],
  preamp: 0,
  reverb: 0,
};

const readStored = (): StoredState => {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<StoredState>;
    return {
      enabled: !!p.enabled,
      preset: typeof p.preset === 'string' ? p.preset : 'flat',
      gains: Array.isArray(p.gains) && p.gains.length === EQ_BANDS.length ? p.gains.map(Number) : DEFAULTS.gains,
      preamp: Number.isFinite(p.preamp) ? Number(p.preamp) : 0,
      reverb: Number.isFinite(p.reverb) ? Number(p.reverb) : 0,
    };
  } catch {
    return DEFAULTS;
  }
};

/** Generates a short decaying-noise impulse response (hall-like ambience). */
const makeImpulse = (ctx: AudioContext, seconds = 2.2, decay = 2.6) => {
  const rate = ctx.sampleRate;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
};

export function useAudioEqualizer() {
  const initial = useMemo(readStored, []);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [preset, setPreset] = useState(initial.preset);
  const [gains, setGains] = useState<EqGains>(initial.gains);
  const [preamp, setPreamp] = useState(initial.preamp);
  const [reverb, setReverb] = useState(initial.reverb);
  const [supported, setSupported] = useState(true);

  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const preampRef = useRef<GainNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const dryRef = useRef<GainNode | null>(null);
  const wetRef = useRef<GainNode | null>(null);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ enabled, preset, gains, preamp, reverb }));
    } catch { /* storage disabled */ }
  }, [enabled, preset, gains, preamp, reverb]);

  /** Build the audio graph once, for the given <audio> element. */
  const attach = useCallback((el: HTMLAudioElement) => {
    if (srcRef.current || typeof window === 'undefined') return;
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) { setSupported(false); return; }
    try {
      const ctx = new AC();
      const src = ctx.createMediaElementSource(el);
      const pre = ctx.createGain();

      const filters = EQ_BANDS.map((freq, i) => {
        const f = ctx.createBiquadFilter();
        f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        f.frequency.value = freq;
        f.Q.value = 1.0;
        f.gain.value = 0;
        return f;
      });

      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const conv = ctx.createConvolver();
      conv.buffer = makeImpulse(ctx);

      src.connect(pre);
      let node: AudioNode = pre;
      filters.forEach((f) => { node.connect(f); node = f; });
      node.connect(dry);
      node.connect(conv);
      conv.connect(wet);
      dry.connect(ctx.destination);
      wet.connect(ctx.destination);

      ctxRef.current = ctx;
      srcRef.current = src;
      preampRef.current = pre;
      filtersRef.current = filters;
      dryRef.current = dry;
      wetRef.current = wet;
    } catch (err) {
      console.warn('[Quran] Equalizer unavailable:', err);
      setSupported(false);
    }
  }, []);

  // Apply parameter changes to the live graph.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const on = enabled;
    filtersRef.current.forEach((f, i) => {
      f.gain.value = on ? (gains[i] ?? 0) : 0;
    });
    if (preampRef.current) preampRef.current.gain.value = on ? Math.pow(10, preamp / 20) : 1;
    const wetAmount = on ? reverb : 0;
    if (wetRef.current) wetRef.current.gain.value = wetAmount;
    if (dryRef.current) dryRef.current.gain.value = 1 - wetAmount * 0.4;
  }, [enabled, gains, preamp, reverb]);

  const applyPreset = useCallback((id: string) => {
    const p = EQ_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(p.id);
    setGains([...p.gains]);
    setPreamp(p.preamp);
    setReverb(p.reverb);
  }, []);

  const setBand = useCallback((index: number, value: number) => {
    setPreset('custom');
    setGains((g) => g.map((v, i) => (i === index ? value : v)));
  }, []);

  const reset = useCallback(() => applyPreset('flat'), [applyPreset]);

  return {
    enabled, setEnabled,
    preset, applyPreset,
    gains, setBand,
    preamp, setPreamp: (v: number) => { setPreset('custom'); setPreamp(v); },
    reverb, setReverb: (v: number) => { setPreset('custom'); setReverb(v); },
    supported, attach, reset,
  };
}

export type AudioEqualizer = ReturnType<typeof useAudioEqualizer>;
