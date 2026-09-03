import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { EQ_BANDS, EQ_PRESETS, type AudioEqualizer } from '@/hooks/useAudioEqualizer';

const bandLabel = (hz: number) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bn: boolean;
  eq: AudioEqualizer;
}

const EqualizerDialog = ({ open, onOpenChange, bn, eq }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            {bn ? 'ইকুয়ালাইজার' : 'Equalizer'}
          </DialogTitle>
          <DialogDescription>
            {bn
              ? 'তিলাওয়াতের কণ্ঠ, বেজ ও প্রতিধ্বনি নিজের পছন্দমতো সাজান।'
              : 'Tune the recitation voice, bass and hall reverb to your taste.'}
          </DialogDescription>
        </DialogHeader>

        {!eq.supported ? (
          <p className="text-sm text-muted-foreground">
            {bn ? 'এই ডিভাইস/ব্রাউজারে ইকুয়ালাইজার সমর্থিত নয়।' : 'Equalizer is not supported on this browser.'}
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div>
                <p className="text-sm font-semibold">{bn ? 'ইকুয়ালাইজার চালু' : 'Enable equalizer'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {bn ? 'বন্ধ রাখলে মূল তিলাওয়াত অপরিবর্তিত থাকবে' : 'When off, the original audio is untouched'}
                </p>
              </div>
              <Switch checked={eq.enabled} onCheckedChange={eq.setEnabled} aria-label={bn ? 'ইকুয়ালাইজার চালু' : 'Enable equalizer'} />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{bn ? 'প্রিসেট' : 'Presets'}</p>
              <div className="flex flex-wrap gap-2">
                {EQ_PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant={eq.preset === p.id ? 'default' : 'outline'}
                    size="sm"
                    disabled={!eq.enabled}
                    onClick={() => eq.applyPreset(p.id)}
                    className="rounded-full text-xs"
                  >
                    {bn ? p.label_bn : p.label_en}
                  </Button>
                ))}
                {eq.preset === 'custom' && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                    {bn ? 'কাস্টম' : 'Custom'}
                  </span>
                )}
              </div>
            </div>

            <div className={eq.enabled ? '' : 'opacity-50 pointer-events-none'}>
              <div className="flex items-end justify-between gap-1 sm:gap-2">
                {EQ_BANDS.map((hz, i) => (
                  <div key={hz} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {(eq.gains[i] ?? 0) > 0 ? '+' : ''}{Math.round(eq.gains[i] ?? 0)}
                    </span>
                    <Slider
                      orientation="vertical"
                      className="h-32"
                      min={-12}
                      max={12}
                      step={1}
                      value={[eq.gains[i] ?? 0]}
                      onValueChange={([v]) => eq.setBand(i, v)}
                      aria-label={`${bandLabel(hz)} Hz`}
                    />
                    <span className="text-[10px] text-muted-foreground">{bandLabel(hz)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-1">dB / Hz</p>
            </div>

            <div className={`space-y-4 ${eq.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">{bn ? 'সামগ্রিক ভলিউম (প্রি-অ্যাম্প)' : 'Pre-amp'}</span>
                  <span className="tabular-nums text-muted-foreground">{eq.preamp > 0 ? '+' : ''}{Math.round(eq.preamp)} dB</span>
                </div>
                <Slider min={-6} max={6} step={1} value={[eq.preamp]} onValueChange={([v]) => eq.setPreamp(v)} aria-label={bn ? 'প্রি-অ্যাম্প' : 'Pre-amp'} />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">{bn ? 'প্রতিধ্বনি (মসজিদ)' : 'Reverb (hall)'}</span>
                  <span className="tabular-nums text-muted-foreground">{Math.round(eq.reverb * 100)}%</span>
                </div>
                <Slider min={0} max={80} step={5} value={[Math.round(eq.reverb * 100)]} onValueChange={([v]) => eq.setReverb(v / 100)} aria-label={bn ? 'প্রতিধ্বনি' : 'Reverb'} />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-1">
              <Button variant="outline" size="sm" className="gap-2" onClick={eq.reset} disabled={!eq.enabled}>
                <RotateCcw className="w-4 h-4" />
                {bn ? 'রিসেট' : 'Reset'}
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>{bn ? 'সম্পন্ন' : 'Done'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EqualizerDialog;
